import { PriceWatch, PriceWatchEvent } from "@/shared/types/storage";
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

export async function getDuePriceWatches(now = new Date().toISOString()): Promise<PriceWatch[]> {
  const watches = await getAllPriceWatches();
  return watches.filter((watch) => watch.monitorEnabled === true && (!watch.nextRunAt || watch.nextRunAt <= now));
}

export async function savePriceWatchEvent(event: PriceWatchEvent): Promise<void> {
  const db = await getDB();
  await db.put("priceWatchEvents", event);
}

export async function getPriceWatchEvents(watchId?: string): Promise<PriceWatchEvent[]> {
  const db = await getDB();
  const events = watchId ? await db.getAllFromIndex("priceWatchEvents", "by_watchId", watchId) : await db.getAll("priceWatchEvents");
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function clearAllPriceWatchEvents(): Promise<void> {
  const db = await getDB();
  await db.clear("priceWatchEvents");
}

export async function markReachedWatches(journeyKey: string, currentLowest: number | undefined): Promise<void> {
  if (currentLowest === undefined) return;
  const db = await getDB();
  const watches = await db.getAllFromIndex("priceWatches", "by_journeyKey", journeyKey);
  const now = new Date().toISOString();
  const tx = db.transaction("priceWatches", "readwrite");
  for (const watch of watches) {
    if (watch.targetPrice !== undefined && currentLowest <= watch.targetPrice) {
      await tx.store.put({ ...watch, updatedAt: now, lastTriggeredAt: now });
    }
  }
  await tx.done;
}
