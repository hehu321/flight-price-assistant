import { PriceWatch, PriceWatchEventType } from "@/shared/types/storage";

export const MONITOR_INTERVAL_MINUTES = 6 * 60;
export const MONITOR_DROP_ALERT_YUAN = 50;
export const MONITOR_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface MonitoringDecision {
  watch: PriceWatch;
  notification?: { type: PriceWatchEventType; message: string };
}

export function scheduleWatch(watch: PriceWatch, now = new Date()): PriceWatch {
  const interval = watch.intervalMinutes || MONITOR_INTERVAL_MINUTES;
  return { ...watch, monitorEnabled: true, intervalMinutes: interval, nextRunAt: new Date(now.getTime() + interval * 60_000).toISOString(), updatedAt: now.toISOString(), lastOutcome: "scheduled" };
}

export function deferWatch(watch: PriceWatch, now = new Date(), minutes = 15): PriceWatch {
  return { ...watch, nextRunAt: new Date(now.getTime() + minutes * 60_000).toISOString(), updatedAt: now.toISOString(), lastOutcome: "deferred" };
}

export function recordMonitoringPrice(watch: PriceWatch, lowestVerifiedPrice: number | undefined, successfulPlatforms: number, now = new Date()): MonitoringDecision {
  const base = scheduleWatch(watch, now);
  if (lowestVerifiedPrice === undefined) {
    return { watch: { ...base, lastRunAt: now.toISOString(), lastOutcome: successfulPlatforms ? "partial" : "failed", lastError: successfulPlatforms ? "本次没有已核验含税价" : "本次没有成功的平台结果" } };
  }
  const wasTargetReached = watch.targetReached === true;
  const targetCrossed = watch.targetPrice !== undefined && lowestVerifiedPrice <= watch.targetPrice && !wasTargetReached;
  const droppedEnough = watch.lastSuccessfulPrice !== undefined && watch.lastSuccessfulPrice - lowestVerifiedPrice >= MONITOR_DROP_ALERT_YUAN;
  const cooledDown = !watch.lastNotifiedAt || now.getTime() - new Date(watch.lastNotifiedAt).getTime() >= MONITOR_ALERT_COOLDOWN_MS;
  const next: PriceWatch = { ...base, lastRunAt: now.toISOString(), lastSuccessfulPrice: lowestVerifiedPrice, lastOutcome: successfulPlatforms < watch.enabledPlatforms.length ? "partial" : "completed", lastError: undefined, targetReached: watch.targetPrice === undefined ? false : lowestVerifiedPrice <= watch.targetPrice };
  if (targetCrossed) {
    return { watch: { ...next, lastNotifiedAt: now.toISOString(), lastNotifiedPrice: lowestVerifiedPrice, lastTriggeredAt: now.toISOString() }, notification: { type: "target_reached", message: `最低含税价 ¥${lowestVerifiedPrice} 已达到目标价` } };
  }
  if (droppedEnough && cooledDown) {
    const drop = watch.lastSuccessfulPrice! - lowestVerifiedPrice;
    return { watch: { ...next, lastNotifiedAt: now.toISOString(), lastNotifiedPrice: lowestVerifiedPrice, lastTriggeredAt: now.toISOString() }, notification: { type: "price_drop", message: `最低含税价降了 ¥${drop}，当前 ¥${lowestVerifiedPrice}` } };
  }
  return { watch: next };
}
