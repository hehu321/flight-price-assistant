import { deferWatch, recordMonitoringPrice } from "@/core/monitor/price-monitor";
import { getAllPriceWatches, getDuePriceWatches, savePriceWatch, savePriceWatchEvent } from "@/core/storage/price-watch-repository";
import { getAgentRun } from "@/core/storage/agent-repository";
import { PriceWatch, PriceWatchEventType } from "@/shared/types/storage";
import { ComparisonTask } from "@/shared/types/platform";
import { FlightResult, RoundTripPackageResult, SupportedPlatform } from "@/shared/types/flight";
import { generateId } from "@/shared/utils/id-generator";
import { runCoordinator } from "./run-coordinator";

const ALARM_NAME = "flight-price-monitor";
const IDLE_SECONDS = 10 * 60;
const BLOCKED_NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BLOCKED_STATUSES = new Set(["needs_user_action", "login_required", "captcha_required", "sms_verification_required", "rate_limited", "page_changed"]);

/**
 * Keeps scheduled monitoring strictly local to Chrome. It deliberately does
 * not bypass login/captcha, and never runs while the person is using Chrome.
 */
class PriceMonitorCoordinator {
  private initialized = false;
  private finalizing = new Set<string>();

  async initialize(): Promise<void> {
    if (this.initialized || typeof chrome === "undefined") return;
    this.initialized = true;
    await this.disableLegacyRoundTripWatches();
    await this.ensureAlarm();
    chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM_NAME) void this.poll(); });
    chrome.idle.onStateChanged.addListener((state) => { if (state === "active") void this.interruptForActivity(); });
    // A service worker restart loses listeners and in-memory active task state;
    // recreating this recurring alarm makes the next due run recover naturally.
    void this.poll();
  }

  private async disableLegacyRoundTripWatches(): Promise<void> {
    const watches = await getAllPriceWatches();
    await Promise.all(watches.filter((watch) => watch.query?.tripType === "roundtrip" && watch.priceScope !== "roundtrip_package" && watch.monitorEnabled)
      .map((watch) => savePriceWatch({ ...watch, monitorEnabled: false, nextRunAt: undefined, lastOutcome: "blocked", lastError: "旧版往返关注未绑定原生套餐总价，已停止自动监控；请重新比价后重新开启" , updatedAt: new Date().toISOString() })));
  }

  async poll(): Promise<void> {
    const due = await getDuePriceWatches();
    if (!due.length) return;
    const status = await runCoordinator.getStatus();
    if (status.activeRunId || status.queueLength) return;
    const idleState = await new Promise<chrome.idle.IdleState>((resolve) => chrome.idle.queryState(IDLE_SECONDS, resolve));
    if (idleState !== "idle") {
      await Promise.all(due.map((watch) => savePriceWatch(deferWatch(watch))));
      return;
    }
    await runCoordinator.startMonitor(due[0]);
  }

  async handleTaskUpdate(task: ComparisonTask, results: Record<SupportedPlatform, FlightResult[]>): Promise<void> {
    const run = await getAgentRun(task.id);
    if (!run || run.source !== "monitor" || !run.monitorWatchId || this.finalizing.has(task.id)) return;
    const states = run.query.enabledPlatforms.map((platform) => task.platforms[platform]);
    const packageStates = run.query.tripType === "roundtrip" ? Object.values(task.roundTripPackageStates || {}) : [];
    const terminal = states.every((state) => isTerminal(state.status))
      && packageStates.every((state) => isTerminal(state.status));
    if (!terminal) return;
    this.finalizing.add(task.id);
    try {
      const watch = (await getAllPriceWatches()).find((item) => item.id === run.monitorWatchId);
      if (!watch || !watch.monitorEnabled) return;
      if (run.status === "cancelled") {
        await savePriceWatch(deferWatch(watch));
        return;
      }
      const successful = states.filter((state) => state.status === "completed" || state.status === "empty").length;
      const blocked = [...states, ...packageStates].find((state) => BLOCKED_STATUSES.has(state.status));
      if (blocked) {
        await this.recordBlocked(watch, blocked.message || "平台需要用户处理");
        return;
      }
      // A return journey is monitored only when a platform disclosed a real
      // package total. Split-leg prices are useful reference data, never a
      // substitute for a package monitoring baseline.
      const price = task.query.tripType === "roundtrip"
        ? lowestNativePackagePrice(task.roundTripPackages || {})
        : lowestVerifiedPrice(results);
      const decision = recordMonitoringPrice(watch, price, successful);
      await savePriceWatch(decision.watch);
      if (decision.notification) await this.notify(watch, decision.notification.type, decision.notification.message, price, successful);
    } finally {
      this.finalizing.delete(task.id);
      void this.poll();
    }
  }

  private async interruptForActivity(): Promise<void> {
    const run = await runCoordinator.cancelActiveMonitor();
    if (!run?.monitorWatchId) return;
    const watch = (await getAllPriceWatches()).find((item) => item.id === run.monitorWatchId);
    if (watch) await savePriceWatch(deferWatch(watch));
  }

  private async recordBlocked(watch: PriceWatch, message: string): Promise<void> {
    const now = new Date();
    const next = { ...deferWatch(watch, now, 6 * 60), lastRunAt: now.toISOString(), lastOutcome: "blocked" as const, lastError: message };
    await savePriceWatch(next);
    if (!watch.lastNotifiedAt || now.getTime() - new Date(watch.lastNotifiedAt).getTime() >= BLOCKED_NOTIFICATION_COOLDOWN_MS) {
      next.lastNotifiedAt = now.toISOString();
      await savePriceWatch(next);
      await this.notify(watch, "blocked", message, undefined, 0);
    }
  }

  private async ensureAlarm(): Promise<void> {
    const alarm = await chrome.alarms.get(ALARM_NAME);
    if (!alarm) chrome.alarms.create(ALARM_NAME, { periodInMinutes: 30 });
  }

  private async notify(watch: PriceWatch, type: PriceWatchEventType, message: string, price?: number, platformCount?: number): Promise<void> {
    const route = `${watch.originCity} → ${watch.destinationCity} · ${watch.departureDate}`;
    await savePriceWatchEvent({ id: generateId("watch-event"), watchId: watch.id, journeyKey: watch.journeyKey, type, message, price, platformCount, createdAt: new Date().toISOString() });
    const title = type === "blocked" ? "机票监控需要处理" : "机票价格提醒";
    chrome.notifications.create(`flight-watch-${Date.now()}`, {
      type: "basic", iconUrl: "public/icon.png", title,
      message: `${route}\n${message}`,
      priority: 1,
    });
  }
}

function isTerminal(status: string): boolean {
  return ["completed", "empty", "failed", "cancelled", "rate_limited", "page_timeout", "interrupted", "needs_user_action", "page_changed"].includes(status);
}

function lowestVerifiedPrice(results: Record<SupportedPlatform, FlightResult[]>): number | undefined {
  const prices = Object.values(results).flat().flatMap((flight) => Number.isFinite(flight.totalPrice) ? [flight.totalPrice!] : []);
  return prices.length ? Math.min(...prices) : undefined;
}

function lowestNativePackagePrice(packages: Partial<Record<SupportedPlatform, RoundTripPackageResult[]>>): number | undefined {
  const prices = Object.values(packages).flat().map((item) => item.displayedTotalPrice)
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : undefined;
}

export const priceMonitorCoordinator = new PriceMonitorCoordinator();
