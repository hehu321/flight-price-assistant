import { DiagnosticRecord } from "@/shared/types/diagnostic";
import { getDB } from "./indexed-db";

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function saveDiagnostic(record: DiagnosticRecord): Promise<void> {
  const db = await getDB();
  await db.put("diagnostics", record);
  await cleanExpiredDiagnostics();
}

export async function getDiagnostics(): Promise<DiagnosticRecord[]> {
  const db = await getDB();
  return (await db.getAll("diagnostics")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function clearDiagnostics(): Promise<void> {
  const db = await getDB();
  await db.clear("diagnostics");
}

export async function cleanExpiredDiagnostics(now = Date.now()): Promise<void> {
  const db = await getDB();
  const cutoff = new Date(now - RETENTION_MS).toISOString();
  const records = await db.getAll("diagnostics");
  const tx = db.transaction("diagnostics", "readwrite");
  for (const record of records) if (record.createdAt < cutoff) await tx.store.delete(record.id);
  await tx.done;
}
