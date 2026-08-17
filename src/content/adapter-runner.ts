import { adapterRegistry } from "@/adapters/base/adapter-registry";
import { registerAllAdapters } from "@/adapters";
import { sendToBackground as sendToBackgroundBase } from "./page-bridge";
import { logger } from "@/shared/logger/logger";
import { FlightLeg, FlightQuery, FlightResult } from "@/shared/types/flight";
import { ExtensionMessage } from "@/shared/types/message";
import { collectCtripRoundTripPackages, isCtripNativeRoundTripPage } from "@/adapters/ctrip/ctrip-roundtrip-collector";

registerAllAdapters();
let activeLeg: FlightLeg | undefined;

function sendToBackground<T extends Record<string, unknown>>(message: ExtensionMessage<T>): Promise<unknown> {
  if (!activeLeg || !message.payload) return sendToBackgroundBase(message);
  return sendToBackgroundBase({ ...message, payload: { ...message.payload, leg: activeLeg } as T });
}

export async function runAdapterOnCurrentPage(taskId?: string, query?: FlightQuery, leg?: FlightLeg): Promise<void> {
  activeLeg = leg;
  const url = window.location.href;
  const adapter = adapterRegistry.findAdapterForUrl(url);

  if (!adapter) {
    logger.debug(`当前页面未匹配任何平台适配器: ${url}`);
    return;
  }

  if (!taskId) {
    logger.warn("缺少比价任务 ID，忽略非任务页面的自动提取");
    return;
  }

  logger.info(`在页面中启动适配器: ${adapter.name}`);

  if (query && adapter.fillSearchForm && adapter.shouldSubmitSearch?.()) {
    logger.info(`${adapter.name}需要通过页面表单发起查询`);
    await adapter.fillSearchForm(query);
  }

  // 1. 阻断状态检测
  const blockingState = await adapter.detectBlockingState();
  if (blockingState !== "none") {
    logger.warn(`阻断检测触发: ${blockingState}`);
    sendToBackground({
      type: "BLOCKING_DETECTED",
      taskId,
      platform: adapter.id,
      payload: { taskId, platform: adapter.id, state: blockingState, collectionScope: adapter.id === "ctrip" && query && isCtripNativeRoundTripPage(query) ? "package" : undefined, message: `触发阻断状态: ${blockingState}` },
    });
    return;
  }

  // Ctrip's native round-trip screen is a stateful picker. Its return-side
  // price is explicitly labelled as a package total, so keep it out of the
  // normal one-way extraction pipeline.
  if (adapter.id === "ctrip" && query && isCtripNativeRoundTripPage(query)) {
    try {
      const validation = await adapter.validateSearchContext(query);
      if (!validation.valid) throw new Error("ROUNDTRIP_CONTEXT_MISMATCH");
      const packages = await collectCtripRoundTripPackages(query, async (current, message) => {
        await sendToBackground({ type: "ADAPTER_PACKAGE_PROGRESS", taskId, platform: "ctrip", payload: { taskId, platform: "ctrip", packages: current, message } });
      });
      if (!packages.length) throw new Error("ROUNDTRIP_PACKAGE_EMPTY");
      await sendToBackground({ type: "ADAPTER_PACKAGE_COMPLETED", taskId, platform: "ctrip", payload: { taskId, platform: "ctrip", packages } });
    } catch (error) {
      logger.error("携程往返套餐采集失败:", error);
      await sendToBackground({ type: "ADAPTER_FAILED", taskId, platform: "ctrip", payload: { taskId, platform: "ctrip", collectionScope: "package", error: { code: error instanceof Error ? error.message : "ROUNDTRIP_PACKAGE_FAILED", message: "携程往返套餐暂未读取到", retryable: true } } });
    }
    return;
  }

  // 携程等慢页面可在卡片陆续出现时直接上报，不等整页加载完成。
  if (adapter.collectIncrementally) {
    try {
      if (query) {
        const validation = await adapter.validateSearchContext(query);
        if (!validation.valid) {
          sendToBackground({
            type: "ADAPTER_FAILED",
            taskId,
            platform: adapter.id,
            payload: { taskId, platform: adapter.id, error: { code: validation.errorCode || "CONTEXT_MISMATCH", message: "页面行程与请求不一致，已丢弃当前页面数据", retryable: true } },
          });
          return;
        }
      }
      const rawResults = await adapter.collectIncrementally(async (results, message) => {
        logger.info(`${adapter.name}增量上报：${message}`);
        await sendToBackground({
          type: "ADAPTER_PROGRESS",
          taskId,
          platform: adapter.id,
          payload: { taskId, platform: adapter.id, results, message },
        });
      });
      const validResults = applyRequestedConstraints(rawResults.map((result) => result.parsedResult!).filter(Boolean).map((result) => leg ? { ...result, leg, roundTripPricingMode: "split_fallback" as const } : result), query);
      if (validResults.length === 0) {
        if (hasExplicitEmptyState()) {
          sendToBackground({ type: "ADAPTER_EMPTY", taskId, platform: adapter.id, payload: { taskId, platform: adapter.id, message: "该平台明确显示暂无符合条件的航班" } });
          return;
        }
        throw new Error("EXTRACTION_EMPTY");
      }
      const enrichedResults = await enrichDisclosedFees(adapter, taskId, validResults);
      sendToBackground({
        type: "ADAPTER_COMPLETED",
        taskId,
        platform: adapter.id,
        payload: { taskId, platform: adapter.id, results: enrichedResults },
      });
    } catch (error) {
      logger.error(`${adapter.name}增量采集失败:`, error);
      sendToBackground({
        type: "ADAPTER_FAILED",
        taskId,
        platform: adapter.id,
        payload: {
          taskId,
          platform: adapter.id,
          error: {
            code: "RESULTS_NOT_READY",
            message: "暂未发现可解析航班；页面仍可继续加载后点击重新提取",
            retryable: true,
          },
        },
      });
    }
    return;
  }

  // 2. 等待结果稳定
  try {
    await adapter.waitForResults();
  } catch (err) {
    const latestBlockingState = await adapter.detectBlockingState();
    if (latestBlockingState !== "none") {
      sendToBackground({
        type: "BLOCKING_DETECTED",
        taskId,
        platform: adapter.id,
        payload: { taskId, platform: adapter.id, state: latestBlockingState, collectionScope: adapter.id === "ctrip" && query && isCtripNativeRoundTripPage(query) ? "package" : undefined, message: `触发阻断状态: ${latestBlockingState}` },
      });
      return;
    }

    logger.warn("等待结果稳定超时", err);
    sendToBackground({
      type: "ADAPTER_FAILED",
      taskId,
      platform: adapter.id,
      payload: {
        taskId,
        platform: adapter.id,
        error: {
          code: "RESULTS_NOT_READY",
          message: "页面加载完成后仍未识别到航班卡片，可在结果页点击重新提取",
          retryable: true,
        },
      },
    });
    return;
  }

  // 3. 对支持增量加载的平台滚动收集完整列表。
  if (query) {
    const validation = await adapter.validateSearchContext(query);
    if (!validation.valid) {
      sendToBackground({
        type: "ADAPTER_FAILED",
        taskId,
        platform: adapter.id,
        payload: { taskId, platform: adapter.id, error: { code: validation.errorCode || "CONTEXT_MISMATCH", message: "页面行程与请求不一致，已丢弃当前页面数据", retryable: true } },
      });
      return;
    }
  }
  await adapter.prepareForExtraction?.();

  // 4. 提取航班
  const rawResults = await adapter.extractFlights();
  const validResults = applyRequestedConstraints(rawResults
    .map((r) => r.parsedResult!)
    .filter(Boolean)
    .map((result) => leg ? { ...result, leg, roundTripPricingMode: "split_fallback" as const } : result), query);

  if (validResults.length === 0) {
    if (hasExplicitEmptyState()) {
      sendToBackground({ type: "ADAPTER_EMPTY", taskId, platform: adapter.id, payload: { taskId, platform: adapter.id, message: "该平台明确显示暂无符合条件的航班" } });
      return;
    }
    logger.warn("页面已出现航班卡片，但未能解析出可用结果");
    sendToBackground({
      type: "ADAPTER_FAILED",
      taskId,
      platform: adapter.id,
      payload: {
        taskId,
        platform: adapter.id,
        error: {
          code: "EXTRACTION_EMPTY",
          message: "已识别到航班页面但字段解析为空，可点击重新提取",
          retryable: true,
        },
      },
    });
    return;
  }

  // 先把列表票价交给侧边栏，随后逐条读取页面已公开的费用明细。
  // 这不会点击“预订”、填写乘机人或提交订单。
  await sendToBackground({
    type: "ADAPTER_PROGRESS",
    taskId,
    platform: adapter.id,
    payload: { taskId, platform: adapter.id, results: validResults, message: `已读取${validResults.length}条票价，正在核验页面公开的附加费` },
  });
  const enrichedResults = await enrichDisclosedFees(adapter, taskId, validResults);

  logger.info(`成功提取 ${enrichedResults.length} 条航班结果`);

  // 5. 发送结果给 Background
  sendToBackground({
    type: "ADAPTER_COMPLETED",
    taskId,
    platform: adapter.id,
    payload: {
      taskId,
      platform: adapter.id,
      results: enrichedResults,
    },
  });
}

