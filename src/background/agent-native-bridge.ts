import { getAllAgentClients, getAgentClient, saveAgentClient } from "@/core/storage/agent-repository";
import { AgentClient, AgentClientIdentity, NativeBridgeRequest, NativeBridgeResponse } from "@/shared/types/agent";
import { SupportedPlatform } from "@/shared/types/flight";
import { logger } from "@/shared/logger/logger";
import { runCoordinator } from "./run-coordinator";

const NATIVE_HOST_NAME = "com.flight_price_assistant.agent_bridge";

class AgentNativeBridge {
  private port: chrome.runtime.Port | undefined;
  private reconnectTimer: number | undefined;
  private reconnectAttempt = 0;
  private lastError: string | undefined;

  start(): void {
    if (typeof chrome === "undefined" || !chrome.runtime?.connectNative) return;
    void runCoordinator.initialize();
    this.connect();
  }

  async getStatus(): Promise<Record<string, unknown>> {
    const queue = await runCoordinator.getStatus();
    const clients = await getAllAgentClients();
    return {
      connected: Boolean(this.port),
      hostName: NATIVE_HOST_NAME,
      lastError: this.lastError,
      queue,
      clients,
    };
  }

  async updateClientStatus(clientId: string, status: AgentClient["status"]): Promise<AgentClient | undefined> {
    const client = await getAgentClient(clientId);
    if (!client) return undefined;
    client.status = status;
    client.updatedAt = new Date().toISOString();
    await saveAgentClient(client);
    if (status === "approved") this.clearPendingBadge();
    return client;
  }

  private connect(): void {
    if (this.port) return;
    try {
      const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
      this.port = port;
      this.reconnectAttempt = 0;
      this.lastError = undefined;
      port.onMessage.addListener((message) => void this.handleIncoming(message));
      port.onDisconnect.addListener(() => {
        this.port = undefined;
        this.lastError = chrome.runtime.lastError?.message || "Native Host 已断开";
        this.scheduleReconnect();
      });
      logger.info("AI Agent Native Host 已连接");
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Native Host 连接失败";
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== undefined) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt++);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay) as unknown as number;
  }

  private async handleIncoming(raw: unknown): Promise<void> {
    const request = raw as Partial<NativeBridgeRequest>;
    if (request.type !== "request" || request.protocolVersion !== 1 || !request.id || !request.method || !isClientIdentity(request.client)) {
      this.respond({ protocolVersion: 1, id: typeof request.id === "string" ? request.id : "unknown", type: "response", ok: false, error: { code: "INVALID_REQUEST", message: "Native 请求格式不正确" } });
      return;
    }

    const client = await this.ensureClient(request.client);
    if (request.method !== "get_flight_agent_status" && client.status !== "approved") {
      this.markPendingBadge();
      this.respond({
        protocolVersion: 1,
        id: request.id,
        type: "response",
        ok: false,
        error: { code: "AUTHORIZATION_REQUIRED", message: "请在机票比价助手的“设置与偏好”中允许该 AI Agent", retryable: true, details: { clientId: client.id, status: client.status } },
      });
      return;
    }

    try {
      const result = await this.dispatch(request as NativeBridgeRequest);
      this.respond({ protocolVersion: 1, id: request.id, type: "response", ok: true, result });
    } catch (error) {
      const typed = error as Error & { code?: string };
      this.respond({
        protocolVersion: 1,
        id: request.id,
        type: "response",
        ok: false,
        error: { code: typed.code || "UNKNOWN_ERROR", message: typed.message || "处理 AI Agent 请求失败", retryable: typed.code === "RUN_NOT_FOUND" ? false : true },
      });
    }
  }

  private async dispatch(request: NativeBridgeRequest): Promise<unknown> {
    const params = request.params || {};
    switch (request.method) {
      case "get_flight_agent_status":
        return { ...(await this.getStatus()), client: await getAgentClient(request.client.id) };
      case "search_flights": {
        const run = await runCoordinator.startAgent(request.client, params as any);
        return { runId: run.id, status: run.status, queuePosition: run.queuePosition, createdAt: run.createdAt, version: run.version };
      }
      case "get_flight_search_result":
        return runCoordinator.getRunResponse(String(params.runId || ""), typeof params.sinceVersion === "number" ? params.sinceVersion : undefined);
      case "retry_flight_platform":
        await runCoordinator.retry(String(params.runId || ""), normalizePlatforms(params.platforms));
        return { accepted: true };
      case "resume_flight_search":
        await runCoordinator.resume(String(params.runId || ""));
        return { accepted: true };
      case "cancel_flight_search":
        await runCoordinator.cancel(String(params.runId || ""));
        return { accepted: true };
    }
  }

  private async ensureClient(identity: AgentClientIdentity): Promise<AgentClient> {
    const existing = await getAgentClient(identity.id);
    if (existing) {
      existing.name = identity.name;
      existing.version = identity.version;
      existing.updatedAt = new Date().toISOString();
      await saveAgentClient(existing);
      return existing;
    }
    const now = new Date().toISOString();
    const client: AgentClient = { id: identity.id, name: identity.name, version: identity.version, status: "pending", firstRequestedAt: now, updatedAt: now };
    await saveAgentClient(client);
    return client;
  }

  private respond(response: NativeBridgeResponse): void {
    try {
      this.port?.postMessage(response);
    } catch (error) {
      logger.warn("向 Native Host 返回请求失败", error);
    }
  }

  private markPendingBadge(): void {
    chrome.action?.setBadgeText({ text: "!" }).catch(() => {});
    chrome.action?.setBadgeBackgroundColor({ color: "#ef4444" }).catch(() => {});
  }

  private clearPendingBadge(): void {
    chrome.action?.setBadgeText({ text: "" }).catch(() => {});
  }
}

function isClientIdentity(value: unknown): value is AgentClientIdentity {
  const client = value as AgentClientIdentity | undefined;
  return Boolean(client && typeof client.id === "string" && client.id && typeof client.name === "string" && client.name);
}

function normalizePlatforms(value: unknown): SupportedPlatform[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed: SupportedPlatform[] = ["ctrip", "qunar", "fliggy", "tongcheng"];
  return value.filter((platform): platform is SupportedPlatform => typeof platform === "string" && allowed.includes(platform as SupportedPlatform));
}

export const agentNativeBridge = new AgentNativeBridge();
