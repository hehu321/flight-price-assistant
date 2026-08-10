import { FlightLeg, FlightQuery, FlightResult, RoundTripPackageResult, SupportedPlatform } from "@/shared/types/flight";
import { BookingActionResult, BookingProgressPayload } from "@/shared/types/message";
import { ComparisonTask, PlatformTaskState, PlatformTaskStatus } from "@/shared/types/platform";
import { createComparisonTask } from "@/core/task/platform-task";
import { canTransition } from "@/core/task/task-state-machine";
import { isTaskInProgress } from "@/core/task/task-progress";
import { platformConfigs } from "@/shared/constants/platforms";
import { tabManager } from "./tab-manager";
import { adapterRegistry } from "@/adapters/base/adapter-registry";
import { registerAllAdapters } from "@/adapters";
import {
  getCurrentTask,
  getCurrentTaskResults,
  saveCurrentTask,
  saveCurrentTaskResults,
} from "@/core/storage/task-repository";
import { cleanOldPriceRecords, replacePriceRecordsForTaskPlatform } from "@/core/storage/price-record-repository";
import { logger } from "@/shared/logger/logger";
import { generateId } from "@/shared/utils/id-generator";
import { cleanOldQuerySnapshots, saveQuerySnapshot } from "@/core/storage/query-snapshot-repository";
import { buildJourneyKey } from "@/core/analytics/journey-key";
import { QuerySnapshot } from "@/shared/types/storage";
import { markReachedWatches } from "@/core/storage/price-watch-repository";
import { snapshotLowest } from "@/core/analytics/history-analysis";
import { buildRoundTripLegQueries, getRoundTripPlatformPlan } from "@/core/query/roundtrip-plan";

registerAllAdapters();

const KEEP_PLATFORM_TABS_KEY = "keep_platform_tabs";
const KEEP_PLATFORM_TABS_PREFERENCE_VERSION_KEY = "keep_platform_tabs_preference_version";
const KEEP_PLATFORM_TABS_PREFERENCE_VERSION = 2;
const HISTORY_RETENTION_DAYS_KEY = "history_retention_days";

class TaskManager {
  private activeTask: ComparisonTask | null = null;
  private collectedResults: Map<string, Map<SupportedPlatform, FlightResult[]>> = new Map();
  private bookingNavigationUntil: Map<number, number> = new Map();
  private ctripForegroundSessions: Map<string, { ctripTabId: number; previousTabId?: number }> = new Map();
  private observers = new Set<(task: ComparisonTask, results: Record<SupportedPlatform, FlightResult[]>) => void>();
  private cancelledTaskIds = new Set<string>();
  private taskTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private monitorTaskIds = new Set<string>();
  private roundTripQueries = new Map<string, Record<FlightLeg, FlightQuery>>();
  private completedRoundTripLegs = new Map<string, Map<SupportedPlatform, Set<FlightLeg>>>();
  private tabCleanupTasks = new Set<string>();
  /** Native package collection is optional. Once it fails, complete this run
   * with the proven two-leg flow instead of leaving Ctrip with zero results. */
  private nativeRoundTripFallbacks = new Set<string>();

  async startComparison(query: FlightQuery, taskId?: string, timeoutSeconds = 180, options?: { monitoring?: boolean }): Promise<ComparisonTask> {
    const task = createComparisonTask(query, taskId);
    this.nativeRoundTripFallbacks.delete(this.nativeFallbackKey(task.id, "ctrip"));
    if (query.tripType === "roundtrip") task.roundTripPackages = {};
    this.cancelledTaskIds.delete(task.id);
    if (options?.monitoring) this.monitorTaskIds.add(task.id);
    else this.monitorTaskIds.delete(task.id);
    this.activeTask = task;
    this.collectedResults.set(task.id, new Map());
    await saveCurrentTask(task);
    await saveCurrentTaskResults({ ctrip: [], qunar: [], fliggy: [], tongcheng: [] });
    await saveQuerySnapshot(this.toQuerySnapshot(task.id));
    this.scheduleTaskTimeout(task.id, timeoutSeconds);

    logger.info(`启动一键比价任务 ${task.id}`);

    const roundTripLegs = query.tripType === "roundtrip" ? buildRoundTripLegQueries(query) : [];
    if (roundTripLegs.length === 2) {
      this.roundTripQueries.set(task.id, Object.fromEntries(roundTripLegs.map(({ leg, query: legQuery }) => [leg, legQuery])) as Record<FlightLeg, FlightQuery>);
      this.completedRoundTripLegs.set(task.id, new Map());
    }
    // Round trips intentionally start with the outbound leg. The return leg
    // is opened only after that platform has a terminal outbound result so a
    // foreground Ctrip session never competes with itself.
    for (const platformId of query.enabledPlatforms) {
      const config = platformConfigs.find((p) => p.id === platformId);
      const delayMs = config ? config.openDelayMs : 0;

      setTimeout(() => {
        const useNativeRoundTrip = query.tripType === "roundtrip" && getRoundTripPlatformPlan(platformId).nativeAvailability === "verified";
        this.runPlatformTask(task.id, platformId, useNativeRoundTrip ? query : (roundTripLegs[0]?.query || query), useNativeRoundTrip ? undefined : roundTripLegs[0]?.leg);
      }, delayMs);
    }

    return task;
  }

