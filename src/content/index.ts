import { runAdapterOnCurrentPage } from "./adapter-runner";
import { logger } from "@/shared/logger/logger";
import { ExtensionMessage } from "@/shared/types/message";
import { FlightLeg, FlightQuery, FlightResult } from "@/shared/types/flight";
import { adapterRegistry } from "@/adapters/base/adapter-registry";
import { BookingActionResult } from "@/shared/types/message";

logger.info("Content Script 已注入页面:", window.location.href);

const activeTaskIds = new Set<string>();

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === "OPEN_FLIGHT_BOOKING") {
    const flight = (message.payload as { flight?: FlightResult } | undefined)?.flight;
    prepareAndOpenBooking(flight)
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ opened: false, status: "page_timeout", message: "页面加载超时，请重新查询后再试" } satisfies BookingActionResult));
    return true;
  }

  if (message.type !== "EXECUTE_ADAPTER" || !message.taskId) return;

  // Acknowledge immediately.  The background retries only when no listener is
  // present; without this response Chrome reports a closed message port and
  // starts duplicate extraction runs.
  const leg = (message.payload as { leg?: FlightLeg } | undefined)?.leg;
  const executionKey = `${message.taskId}:${leg || "default"}`;
  if (activeTaskIds.has(executionKey)) {
    sendResponse({ accepted: true, duplicate: true });
    return;
  }
  activeTaskIds.add(executionKey);
  sendResponse({ accepted: true });

  const run = async () => {
    const query = (message.payload as { query?: FlightQuery } | undefined)?.query;
    try {
      await runAdapterOnCurrentPage(message.taskId, query, leg);
    } catch (error) {
      logger.error("执行页面适配器失败:", error);
    } finally {
      activeTaskIds.delete(executionKey);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    void run();
  }
});

async function prepareAndOpenBooking(flight?: FlightResult): Promise<BookingActionResult> {
  const adapter = adapterRegistry.findAdapterForUrl(window.location.href);
  if (!flight || !adapter?.openBooking) {
    return { opened: false, status: "unsupported", message: "当前页面不支持重新验证订票" };
  }

  const blocking = await adapter.detectBlockingState();
  if (blocking === "login_required") {
    return { opened: false, status: "login_required", message: `${adapter.name}未登录，请完成登录后重试` };
  }
  if (blocking !== "none") {
    return { opened: false, status: "page_timeout", message: "平台页面暂不可用，请处理验证后重试" };
  }

  try {
    // A reopened result tab must finish rendering before a booking control can
    // be found.  Some platforms append lower flights only while scrolling.
    await adapter.waitForResults();
    await adapter.prepareForExtraction?.();
  } catch {
    return { opened: false, status: "page_timeout", message: "结果页尚未加载完成，无法重新定位航班" };
  }

  const opened = await adapter.openBooking(flight);
  return opened
    ? { opened: true, status: "opened", message: "已点击平台实时预订入口，正在打开订单页" }
    : { opened: false, status: "flight_changed", message: "未找到原航班或原舱位；可能已变价、售罄或下架" };
}
