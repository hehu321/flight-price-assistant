import { handleMessage } from "./message-router";
import { initNavigationListener } from "./navigation-listener";
import { logger } from "@/shared/logger/logger";
import { agentNativeBridge } from "./agent-native-bridge";
import { priceMonitorCoordinator } from "./price-monitor-coordinator";
import { taskManager } from "./task-manager";

logger.info("Service Worker 初始化中...");

if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener(handleMessage);
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    logger.warn("设置扩展图标打开侧边栏失败:", error);
  });
  initNavigationListener();
  agentNativeBridge.start();
  taskManager.subscribe((task, results) => void priceMonitorCoordinator.handleTaskUpdate(task, results));
  void priceMonitorCoordinator.initialize();
}