  private async runPlatformTask(taskId: string, platform: SupportedPlatform, query: FlightQuery, leg?: FlightLeg) {
    if (!this.activeTask || this.activeTask.id !== taskId || this.cancelledTaskIds.has(taskId)) return;

    this.updatePlatformStatus(taskId, platform, "creating_tab", 10, "正在建立平台标签页");

    const adapter = adapterRegistry.getAdapter(platform);
    if (!adapter) {
      this.failPlatform(taskId, platform, { code: "ADAPTER_MISSING", message: "缺失平台适配器", retryable: false }, leg);
      return;
    }

    const searchUrl = adapter.buildSearchUrl(query);
    if (!searchUrl) {
      this.failPlatform(taskId, platform, { code: "SEARCH_URL_UNAVAILABLE", message: "生成搜索链接失败", retryable: false }, leg);
      return;
    }

    try {
      const previousTabId = platform === "ctrip" ? await this.getActiveTabId() : undefined;
      const tabId = await tabManager.openPlatformTab(taskId, platform, searchUrl, { active: platform === "ctrip", leg });
      if (platform === "ctrip") {
        this.ctripForegroundSessions.set(taskId, { ctripTabId: tabId, previousTabId });
        this.updatePlatformStatus(taskId, platform, "loading", 30, "携程正在前台加载完整航班列表，完成后将自动返回");
      } else {
        this.updatePlatformStatus(taskId, platform, "loading", 30, "页面加载中");
      }

      // 通知或自动在 Content Script 中运行提取流程
      // (若在模拟模式或原生注入下)
    } catch (err) {
      logger.error(`平台 ${platform} 任务失败:`, err);
      this.failPlatform(taskId, platform, { code: "TAB_OPEN_FAILED", message: "无法打开查询页面", retryable: true }, leg);
    }
  }

  updatePlatformStatus(
    taskId: string,
    platform: SupportedPlatform,
    status: PlatformTaskStatus,
    progress: number,
    message: string
  ) {
    if (!this.activeTask || this.activeTask.id !== taskId) return;

    const currentPlatformState = this.activeTask.platforms[platform];
    if (!canTransition(currentPlatformState.status, status)) {
      logger.warn(`非法状态转换: ${currentPlatformState.status} -> ${status}`);
    }

    currentPlatformState.status = status;
    currentPlatformState.progress = progress;
    currentPlatformState.message = message;
    currentPlatformState.updatedAt = new Date().toISOString();
    this.activeTask.updatedAt = currentPlatformState.updatedAt;

    saveCurrentTask(this.activeTask);
    void saveQuerySnapshot(this.toQuerySnapshot(taskId));
    if (this.activeTask.query.enabledPlatforms.every((id) => isTaskTerminalStatus(this.activeTask!.platforms[id].status))) {
      this.clearTaskTimeout(taskId);
      void this.finalizeTaskTabsIfEligible(taskId);
    }
    this.broadcastTaskState(taskId, platform, currentPlatformState);
    this.notifyObservers();
  }

  async savePlatformResults(taskId: string, platform: SupportedPlatform, results: FlightResult[], leg?: FlightLeg) {
    if (!await this.ensureActiveTask(taskId)) return;
    if (!this.collectedResults.has(taskId)) {
      this.collectedResults.set(taskId, new Map());
    }
    const effectiveLeg = leg || results[0]?.leg;
    const tagged = tagRoundTripLeg(results, effectiveLeg);
    this.collectedResults.get(taskId)!.set(platform, replaceLegResults(this.collectedResults.get(taskId)!.get(platform) || [], tagged, leg));
    if (results.length > 0) await this.restoreAfterCtripCollection(taskId, platform);

    let shouldStartInbound = false;
    if (this.activeTask && this.activeTask.id === taskId) {
      this.activeTask.platforms[platform].resultCount = this.collectedResults.get(taskId)!.get(platform)!.length;
      if (effectiveLeg && this.roundTripQueries.has(taskId)) {
        this.markRoundTripLegCompleted(taskId, platform, effectiveLeg);
        if (effectiveLeg === "outbound") {
          this.updatePlatformStatus(taskId, platform, "extracting", 55, `去程已完成，获得${tagged.length}条；正在查询返程`);
          shouldStartInbound = true;
        } else {
          this.updatePlatformStatus(taskId, platform, "completed", 100, `往返两程提取完成，共${this.activeTask.platforms[platform].resultCount}条结果`);
        }
      } else this.updatePlatformStatus(taskId, platform, "completed", 100, `提取成功, 获得${results.length}条结果`);
    }

    // 存储到 IndexedDB
    const query = this.activeTask!.query;
    const records = this.collectedResults.get(taskId)!.get(platform)!.filter(isHistoryEligible).map((f) => ({
      id: generateId("record"),
      taskId,
      platform,
      originCityCode: query.originCityCode || query.originCity,
      originAirportCode: query.originAirportCode,
      destinationCityCode: query.destinationCityCode || query.destinationCity,
      destinationAirportCode: query.destinationAirportCode,
      departureDate: f.departureDate,
      flightNumber: f.marketingFlightNumber,
      displayedPrice: f.displayedPrice,
      airportConstructionFee: f.airportConstructionFee,
      fuelSurcharge: f.fuelSurcharge,
      taxAmount: f.taxAmount,
      totalPrice: f.totalPrice,
      priceDisclosure: f.priceDisclosure,
      priceType: f.priceType,
      confidence: f.confidence,
      collectedAt: f.collectedAt,
      querySnapshotId: taskId,
      airline: f.airline,
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      direct: f.direct,
      dataQuality: f.totalPrice === undefined ? "partial" as const : "verified" as const,
    }));
    await replacePriceRecordsForTaskPlatform(taskId, platform, records);
    await saveCurrentTaskResults(this.getResultsForTask(taskId));
    const snapshot = this.toQuerySnapshot(taskId);
    await saveQuerySnapshot(snapshot);
    await markReachedWatches(snapshot.journeyKey, snapshotLowest(snapshot));
    await this.cleanupExpiredHistory();
    this.notifyObservers();
    await this.closeCompletedPlatformTab(taskId, platform, effectiveLeg);
    // The outbound temporary page must be restored/closed before Ctrip starts
    // an inbound foreground session; otherwise the two legs overwrite state.
    if (shouldStartInbound) await this.runInboundLeg(taskId, platform);
  }

