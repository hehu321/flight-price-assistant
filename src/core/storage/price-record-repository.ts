import { getDB } from "./indexed-db";
import { LocalPriceRecord } from "@/shared/types/storage";

export async function addPriceRecord(record: LocalPriceRecord): Promise<void> {
  const db = await getDB();
  await db.put("priceRecords", record);
}

export async function addPriceRecordsBatch(records: LocalPriceRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("priceRecords", "readwrite");
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

/** A retry replaces this task/platform's observation instead of creating duplicate history rows. */
export async function replacePriceRecordsForTaskPlatform(
  taskId: string,
  platform: LocalPriceRecord["platform"],
  records: LocalPriceRecord[]
): Promise<void> {
  const db = await getDB();
  const existing = await db.getAll("priceRecords");
  const tx = db.transaction("priceRecords", "readwrite");
  for (const record of existing) {
    if (record.taskId === taskId && record.platform === platform) await tx.store.delete(record.id);
  }
  for (const record of records) await tx.store.put(record);
  await tx.done;
}

export async function getAllPriceRecords(): Promise<LocalPriceRecord[]> {
  const db = await getDB();
  return db.getAll("priceRecords");
}

export async function getPriceRecordsByRoute(
  originCityCode: string,
  destinationCityCode: string
): Promise<LocalPriceRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("priceRecords", "by_route", [originCityCode, destinationCityCode]);
}

export async function deletePriceRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("priceRecords", id);
}

export async function clearAllPriceRecords(): Promise<void> {
  const db = await getDB();
  await db.clear("priceRecords");
}

export async function cleanOldPriceRecords(retentionDays: number = 30): Promise<number> {
  const db = await getDB();
  const all = await db.getAll("priceRecords");
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  let deletedCount = 0;

  const tx = db.transaction("priceRecords", "readwrite");
  for (const record of all) {
    if (record.collectedAt < cutoff) {
      await tx.store.delete(record.id);
      deletedCount++;
    }
  }
  await tx.done;
  return deletedCount;
}
