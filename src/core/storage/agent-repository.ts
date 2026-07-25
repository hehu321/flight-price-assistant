import { AgentClient, AgentRun } from "@/shared/types/agent";
import { getDB } from "./indexed-db";

const RUN_RETENTION_MS = 24 * 60 * 60 * 1000;

export async function saveAgentRun(run: AgentRun): Promise<void> {
  const db = await getDB();
  await db.put("agentRuns", run);
}

export async function getAgentRun(id: string): Promise<AgentRun | undefined> {
  const db = await getDB();
  return db.get("agentRuns", id);
}

export async function findAgentRun(clientId: string, requestId: string): Promise<AgentRun | undefined> {
  const db = await getDB();
  const runs = await db.getAllFromIndex("agentRuns", "by_client_request", [clientId, requestId]);
  return runs[0];
}

export async function getActiveAgentRuns(): Promise<AgentRun[]> {
  const db = await getDB();
  const runs = await db.getAll("agentRuns");
  return runs.filter((run) => !isExpired(run)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function cleanupExpiredAgentRuns(): Promise<void> {
  const db = await getDB();
  const runs = await db.getAll("agentRuns");
  await Promise.all(runs.filter(isExpired).map((run) => db.delete("agentRuns", run.id)));
}

export async function saveAgentClient(client: AgentClient): Promise<void> {
  const db = await getDB();
  await db.put("agentClients", client);
}

export async function getAgentClient(id: string): Promise<AgentClient | undefined> {
  const db = await getDB();
  return db.get("agentClients", id);
}

export async function getAllAgentClients(): Promise<AgentClient[]> {
  const db = await getDB();
  return (await db.getAll("agentClients")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function isExpired(run: AgentRun): boolean {
  return new Date(run.expiresAt).getTime() < Date.now() || new Date(run.createdAt).getTime() + RUN_RETENTION_MS < Date.now();
}