  async savePlatformProgress(taskId: string, platform: SupportedPlatform, results: FlightResult[], message: string, leg?: FlightLeg) {
    if (!await this.ensureActiveTask(taskId)) return;
    if (!this.collectedResults.has(taskId)) this.collectedResults.set(taskId, new Map());
    const effectiveLeg = leg || results[0]?.leg;
    const existing = this.collectedResults.get(taskId)!.get(platform) || [];
    const otherLegs = effectiveLeg ? existing.filter((flight) => flight.leg !== effectiveLeg) : [];
    const merged = [...otherLegs, ...mergeFlights(existing.filter((flight) => !effectiveLeg || flight.leg === effectiveLeg), tagRoundTripLeg(results, effectiveLeg))];
    this.collectedResults.get(taskId)!.set(platform, merged);
    if (this.activeTask?.id === taskId) {
      this.activeTask.platforms[platform].resultCount = merged.length;
      this.updatePlatformStatus(taskId, platform, "extracting", 70, message);
    }
    await saveCurrentTaskResults(this.getResultsForTask(taskId));
    await saveQuerySnapshot(this.toQuerySnapshot(taskId));
    this.notifyObservers();
  }

  async savePlatformPackages(
    taskId: string,
    platform: SupportedPlatform,
    packages: RoundTripPackageResult[],
    message: string,
    completed: boolean
  ): Promise<void> {
    if (!await this.ensureActiveTask(taskId) || !this.activeTask || this.activeTask.id !== taskId) return;
    this.activeTask.roundTripPackages ||= {};
    this.activeTask.roundTripPackages[platform] = packages;
    this.activeTask.platforms[platform].resultCount = packages.length;
    this.updatePlatformStatus(taskId, platform, completed ? "completed" : "extracting", completed ? 100 : 72, message);
    await saveCurrentTask(this.activeTask);
    await saveQuerySnapshot(this.toQuerySnapshot(taskId));
    this.broadcastTaskState(taskId, platform, this.activeTask.platforms[platform]);
    this.notifyObservers();
    if (completed) {
      await this.restoreAfterCtripCollection(taskId, platform);
      await this.closeCompletedPlatformTab(taskId, platform);
    }
  }

  async getCurrentSnapshot(): Promise<{ task: ComparisonTask | null; results: Record<SupportedPlatform, FlightResult[]> }> {
    if (!this.activeTask) {
      const task = await getCurrentTask();
      if (task) {
        this.activeTask = task;
        // A Service Worker does not retain timers or tab bindings.  After a
        // manual extension reload, an in-progress persisted task therefore
        // has no executor left.  Keep its collected results but expose it as
        // retryable instead of restoring an endless loading state.
        if (isTaskInProgress(task)) {
          this.markTaskInterruptedAfterWorkerRestart(task);
          await saveCurrentTask(task);
          await saveQuerySnapshot(this.toQuerySnapshot(task.id));
        }
        const results = await getCurrentTaskResults();
        this.collectedResults.set(task.id, new Map(Object.entries(results) as [SupportedPlatform, FlightResult[]][]));
      }
    }
    return {
      task: this.activeTask,
      results: this.activeTask ? this.getResultsForTask(this.activeTask.id) : { ctrip: [], qunar: [], fliggy: [], tongcheng: [] },
    };
  }

  getActiveTask(): ComparisonTask | null {
    return this.activeTask;
  }

  getLegQuery(taskId: string, leg?: FlightLeg): FlightQuery | undefined {
    return leg ? this.roundTripQueries.get(taskId)?.[leg] : this.activeTask?.id === taskId ? this.activeTask.query : undefined;
  }

  private markTaskInterruptedAfterWorkerRestart(task: ComparisonTask): void {
    const now = new Date().toISOString();
    for (const platform of task.query.enabledPlatforms) {
      const state = task.platforms[platform];
      if (!state || !isTransientPlatformStatus(state.status)) continue;
      state.status = "interrupted";
      state.message = "插件后台已重载，原查询已中断；可点击重新提取或重新发起比价";
      state.errorCode = "BACKGROUND_RESTARTED";
      state.retryable = true;
      state.updatedAt = now;
    }
    task.updatedAt = now;
  }

