import { findCityAirports } from "@/core/query/airport-dictionary";
import { validateFlightQuery } from "@/core/query/query-validator";
import {
  cleanupExpiredAgentRuns,
  findAgentRun,
  getActiveAgentRuns,
  getAgentRun,
  saveAgentRun,
} from "@/core/storage/agent-repository";
import { createComparisonTask } from "@/core/task/platform-task";
import {
  AgentClientIdentity,
  AgentPublicFlight,
  AgentRun,
  AgentRunResponse,
  AgentSearchRequest,
} from "@/shared/types/agent";
import { FlightQuery, FlightResult, SupportedPlatform } from "@/shared/types/flight";
import { ComparisonTask, PlatformTaskState } from "@/shared/types/platform";
import { generateId } from "@/shared/utils/id-generator";
import { taskManager } from "./task-manager";

const ALL_PLATFORMS: SupportedPlatform[] = ["ctrip", "qunar", "fliggy", "tongcheng"];
const RUN_RETENTION_MS = 24 * 60 * 60 * 1000;
const TERMINAL_PLATFORM_STATUSES = new Set(["completed", "empty", "failed", "cancelled", "rate_limited", "page_timeout", "interrupted", "page_changed"]);

class RunCoordinator {
  private initialized = false;
  private activeRunId: string | undefined;
  private queue: string[] = [];

  constructor() {
    taskManager.subscribe((task, results) => void this.onTaskUpdate(task, results));
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await cleanupExpiredAgentRuns();
    const runs = await getActiveAgentRuns();
    const resumable = runs.filter((run) => run.status === "queued" || run.status === "running");
    this.queue = resumable.map((run) => run.id);
    this.activeRunId = undefined;
    await this.dispatchNext();
  }

  async startManual(query: FlightQuery): Promise<ComparisonTask> {
    const run = await this.createRun({ id: "manual", name: "插件手动查询" }, query, generateId("manual"), "manual");
    await this.enqueue(run);
    return createComparisonTask(query, run.id);
  }

  async startAgent(client: AgentClientIdentity, input: AgentSearchRequest): Promise<AgentRun> {
    await this.initialize();
    const requestId = input.requestId || generateId("request");
    const existing = await findAgentRun(client.id, requestId);
    if (existing) return existing;

    const query = normalizeAgentQuery(input);
    const validation = validateFlightQuery(query);
    if (!validation.valid) throw structuredError("INVALID_QUERY", validation.errors.join("；"));

    const run = await this.createRun(client, query, requestId, "agent", input.timeoutSeconds ?? 180);
    await this.enqueue(run);
    return run;
  }

  async getRunResponse(runId: string, sinceVersion?: number): Promise<AgentRunResponse> {
    await this.initialize();
    const run = await getAgentRun(runId);
    if (!run) throw structuredError("RUN_NOT_FOUND", "未找到该查询任务");
    if (new Date(run.expiresAt).getTime() < Date.now()) {
      run.status = "expired";
      run.updatedAt = new Date().toISOString();
      await saveAgentRun(run);
    }
    return toPublicRun(run, sinceVersion);
  }

  async retry(runId: string, platforms?: SupportedPlatform[]): Promise<void> {
    const run = await this.requireRun(runId);
    const targets = platforms?.length ? platforms : run.query.enabledPlatforms;
    for (const platform of targets) {
      const state = run.platformStates[platform];
      if (!state || !state.retryable) continue;
      state.status = "idle";
      state.progress = 0;
      state.message = "已请求重新提取";
      state.errorCode = undefined;
    }
    run.status = "queued";
    run.version += 1;
    run.updatedAt = new Date().toISOString();
    await saveAgentRun(run);
    await this.enqueue(run);
  }

  async resume(runId: string): Promise<void> {
    const run = await this.requireRun(runId);
    for (const platform of run.query.enabledPlatforms) {
      const state = run.platformStates[platform];
      if (state.status === "needs_user_action" || state.status === "login_required" || state.status === "captcha_required" || state.status === "sms_verification_required") {
        state.status = "idle";
        state.progress = 0;
        state.message = "用户操作已完成，等待恢复查询";
        state.errorCode = undefined;
      }
    }
    run.status = "queued";
    run.version += 1;
    run.updatedAt = new Date().toISOString();
    await saveAgentRun(run);
    await this.enqueue(run);
  }

  async cancel(runId: string): Promise<void> {
    const run = await this.requireRun(runId);
    this.queue = this.queue.filter((id) => id !== runId);
    if (this.activeRunId === runId) await taskManager.cancelComparison(runId);
    run.status = "cancelled";
    run.completedAt = new Date().toISOString();
    run.updatedAt = run.completedAt;
    run.version += 1;
    await saveAgentRun(run);
    if (this.activeRunId === runId) {
      this.activeRunId = undefined;
      await this.dispatchNext();
    }
  }

  async getStatus(): Promise<{ activeRunId?: string; queueLength: number; queuedRunIds: string[] }> {
    await this.initialize();
    return { activeRunId: this.activeRunId, queueLength: this.queue.length, queuedRunIds: [...this.queue] };
  }

