import { PriceWatch } from "@/shared/types/storage";
import { getDB } from "./indexed-db";

export async function getAllPriceWatches(): Promise<PriceWatch[]> {
  const db = await getDB();
  return db.getAll("priceWatches");
}

export async function savePriceWatch(watch: PriceWatch): Promise<void> {
  const db = await getDB();
  await db.put("priceWatches", watch);
}

export async function deletePriceWatch(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("priceWatches", id);
}

export async function clearAllPriceWatches(): Promise<void> {
  const db = await getDB();
  await db.clear("priceWatches");
}

export async function markReachedWatches(journeyKey: string, currentLowest: number | undefined): Promise<void> {
  if (currentLowest === undefined) return;
  const db = await getDB();
  const watches = await db.getAllFromIndex("priceWatches", "by_journeyKey", journeyKey);
  const now = new Date().toISOString();
  const tx = db.transaction("priceWatches", "readwrite");
  for (const watch of watches) {
    if (currentLowest <= watch.targetPrice) {
      await tx.store.put({ ...watch, updatedAt: now, lastTriggeredAt: now });
    }
  }
  await tx.done;
}
