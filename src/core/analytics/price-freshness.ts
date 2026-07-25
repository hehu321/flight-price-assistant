export type PriceFreshness = "fresh" | "recent" | "historical" | "stale";

export interface PriceFreshnessInfo {
  level: PriceFreshness;
  label: string;
  isCurrentReference: boolean;
}

export function getPriceFreshness(collectedAt: string, now = Date.now()): PriceFreshnessInfo {
  const elapsedMinutes = Math.max(0, Math.floor((now - new Date(collectedAt).getTime()) / 60000));
  if (elapsedMinutes < 10) return { level: "fresh", label: "刚刚查询", isCurrentReference: true };
  if (elapsedMinutes < 60) return { level: "recent", label: `${elapsedMinutes} 分钟前查询`, isCurrentReference: true };
  if (elapsedMinutes < 24 * 60) return { level: "historical", label: `${Math.floor(elapsedMinutes / 60)} 小时前查询`, isCurrentReference: false };
  return { level: "stale", label: "已过期历史价", isCurrentReference: false };
}