  private async createRun(client: AgentClientIdentity, query: FlightQuery, requestId: string, source: AgentRun["source"], timeoutSeconds = 180): Promise<AgentRun> {
    const initialTask = createComparisonTask(query);
    const now = new Date().toISOString();
    const run: AgentRun = {
      id: initialTask.id,
      clientId: client.id,
      requestId,
      source,
      query,
      timeoutSeconds,
      status: "queued",
      version: 1,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + RUN_RETENTION_MS).toISOString(),
      platformStates: initialTask.platforms,
      results: emptyResults(),
      warnings: [],
    };
    await saveAgentRun(run);
    return run;
  }

  private async enqueue(run: AgentRun): Promise<void> {
    if (run.status === "cancelled" || run.status === "expired") return;
    if (!this.queue.includes(run.id) && this.activeRunId !== run.id) this.queue.push(run.id);
    await this.refreshQueuePositions();
    await this.dispatchNext();
  }

  private async dispatchNext(): Promise<void> {
    if (this.activeRunId) return;
    const nextId = this.queue.shift();
    if (!nextId) return;
    const run = await getAgentRun(nextId);
    if (!run || run.status === "cancelled" || run.status === "expired") return this.dispatchNext();

    this.activeRunId = run.id;
    run.status = "running";
    run.startedAt ||= new Date().toISOString();
    run.updatedAt = new Date().toISOString();
    run.queuePosition = undefined;
    run.version += 1;
    await saveAgentRun(run);
    await this.refreshQueuePositions();
    await taskManager.startComparison(run.query, run.id, run.timeoutSeconds);
  }

  private async onTaskUpdate(task: ComparisonTask, results: Record<SupportedPlatform, FlightResult[]>): Promise<void> {
    const run = await getAgentRun(task.id);
    if (!run || run.status === "cancelled" || run.status === "expired") return;
    run.platformStates = cloneStates(task.platforms);
    run.results = mergeResultMaps(run.results, results);
    run.updatedAt = new Date().toISOString();
    run.version += 1;
    const selected = run.query.enabledPlatforms.map((platform) => run.platformStates[platform]);
    const waitingUser = selected.some((state) => state.status === "needs_user_action" || state.status === "login_required" || state.status === "captcha_required" || state.status === "sms_verification_required");
    const allTerminal = selected.every((state) => TERMINAL_PLATFORM_STATUSES.has(state.status));
    const resultCount = Object.values(run.results).flat().length;

    if (waitingUser) {
      run.status = "needs_user_action";
    } else if (allTerminal) {
      const successful = selected.some((state) => state.status === "completed" || state.status === "empty");
      run.status = successful ? (selected.every((state) => state.status === "completed" || state.status === "empty") ? "completed" : "partial") : "failed";
      run.completedAt = run.updatedAt;
    } else if (resultCount > 0) {
      run.status = "running";
    }
    await saveAgentRun(run);

    if (this.activeRunId === run.id && (run.status === "needs_user_action" || run.status === "completed" || run.status === "partial" || run.status === "failed")) {
      this.activeRunId = undefined;
      await this.dispatchNext();
    }
  }

  private async refreshQueuePositions(): Promise<void> {
    await Promise.all(this.queue.map(async (id, index) => {
      const run = await getAgentRun(id);
      if (!run) return;
      run.queuePosition = index + 1;
      run.updatedAt = new Date().toISOString();
      await saveAgentRun(run);
    }));
  }

  private async requireRun(runId: string): Promise<AgentRun> {
    const run = await getAgentRun(runId);
    if (!run) throw structuredError("RUN_NOT_FOUND", "未找到该查询任务");
    return run;
  }
}

function normalizeAgentQuery(input: AgentSearchRequest): FlightQuery {
  const origin = findCityAirports(input.originCityCode || input.originCity);
  const destination = findCityAirports(input.destinationCityCode || input.destinationCity);
  if (!origin) throw structuredError("AMBIGUOUS_LOCATION", `未识别出发城市：${input.originCity}`);
  if (!destination) throw structuredError("AMBIGUOUS_LOCATION", `未识别到达城市：${input.destinationCity}`);
  const timeout = input.timeoutSeconds ?? 180;
  if (timeout < 60 || timeout > 600) throw structuredError("INVALID_QUERY", "timeoutSeconds 必须在 60 到 600 秒之间");
  return {
    tripType: input.tripType || "oneway",
    originCity: origin.cityName,
    originCityCode: input.originCityCode || origin.cityCode,
    originAirport: input.originAirport,
    originAirportCode: input.originAirportCode,
    destinationCity: destination.cityName,
    destinationCityCode: input.destinationCityCode || destination.cityCode,
    destinationAirport: input.destinationAirport,
    destinationAirportCode: input.destinationAirportCode,
    departureDate: input.departureDate,
    returnDate: input.returnDate,
    adultCount: input.adultCount ?? 1,
    childCount: input.childCount ?? 0,
    cabinClass: input.cabinClass || "economy",
    directOnly: input.directOnly ?? false,
    enabledPlatforms: input.enabledPlatforms?.length ? input.enabledPlatforms : ALL_PLATFORMS,
  };
}