async function enrichDisclosedFees(
  adapter: NonNullable<ReturnType<typeof adapterRegistry.findAdapterForUrl>>,
  taskId: string,
  results: FlightResult[]
): Promise<FlightResult[]> {
  if (!adapter.verifyPrice || results.length === 0) return results;

  const enriched: FlightResult[] = [];
  let confirmedCount = 0;
  for (let index = 0; index < results.length; index++) {
    const original = results[index];
    let verified = original;
    try {
      verified = await adapter.verifyPrice(original);
    } catch (error) {
      logger.warn(`${adapter.name}附加费核验失败，保留列表票价`, error);
    }
    enriched.push(verified);
    if (verified.priceDisclosure === "breakdown" || verified.priceDisclosure === "total_only") confirmedCount++;

    if ((index + 1) % 5 === 0 && index + 1 < results.length) {
      await sendToBackground({
        type: "ADAPTER_PROGRESS",
        taskId,
        platform: adapter.id,
        payload: {
          taskId,
          platform: adapter.id,
          results: enriched,
          message: `正在核验附加费：${index + 1}/${results.length}，已确认${confirmedCount}条`,
        },
      });
    }
  }

  if (confirmedCount > 0) {
    await sendToBackground({
      type: "ADAPTER_PROGRESS",
      taskId,
      platform: adapter.id,
      payload: { taskId, platform: adapter.id, results: enriched, message: `附加费核验完成：${confirmedCount}/${results.length}条页面已公开费用明细` },
    });
  }
  return enriched;
}

/** Apply only constraints that can be verified from the public result card.
 * Other request parameters are carried to platform URLs/forms; adapters must
 * never claim that a missing cabin or passenger selector was enforced. */
function applyRequestedConstraints(results: FlightResult[], query?: FlightQuery): FlightResult[] {
  if (!query) return results;
  return results
    .filter((flight) => !query.directOnly || flight.direct)
    .map((flight) => {
      const warnings = [...flight.warnings];
      if (query.directOnly) warnings.push("已按页面直飞标识筛选");
      if (query.cabinClass !== "economy" && !flight.cabin) warnings.push("页面未披露舱位，无法验证所选舱等");
      if ((query.childCount || 0) > 0) warnings.push("页面结果未披露儿童票规则，需在订票页确认");
      return { ...flight, warnings: [...new Set(warnings)] };
    });
}

function hasExplicitEmptyState(): boolean {
  const text = document.body?.innerText || "";
  return /暂无(航班|符合条件的航班)|没有(航班|符合条件的航班)|未找到(航班|符合条件的航班)/.test(text);
}