  async retryPlatform(taskId: string, platform: SupportedPlatform): Promise<void> {
    if (!this.activeTask || this.activeTask.id !== taskId) return;

    const nativeRoundTrip = this.activeTask.query.tripType === "roundtrip" && getRoundTripPlatformPlan(platform).nativeAvailability === "verified";
    if (nativeRoundTrip) {
      await this.runPlatformTask(taskId, platform, this.activeTask.query);
      return;
    }
    const roundTripOutbound = this.roundTripQueries.get(taskId)?.outbound;
    if (roundTripOutbound) {
      await this.runPlatformTask(taskId, platform, roundTripOutbound, "outbound");
      return;
    }

    const binding = tabManager.getTabBinding(taskId, platform);
    if (!binding) {
      await this.runPlatformTask(taskId, platform, this.activeTask.query);
      return;
    }

    const currentStatus = this.activeTask.platforms[platform].status;
    const isStillLoading = currentStatus === "loading"
      || currentStatus === "waiting_results"
      || currentStatus === "extracting";

    if (isStillLoading) {
      this.updatePlatformStatus(taskId, platform, "loading", 30, "正在刷新页面并重新获取航班数据");
      try {
        if (platform === "ctrip") {
          const previousTabId = await this.getActiveTabId();
          await chrome.tabs.update(binding.tabId, { active: true });
          this.ctripForegroundSessions.set(taskId, { ctripTabId: binding.tabId, previousTabId });
          this.updatePlatformStatus(taskId, platform, "loading", 30, "携程正在前台重新加载完整航班列表，完成后将自动返回");
        }
        await chrome.tabs.reload(binding.tabId);
      } catch {
        await this.runPlatformTask(taskId, platform, this.activeTask.query);
      }
      return;
    }

    this.updatePlatformStatus(taskId, platform, "idle", 0, "正在重新提取当前页面");
    this.updatePlatformStatus(taskId, platform, "creating_tab", 10, "正在连接已打开的平台页面");
    this.updatePlatformStatus(taskId, platform, "loading", 30, "页面已打开，等待脚本就绪");
    this.updatePlatformStatus(taskId, platform, "waiting_results", 60, "正在重新读取页面航班数据");
    this.requestAdapterExecution(binding.tabId, taskId, platform, this.activeTask.query);
  }

  failPlatform(
    taskId: string,
    platform: SupportedPlatform,
    error: { code: string; message: string; retryable: boolean },
    leg?: FlightLeg
  ) {
    if (!this.activeTask || this.activeTask.id !== taskId) return;
    const state = this.activeTask.platforms[platform];
    state.errorCode = error.code;
    state.retryable = error.retryable;
    if (this.shouldFallbackNativeRoundTrip(taskId, platform, leg, error.code)) {
      void this.fallbackToSplitRoundTrip(taskId, platform, error.message);
      return;
    }
    if (leg === "outbound" && this.roundTripQueries.has(taskId)) {
      this.updatePlatformStatus(taskId, platform, "extracting", 50, `去程未完成：${error.message}；仍将继续查询返程`);
      void this.finishOutboundAndRunInbound(taskId, platform);
    } else {
      this.updatePlatformStatus(taskId, platform, "failed", 0, error.message);
      void this.closeCompletedPlatformTab(taskId, platform, leg);
    }
    void this.restoreAfterCtripCollection(taskId, platform);
  }

  markPlatformEmpty(taskId: string, platform: SupportedPlatform, message = "该平台暂无符合条件的航班", leg?: FlightLeg): void {
    if (!this.activeTask || this.activeTask.id !== taskId) return;
    this.activeTask.platforms[platform].resultCount = 0;
    this.activeTask.platforms[platform].retryable = false;
    if (leg === "outbound" && this.roundTripQueries.has(taskId)) {
      this.updatePlatformStatus(taskId, platform, "extracting", 55, "去程无符合航班，仍将继续查询返程");
      void this.finishOutboundAndRunInbound(taskId, platform);
    } else {
      this.updatePlatformStatus(taskId, platform, "empty", 100, message);
      void this.closeCompletedPlatformTab(taskId, platform, leg);
    }
  }

  async cancelComparison(taskId: string): Promise<void> {
    if (!this.activeTask || this.activeTask.id !== taskId) return;
    this.cancelledTaskIds.add(taskId);
    this.clearTaskTimeout(taskId);
    for (const platform of Object.keys(this.activeTask.platforms) as SupportedPlatform[]) {
      const state = this.activeTask.platforms[platform];
      if (!["completed", "empty", "failed", "cancelled"].includes(state.status)) {
        this.updatePlatformStatus(taskId, platform, "cancelled", state.progress, "任务已取消");
      }
    }
    await saveCurrentTask(this.activeTask);
    await saveQuerySnapshot(this.toQuerySnapshot(taskId));
    if (this.monitorTaskIds.has(taskId) || !await this.shouldKeepPlatformTabs()) await this.closeTaskPlatformTabs(taskId);
  }