function toPublicRun(run: AgentRun, sinceVersion?: number): AgentRunResponse {
  const flights = Object.values(run.results).flat().map(toPublicFlight);
  const comparablePrices = flights.flatMap((flight) => flight.totalPrice === undefined ? [] : [flight.totalPrice]).filter((price) => Number.isFinite(price));
  const displayedPrices = flights.map((flight) => flight.displayedPrice).filter((price) => Number.isFinite(price));
  const selected = run.query.enabledPlatforms.map((platform) => run.platformStates[platform]);
  const progress = selected.length ? Math.round(selected.reduce((sum, state) => sum + state.progress, 0) / selected.length) : 0;
  return {
    runId: run.id,
    status: run.status,
    version: run.version,
    changed: sinceVersion === undefined || sinceVersion !== run.version,
    isFinal: ["completed", "partial", "failed", "cancelled", "expired"].includes(run.status),
    queuePosition: run.queuePosition,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    completedAt: run.completedAt,
    freshness: Date.now() - new Date(run.updatedAt).getTime() > 60 * 60 * 1000 ? "stale" : "fresh",
    progress,
    lowestComparablePrice: comparablePrices.length ? Math.min(...comparablePrices) : undefined,
    lowestDisplayedPrice: displayedPrices.length ? Math.min(...displayedPrices) : undefined,
    platforms: Object.fromEntries(ALL_PLATFORMS.map((platform) => {
      const state = run.platformStates[platform];
      return [platform, { status: state.status, progress: state.progress, message: state.message, resultCount: state.resultCount, errorCode: state.errorCode, retryable: state.retryable, updatedAt: state.updatedAt }];
    })) as AgentRunResponse["platforms"],
    flights,
    warnings: run.warnings,
  };
}

function toPublicFlight(flight: FlightResult): AgentPublicFlight {
  return {
    id: flight.id,
    platform: flight.platform,
    marketingFlightNumber: flight.marketingFlightNumber,
    operatingFlightNumber: flight.operatingFlightNumber,
    airline: flight.airline,
    departureDate: flight.departureDate,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    arrivesNextDay: flight.arrivesNextDay,
    departureAirport: flight.departureAirport,
    departureTerminal: flight.departureTerminal,
    arrivalAirport: flight.arrivalAirport,
    arrivalTerminal: flight.arrivalTerminal,
    direct: flight.direct,
    stopInfo: flight.stopInfo,
    displayedPrice: flight.displayedPrice,
    airportConstructionFee: flight.airportConstructionFee,
    fuelSurcharge: flight.fuelSurcharge,
    taxAmount: flight.taxAmount,
    totalPrice: flight.totalPrice,
    priceDisclosure: flight.priceDisclosure,
    priceType: flight.priceType,
    isStartingPrice: flight.isStartingPrice,
    includesTax: flight.includesTax,
    currency: flight.currency,
    confidence: flight.confidence,
    collectedAt: flight.collectedAt,
    resultPageUrl: sanitizeResultUrl(flight.sourceUrl),
    warnings: flight.warnings,
  };
}

function sanitizeResultUrl(value: string): string {
  try {
    const url = new URL(value);
    const allowed = new Set(["depdate", "depDate", "date", "depCity", "arrCity", "departureCity", "arrivalCity", "searchType", "tripType"]);
    for (const key of [...url.searchParams.keys()]) if (!allowed.has(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return "";
  }
}

function emptyResults(): Record<SupportedPlatform, FlightResult[]> {
  return { ctrip: [], qunar: [], fliggy: [], tongcheng: [] };
}

function cloneStates(states: Record<SupportedPlatform, PlatformTaskState>): Record<SupportedPlatform, PlatformTaskState> {
  return Object.fromEntries(Object.entries(states).map(([platform, state]) => [platform, { ...state }])) as Record<SupportedPlatform, PlatformTaskState>;
}

function mergeResultMaps(current: Record<SupportedPlatform, FlightResult[]>, incoming: Record<SupportedPlatform, FlightResult[]>): Record<SupportedPlatform, FlightResult[]> {
  return Object.fromEntries(ALL_PLATFORMS.map((platform) => [platform, mergeFlights(current[platform] || [], incoming[platform] || [])])) as Record<SupportedPlatform, FlightResult[]>;
}

function mergeFlights(a: FlightResult[], b: FlightResult[]): FlightResult[] {
  const entries = new Map<string, FlightResult>();
  for (const flight of [...a, ...b]) entries.set(`${flight.platform}|${flight.marketingFlightNumber}|${flight.departureDate}|${flight.departureTime}|${flight.arrivalTime}|${flight.displayedPrice}`, flight);
  return [...entries.values()];
}

function structuredError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

export const runCoordinator = new RunCoordinator();
