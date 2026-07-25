import { QuerySnapshot } from "@/shared/types/storage";
import { getDB } from "./indexed-db";

export async function saveQuerySnapshot(snapshot: QuerySnapshot): Promise<void> {
  const db = await getDB();
  await db.put("querySnapshots", snapshot);
}

export async function getAllQuerySnapshots(): Promise<QuerySnapshot[]> {
  const db = await getDB();
  const snapshots = await db.getAll("querySnapshots");
  return snapshots.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteQuerySnapshot(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("querySnapshots", id);
}

export async function clearAllQuerySnapshots(): Promise<void> {
  const db = await getDB();
  await db.clear("querySnapshots");
}

export async function cleanOldQuerySnapshots(retentionDays: number = 30): Promise<number> {
  const db = await getDB();
  const all = await db.getAll("querySnapshots");
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const tx = db.transaction("querySnapshots", "readwrite");
  let deletedCount = 0;
  for (const snapshot of all) {
    if (snapshot.updatedAt < cutoff) {
      await tx.store.delete(snapshot.id);
      deletedCount++;
    }
  }
  await tx.done;
  return deletedCount;
}
