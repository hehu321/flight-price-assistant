import { tabManager } from "./tab-manager";
import { taskManager } from "./task-manager";
import { logger } from "@/shared/logger/logger";
import { SupportedPlatform } from "@/shared/types/flight";

export function initNavigationListener(): void {
  if (typeof chrome !== "undefined" && chrome.webNavigation) {
    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId !== 0) return; // 仅关注主框架

      const binding = tabManager.getBindingByTabId(details.tabId);
      if (binding) {
        if (taskManager.isBookingNavigation(details.tabId)) {
          logger.info(`订票跳转中，跳过结果提取: tabId=${details.tabId}`);
          return;
        }
        if (isPlatformLoginPage(details.url)) {
          logger.info(`平台登录页: tabId=${details.tabId}, platform=${binding.platform}`);
          taskManager.requireLogin(binding.taskId, binding.platform, `${getPlatformName(binding.platform)}未登录，请点击“去登录”后完成登录；页面将自动继续获取数据`);
          return;
        }

        logger.info(`匹配的标签页完成导航: tabId=${details.tabId}, platform=${binding.platform}`);
        taskManager.updatePlatformStatus(
          binding.taskId,
          binding.platform,
          "waiting_results",
          60,
          "页面加载就绪，准备提取结果"
        );

        const task = taskManager.getActiveTask();
        if (task?.id === binding.taskId) {
          taskManager.requestAdapterExecution(
            details.tabId,
            binding.taskId,
            binding.platform,
            taskManager.getLegQuery(binding.taskId, binding.leg) || task.query,
            binding.leg
          );
        }
      }
    });
  }
}

function isPlatformLoginPage(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "login.taobao.com"
      || hostname.endsWith(".taobao.com")
      || hostname === "passport.ctrip.com"
      || hostname.includes("passport.qunar.com")
      || hostname.includes("login.qunar.com")
      || hostname === "passport.ly.com";
  } catch {
    return false;
  }
}

function getPlatformName(platform: SupportedPlatform): string {
  switch (platform) {
    case "ctrip": return "携程";
    case "qunar": return "去哪儿";
    case "fliggy": return "飞猪";
    case "tongcheng": return "同程";
  }
}