  subscribe(observer: (task: ComparisonTask, results: Record<SupportedPlatform, FlightResult[]>) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  requireLogin(taskId: string, platform: SupportedPlatform, message?: string) {
    if (!this.activeTask || this.activeTask.id !== taskId) return;
    const state = this.activeTask.platforms[platform];
    state.errorCode = "LOGIN_REQUIRED";
    state.retryable = true;
    this.updatePlatformStatus(
      taskId,
      platform,
      "needs_user_action",
      50,
      message || `${platformName(platform)}未登录，请点击“去登录”后完成登录；页面将自动继续获取数据`
    );
  }

  async openPlatformLogin(taskId: string, platform: SupportedPlatform): Promise<boolean> {
    const binding = tabManager.getTabBinding(taskId, platform);
    if (!binding) return false;
    try {
      await chrome.tabs.update(binding.tabId, { active: true });
      return true;
    } catch {
      return false;
    }
  }

  requestAdapterExecution(
    tabId: number,
    taskId: string,
    platform: SupportedPlatform,
    query: FlightQuery,
    leg?: FlightLeg,
    attempt = 0
  ) {
    chrome.tabs.sendMessage(tabId, {
      type: "EXECUTE_ADAPTER",
      taskId,
      platform,
      payload: { query, leg },
    }, () => {
      const errorMessage = chrome.runtime.lastError?.message;
      if (!errorMessage) return;

      // Only retry a genuinely absent receiver.  A listener that does not
      // answer produces a different "message port closed" error and must not
      // fan out into concurrent page runs.
      const receiverUnavailable = /Receiving end does not exist|Could not establish connection/i.test(errorMessage);
      if (receiverUnavailable && attempt < 8) {
        setTimeout(() => this.requestAdapterExecution(tabId, taskId, platform, query, leg, attempt + 1), 750);
        return;
      }
      this.failPlatform(taskId, platform, {
        code: "CONTENT_SCRIPT_UNAVAILABLE",
        message: receiverUnavailable
          ? "页面脚本未能就绪，请刷新该平台页面后点击重新提取"
          : `无法启动页面提取：${errorMessage}`,
        retryable: true,
      }, leg);
    });
  }

  async openFlightBooking(flight: FlightResult): Promise<BookingActionResult> {
    this.broadcastBookingProgress(flight.platform, "opening_result", `正在打开${platformName(flight.platform)}航班结果页`);
    const binding = this.activeTask ? tabManager.getTabBinding(this.activeTask.id, flight.platform) : undefined;
    const matchedTab = await this.findFlightResultTab(flight, binding?.tabId);
    const tab = matchedTab || await chrome.tabs.create({ url: flight.sourceUrl, active: true });
    const tabId = tab.id!;
    const needsResultPage = !isSameResultPage(tab.url, flight.sourceUrl);
    if (needsResultPage) await chrome.tabs.update(tabId, { url: flight.sourceUrl, active: true });
    else await chrome.tabs.update(tabId, { active: true });

    // Register observers before the page click.  Qunar opens a child tab,
    // while Ctrip and Fliggy replace the result page in the current tab.
    const navigation = this.watchBookingNavigation(tabId, flight.platform);
    // Reopening a result page may require the platform to render and lazily
    // append flights before its real booking button exists.
    this.bookingNavigationUntil.set(tabId, Date.now() + BOOKING_FLOW_TIMEOUT_MS);
    this.broadcastBookingProgress(flight.platform, "waiting_result", "正在等待平台加载当前航班列表");
    this.broadcastBookingProgress(flight.platform, "locating_flight", "正在定位原航班与可订舱位");
    const bookingResult = await this.requestBookingAction(tabId, flight);
    if (!bookingResult.opened) {
      navigation.dispose();
      logger.warn(`未能定位 ${flight.platform} 的订票入口，已停留在结果页`, flight);
      return bookingResult;
    }

    this.broadcastBookingProgress(flight.platform, "opening_order", "已定位当前舱位，正在打开平台订单页");
    const destination = await navigation.result;
    if (!destination) {
      logger.warn(`${flight.platform} 已点击订票入口，但未在限定时间内进入确认订单页`);
      return { opened: false, status: "booking_not_confirmed", message: "已点击预订，但未确认进入订单页；请检查平台是否提示登录、变价或库存变化" };
    }
    this.bookingNavigationUntil.set(destination.tabId, Date.now() + BOOKING_FLOW_TIMEOUT_MS);
    await chrome.tabs.update(destination.tabId, { active: true });
    logger.info(`${flight.platform} 已打开确认订单页: ${redactBookingUrl(destination.url)}`);
    return { opened: true, status: "opened", message: "已打开平台当前有效的订票确认页" };
  }

  private async findFlightResultTab(flight: FlightResult, boundTabId?: number): Promise<chrome.tabs.Tab | undefined> {
    if (boundTabId !== undefined) {
      try {
        const tab = await chrome.tabs.get(boundTabId);
        if (isSameResultPage(tab.url, flight.sourceUrl)) return tab;
      } catch {
        // Fall through to all browser tabs; service workers can lose in-memory bindings.
      }
    }
    const tabs = await chrome.tabs.query({});
    return tabs.find((tab) => isSameResultPage(tab.url, flight.sourceUrl));
  }

  private requestBookingAction(tabId: number, flight: FlightResult, attempt = 0): Promise<BookingActionResult> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, {
        type: "OPEN_FLIGHT_BOOKING",
        platform: flight.platform,
        payload: { flight },
      }, (response) => {
        const noReceiver = /Receiving end does not exist|Could not establish connection/i.test(chrome.runtime.lastError?.message || "");
        if (noReceiver && attempt < 12) {
          setTimeout(() => resolve(this.requestBookingAction(tabId, flight, attempt + 1)), 500);
          return;
        }
        if (noReceiver) {
          resolve({ opened: false, status: "page_timeout", message: "结果页脚本未就绪，无法重新验证航班" });
          return;
        }
        resolve(response as BookingActionResult || { opened: false, status: "flight_changed", message: "未能定位当前可订舱位" });
      });
    });
  }

  private async getActiveTabId(): Promise<number | undefined> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      return tab?.id;
    } catch {
      return undefined;
    }
  }

  private async restoreAfterCtripCollection(taskId: string, platform: SupportedPlatform): Promise<void> {
    if (platform !== "ctrip") return;
    const session = this.ctripForegroundSessions.get(taskId);
    if (!session) return;
    this.ctripForegroundSessions.delete(taskId);

    // Do not interrupt someone who deliberately changed tabs while Ctrip was
    // rendering.  Restore only if the temporary Ctrip tab still owns focus.
    const activeTabId = await this.getActiveTabId();
    if (activeTabId !== session.ctripTabId || session.previousTabId === undefined) return;
    try {
      await chrome.tabs.update(session.previousTabId, { active: true });
      logger.info(`携程完整采集已结束，已返回原标签页: ${session.previousTabId}`);
    } catch {
      logger.warn("携程完整采集已结束，但原标签页不可用，保留携程页面");
    }
  }

  private async closeCompletedPlatformTab(taskId: string, platform: SupportedPlatform, leg?: FlightLeg): Promise<void> {
    if (!this.monitorTaskIds.has(taskId) && await this.shouldKeepPlatformTabs()) return;
    await this.restoreAfterCtripCollection(taskId, platform);
    const binding = tabManager.getTabBinding(taskId, platform, leg);
    if (!binding) return;
    if (this.isBookingNavigation(binding.tabId)) return;
    await tabManager.closeTab(binding.tabId);
    logger.info(`采集完成后自动关闭${platformName(platform)}平台标签页: ${binding.tabId}`);
  }

  private async closeTaskPlatformTabs(taskId: string): Promise<void> {
    await Promise.all(tabManager.getTaskBindings(taskId).map(async (binding) => {
      if (this.isBookingNavigation(binding.tabId)) return;
      await this.restoreAfterCtripCollection(taskId, binding.platform);
      await tabManager.closeTab(binding.tabId);
    }));
  }

  private async finishOutboundAndRunInbound(taskId: string, platform: SupportedPlatform): Promise<void> {
    await this.closeCompletedPlatformTab(taskId, platform, "outbound");
    await this.runInboundLeg(taskId, platform);
  }

  /**
   * Result callbacks close their own tab. This finalizer handles terminal
   * paths without callbacks, such as timeout, interruption and cancellation.
   * Manual login/captcha pages remain open so the user can complete the step.
   */
  private async finalizeTaskTabsIfEligible(taskId: string): Promise<void> {
    if (this.tabCleanupTasks.has(taskId) || !this.activeTask || this.activeTask.id !== taskId) return;
    const statuses = this.activeTask.query.enabledPlatforms.map((platform) => this.activeTask!.platforms[platform].status);
    if (!statuses.every(isTaskTerminalStatus)) return;
    if (!this.monitorTaskIds.has(taskId) && await this.shouldKeepPlatformTabs()) return;
    if (!this.monitorTaskIds.has(taskId) && statuses.some((status) => status === "needs_user_action")) return;

    this.tabCleanupTasks.add(taskId);
    try {
      await this.closeTaskPlatformTabs(taskId);
    } finally {
      this.tabCleanupTasks.delete(taskId);
    }
  }

  private markRoundTripLegCompleted(taskId: string, platform: SupportedPlatform, leg: FlightLeg): void {
    const completed = this.completedRoundTripLegs.get(taskId) || new Map<SupportedPlatform, Set<FlightLeg>>();
    const legs = completed.get(platform) || new Set<FlightLeg>();
    legs.add(leg); completed.set(platform, legs); this.completedRoundTripLegs.set(taskId, completed);
  }

  private async runInboundLeg(taskId: string, platform: SupportedPlatform): Promise<void> {
    const inbound = this.roundTripQueries.get(taskId)?.inbound;
    if (!inbound || this.cancelledTaskIds.has(taskId)) return;
    await this.runPlatformTask(taskId, platform, inbound, "inbound");
  }

  private shouldFallbackNativeRoundTrip(taskId: string, platform: SupportedPlatform, leg: FlightLeg | undefined, errorCode: string): boolean {
    const nativeFailureCodes = new Set([
      "ROUNDTRIP_CONTEXT_MISMATCH",
      "ROUNDTRIP_PACKAGE_EMPTY",
      "TIMEOUT_WAITING_FOR_OUTBOUND_OPTIONS",
      "OUTBOUND_OPTIONS_NOT_READY",
      "TIMEOUT_WAITING_FOR_RETURN_OPTIONS",
      "RETURN_TO_OUTBOUND_FAILED",
    ]);
    return platform === "ctrip"
      && leg === undefined
      && this.activeTask?.id === taskId
      && this.activeTask.query.tripType === "roundtrip"
      && getRoundTripPlatformPlan(platform).nativeAvailability === "verified"
      && nativeFailureCodes.has(errorCode)
      && !this.nativeRoundTripFallbacks.has(this.nativeFallbackKey(taskId, platform));
  }

  private async fallbackToSplitRoundTrip(taskId: string, platform: SupportedPlatform, nativeError: string): Promise<void> {
    if (!this.activeTask || this.activeTask.id !== taskId || this.cancelledTaskIds.has(taskId)) return;
    this.nativeRoundTripFallbacks.add(this.nativeFallbackKey(taskId, platform));
    this.activeTask.roundTripPackages ||= {};
    this.activeTask.roundTripPackages[platform] = [];
    this.activeTask.platforms[platform].resultCount = 0;
    this.updatePlatformStatus(taskId, platform, "extracting", 45, "携程往返套餐暂未读取到，正在自动改为去程、返程分段查询");

    // The package picker is stateful and must not stay open alongside the
    // foreground one-way collector. Close only this temporary default tab;
    // outbound/inbound tabs have their own leg bindings.
    const nativeBinding = tabManager.getTabBinding(taskId, platform);
    await this.restoreAfterCtripCollection(taskId, platform);
    if (nativeBinding) await tabManager.closeTab(nativeBinding.tabId);

    const outbound = this.roundTripQueries.get(taskId)?.outbound;
    if (!outbound) {
      this.updatePlatformStatus(taskId, platform, "failed", 0, `携程套餐读取失败且无法建立分段查询：${nativeError}`);
      return;
    }
    await this.runPlatformTask(taskId, platform, outbound, "outbound");
  }

  private nativeFallbackKey(taskId: string, platform: SupportedPlatform): string {
    return `${taskId}:${platform}`;
  }

  private async shouldKeepPlatformTabs(): Promise<boolean> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return false;
    try {
      const value = await chrome.storage.local.get([KEEP_PLATFORM_TABS_KEY, KEEP_PLATFORM_TABS_PREFERENCE_VERSION_KEY]);
      // Older releases persisted this preference before automatic cleanup was
      // introduced. Do not let that legacy value silently keep every newly
      // opened query page forever. A user can explicitly re-enable it later.
      if (value[KEEP_PLATFORM_TABS_PREFERENCE_VERSION_KEY] !== KEEP_PLATFORM_TABS_PREFERENCE_VERSION) {
        await chrome.storage.local.set({
          [KEEP_PLATFORM_TABS_KEY]: false,
          [KEEP_PLATFORM_TABS_PREFERENCE_VERSION_KEY]: KEEP_PLATFORM_TABS_PREFERENCE_VERSION,
        });
        return false;
      }
      return value[KEEP_PLATFORM_TABS_KEY] === true;
    } catch {
      return false;
    }
  }

  private watchBookingNavigation(sourceTabId: number, platform: SupportedPlatform): {
    result: Promise<{ tabId: number; url: string } | undefined>;
    dispose: () => void;
  } {
    let settled = false;
    let timer: number | undefined;
    let resolveResult: (value: { tabId: number; url: string } | undefined) => void = () => {};

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onCreated.removeListener(onCreated);
      if (timer !== undefined) globalThis.clearTimeout(timer);
    };
    const finish = (value?: { tabId: number; url: string }) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolveResult(value);
    };
    const inspect = (tabId: number, url?: string) => {
      if (url && isBookingConfirmationUrl(platform, url)) finish({ tabId, url });
    };
    const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // Current-tab redirects and child-tab navigations are both observed.
      if (tabId === sourceTabId || tab.openerTabId === sourceTabId) inspect(tabId, changeInfo.url || tab.url);
    };
    const onCreated = (tab: chrome.tabs.Tab) => {
      if (tab.openerTabId === sourceTabId) inspect(tab.id!, tab.url);
    };

    const result = new Promise<{ tabId: number; url: string } | undefined>((resolve) => {
      resolveResult = resolve;
      chrome.tabs.onUpdated.addListener(onUpdated);
      chrome.tabs.onCreated.addListener(onCreated);
      timer = setTimeout(() => finish(), BOOKING_FLOW_TIMEOUT_MS) as unknown as number;
    });
    return { result, dispose: () => finish() };
  }

  isBookingNavigation(tabId: number): boolean {
    const until = this.bookingNavigationUntil.get(tabId);
    if (!until) return false;
    if (Date.now() > until) {
      this.bookingNavigationUntil.delete(tabId);
      return false;
    }
    return true;
  }

  getResultsForTask(taskId: string): Record<SupportedPlatform, FlightResult[]> {
    const taskMap = this.collectedResults.get(taskId);
    return {
      ctrip: taskMap?.get("ctrip") || [],
      qunar: taskMap?.get("qunar") || [],
      fliggy: taskMap?.get("fliggy") || [],
      tongcheng: taskMap?.get("tongcheng") || [],
    };
  }

  private async ensureActiveTask(taskId: string): Promise<boolean> {
    if (this.activeTask?.id === taskId) return true;
    const snapshot = await this.getCurrentSnapshot();
    return snapshot.task?.id === taskId;
  }

  private broadcastTaskState(taskId: string, platform: SupportedPlatform, state: PlatformTaskState) {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: "TASK_STATE_CHANGED",
        taskId,
        platform,
        payload: { taskId, platform, state, results: this.getResultsForTask(taskId)[platform], packages: this.activeTask?.roundTripPackages?.[platform] || [] },
      }).catch(() => {});
    }
  }

  private broadcastBookingProgress(platform: SupportedPlatform, stage: BookingProgressPayload["stage"], message: string): void {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "BOOKING_PROGRESS", platform, payload: { platform, stage, message } satisfies BookingProgressPayload }).catch(() => {});
    }
  }

  private notifyObservers(): void {
    if (!this.activeTask) return;
    const results = this.getResultsForTask(this.activeTask.id);
    for (const observer of this.observers) observer(this.activeTask, results);
  }

  private scheduleTaskTimeout(taskId: string, timeoutSeconds: number): void {
    this.clearTaskTimeout(taskId);
    const boundedSeconds = Math.min(600, Math.max(60, timeoutSeconds || 180));
    this.taskTimeouts.set(taskId, setTimeout(() => void this.timeoutTask(taskId), boundedSeconds * 1000));
  }

  private clearTaskTimeout(taskId: string): void {
    const timer = this.taskTimeouts.get(taskId);
    if (timer) clearTimeout(timer);
    this.taskTimeouts.delete(taskId);
  }

  private async timeoutTask(taskId: string): Promise<void> {
    if (!this.activeTask || this.activeTask.id !== taskId || this.cancelledTaskIds.has(taskId)) return;
    for (const platform of this.activeTask.query.enabledPlatforms) {
      const state = this.activeTask.platforms[platform];
      if (isTaskTerminalStatus(state.status)) continue;
      state.errorCode = "PAGE_TIMEOUT";
      state.retryable = true;
      this.updatePlatformStatus(taskId, platform, "page_timeout", 100, "页面加载超时；已保留已采集结果，可重新获取该平台");
      // A round-trip tab is keyed by outbound/inbound rather than default.
      // Close every binding for this platform so timed-out pages never leak.
      await Promise.all(tabManager.getTaskBindings(taskId)
        .filter((binding) => binding.platform === platform)
        .map((binding) => this.closeCompletedPlatformTab(taskId, platform, binding.leg)));
    }
    this.clearTaskTimeout(taskId);
  }

  private async cleanupExpiredHistory(): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    try {
      const value = await chrome.storage.local.get(HISTORY_RETENTION_DAYS_KEY);
      const days = [7, 30, 90].includes(value[HISTORY_RETENTION_DAYS_KEY]) ? value[HISTORY_RETENTION_DAYS_KEY] : 30;
      await Promise.all([cleanOldPriceRecords(days), cleanOldQuerySnapshots(days)]);
    } catch {
      // Retention cleanup must never affect a completed flight query.
    }
  }

  private toQuerySnapshot(taskId: string): QuerySnapshot {
    if (!this.activeTask || this.activeTask.id !== taskId) {
      throw new Error("Cannot persist a snapshot without its active task");
    }
    const task = this.activeTask;
    return {
      id: task.id,
      taskId: task.id,
      journeyKey: buildJourneyKey(task.query),
      query: task.query,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      platforms: Object.fromEntries(Object.entries(task.platforms).map(([platform, state]) => [platform, {
        status: state.status,
        message: state.message,
        resultCount: state.resultCount,
        errorCode: state.errorCode,
        updatedAt: state.updatedAt,
      }])) as QuerySnapshot["platforms"],
      results: this.getResultsForTask(taskId),
    };
  }
}

