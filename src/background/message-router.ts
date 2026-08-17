import { ExtensionMessage, StartComparisonPayload } from "@/shared/types/message";
import { taskManager } from "./task-manager";
import { logger } from "@/shared/logger/logger";
import { runCoordinator } from "./run-coordinator";
import { agentNativeBridge } from "./agent-native-bridge";
import { clearDiagnostics, getDiagnostics } from "@/core/storage/diagnostic-repository";

export function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): boolean {
  logger.info(`Background 收到消息: ${message.type}`);

  switch (message.type) {
    case "GET_CURRENT_SNAPSHOT": {
      taskManager.getCurrentSnapshot().then((snapshot) => sendResponse({ success: true, ...snapshot }));
      return true;
    }

    case "GET_AGENT_INTEGRATION_STATUS": {
      agentNativeBridge.getStatus().then((status) => sendResponse({ success: true, status }));
      return true;
    }

    case "GET_DIAGNOSTICS": {
      getDiagnostics().then((diagnostics) => sendResponse({ success: true, diagnostics }));
      return true;
    }

    case "CLEAR_DIAGNOSTICS": {
      clearDiagnostics().then(() => sendResponse({ success: true }));
      return true;
    }

    case "UPDATE_AGENT_CLIENT_STATUS": {
      const { clientId, status } = message.payload as { clientId: string; status: "approved" | "rejected" | "revoked" };
      agentNativeBridge.updateClientStatus(clientId, status).then((client) => sendResponse({ success: Boolean(client), client }));
      return true;
    }

    case "START_COMPARISON": {
      const payload = message.payload as StartComparisonPayload;
      runCoordinator.startManual(payload.query).then((task) => {
        sendResponse({ success: true, task });
      });
      return true; // 异步响应
    }

    case "ADAPTER_COMPLETED": {
      const { taskId, platform, results, leg } = message.payload as any;
      taskManager.savePlatformResults(taskId, platform, results, leg).then(() => sendResponse({ success: true }));
      return true;
    }

    case "ADAPTER_PROGRESS": {
      const { taskId, platform, results, message: progressMessage, leg } = message.payload as any;
      taskManager.savePlatformProgress(taskId, platform, results, progressMessage, leg).then(() => sendResponse({ success: true }));
      return true;
    }

    case "ADAPTER_PACKAGE_PROGRESS": {
      const { taskId, platform, packages, message: progressMessage } = message.payload as any;
      taskManager.savePlatformPackages(taskId, platform, packages, progressMessage, false).then(() => sendResponse({ success: true }));
      return true;
    }

    case "ADAPTER_PACKAGE_COMPLETED": {
      const { taskId, platform, packages } = message.payload as any;
      taskManager.savePlatformPackages(taskId, platform, packages, `携程往返套餐提取完成，获得${packages.length}个套餐`, true).then(() => sendResponse({ success: true }));
      return true;
    }

    case "ADAPTER_FAILED": {
      const { taskId, platform, error, leg, collectionScope } = message.payload as any;
      if (collectionScope === "package") taskManager.failRoundTripPackage(taskId, platform, error);
      else taskManager.failPlatform(taskId, platform, error, leg);
      sendResponse({ success: true });
      return false;
    }

    case "ADAPTER_EMPTY": {
      const { taskId, platform, message: emptyMessage, leg } = message.payload as any;
      taskManager.markPlatformEmpty(taskId, platform, emptyMessage, leg);
      sendResponse({ success: true });
      return false;
    }

    case "CANCEL_COMPARISON": {
      const taskId = message.taskId || (message.payload as { taskId?: string } | undefined)?.taskId;
      if (!taskId) {
        sendResponse({ success: false, error: "缺少任务 ID" });
        return false;
      }
      runCoordinator.cancel(taskId).then(() => sendResponse({ success: true }));
      return true;
    }

    case "RETRY_PLATFORM": {
      const { taskId, platform } = message.payload as { taskId: string; platform: any };
      taskManager.retryPlatform(taskId, platform).then(() => sendResponse({ success: true }));
      return true;
    }

    case "RETRY_ROUNDTRIP_PACKAGE": {
      const { taskId, platform } = message.payload as { taskId: string; platform: any };
      taskManager.retryRoundTripPackage(taskId, platform).then(() => sendResponse({ success: true }));
      return true;
    }

    case "OPEN_PLATFORM_LOGIN": {
      const { taskId, platform } = message.payload as { taskId: string; platform: any };
      taskManager.openPlatformLogin(taskId, platform).then((opened) => sendResponse({ success: opened }));
      return true;
    }

    case "OPEN_FLIGHT_BOOKING": {
      const { flight } = message.payload as any;
      taskManager.openFlightBooking(flight).then((result) => sendResponse({ success: result.opened, result }));
      return true;
    }

    // Progress is broadcast by the background to visible extension pages.
    // The service worker itself does not need to handle it again.
    case "BOOKING_PROGRESS": {
      return false;
    }

    case "BLOCKING_DETECTED": {
      const { taskId, platform, state, message: msg, collectionScope } = message.payload as any;
      if (collectionScope === "package") {
        taskManager.blockRoundTripPackage(taskId, platform, state, msg || undefined);
      } else if (state === "login_required") {
        taskManager.requireLogin(taskId, platform, msg || undefined);
      } else {
        taskManager.updatePlatformStatus(taskId, platform, "needs_user_action", 50, msg || state);
      }
      sendResponse({ success: true });
      return false;
    }

    default:
      sendResponse({ success: false, error: "未知消息类型" });
      return false;
  }
}