const BOOKING_FLOW_TIMEOUT_MS = 150000;

function isHistoryEligible(flight: FlightResult): boolean {
  return flight.queryContextValid
    && flight.confidence >= 70
    && Number.isFinite(flight.displayedPrice)
    && flight.displayedPrice > 0
    && flight.departureDate.length === 10
    && Boolean(flight.departureTime)
    && Boolean(flight.arrivalTime);
}

function mergeFlights(existing: FlightResult[], incoming: FlightResult[]): FlightResult[] {
  const byKey = new Map<string, FlightResult>();
  for (const flight of [...existing, ...incoming]) {
    const key = `${flight.marketingFlightNumber}|${flight.departureTime}|${flight.arrivalTime}|${flight.displayedPrice}`;
    byKey.set(key, flight);
  }
  return [...byKey.values()];
}

function isSameResultPage(currentUrl?: string, sourceUrl?: string): boolean {
  if (!currentUrl || !sourceUrl) return false;
  try {
    const current = new URL(currentUrl);
    const source = new URL(sourceUrl);
    return current.origin === source.origin && current.pathname === source.pathname && current.search === source.search;
  } catch {
    return false;
  }
}

function isBookingConfirmationUrl(platform: SupportedPlatform, url: string): boolean {
  try {
    const parsed = new URL(url);
    if (platform === "ctrip") {
      return parsed.hostname === "flights.ctrip.com" && parsed.pathname === "/itinerary/checkout/passenger";
    }
    if (platform === "qunar") {
      return parsed.hostname === "qnf.trade.qunar.com" && parsed.pathname === "/ns/book/fill";
    }
    if (platform === "tongcheng") {
      return parsed.hostname.endsWith(".ly.com")
        && (/order|booking|checkout|passenger/i.test(parsed.pathname) || parsed.hostname.startsWith("order."));
    }
    return parsed.hostname === "fbuy.fliggy.com" && parsed.pathname === "/travel/confirm_order.htm";
  } catch {
    return false;
  }
}

function redactBookingUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "unknown";
  }
}

function platformName(platform: SupportedPlatform): string {
  switch (platform) {
    case "ctrip": return "携程";
    case "qunar": return "去哪儿";
    case "fliggy": return "飞猪";
    case "tongcheng": return "同程";
  }
}

function isTransientPlatformStatus(status: PlatformTaskStatus): boolean {
  return ![
    "completed",
    "empty",
    "failed",
    "cancelled",
    "rate_limited",
    "page_timeout",
    "interrupted",
    "needs_user_action",
    "page_changed",
  ].includes(status);
}

function isTaskTerminalStatus(status: PlatformTaskStatus): boolean {
  return ["completed", "empty", "failed", "cancelled", "rate_limited", "page_timeout", "interrupted", "needs_user_action", "page_changed"].includes(status);
}

function tagRoundTripLeg(results: FlightResult[], leg?: FlightLeg): FlightResult[] {
  return leg ? results.map((flight) => ({ ...flight, leg, roundTripPricingMode: "split_fallback" })) : results;
}

function replaceLegResults(current: FlightResult[], incoming: FlightResult[], leg?: FlightLeg): FlightResult[] {
  if (!leg) return incoming;
  return [...current.filter((flight) => flight.leg !== leg), ...incoming];
}

export const taskManager = new TaskManager();
