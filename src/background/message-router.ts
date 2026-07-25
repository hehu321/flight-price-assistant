import { ExtensionMessage, StartComparisonPayload } from "@/shared/types/message";
import { taskManager } from "./task-manager";
import { logger } from "@/shared/logger/logger";
import { runCoordinator } from "./run-coordinator";
import { agentNativeBridge } from "./agent-native-bridge";

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
      const { taskId, platform, results } = message.payload as any;
      taskManager.savePlatformResults(taskId, platform, results).then(() => sendResponse({ success: true }));
      return true;
    }

    case "ADAPTER_PROGRESS": {
      const { taskId, platform, results, message: progressMessage } = message.payload as any;
      taskManager.savePlatformProgress(taskId, platform, results, progressMessage).then(() => sendResponse({ success: true }));
      return true;
    }

    case "ADAPTER_FAILED": {
      const { taskId, platform, error } = message.payload as any;
      taskManager.failPlatform(taskId, platform, error);
      sendResponse({ success: true });
      return false;
    }

    case "ADAPTER_EMPTY": {
      const { taskId, platform, message: emptyMessage } = message.payload as any;
      taskManager.markPlatformEmpty(taskId, platform, emptyMessage);
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
      const { taskId, platform, state, message: msg } = message.payload as any;
      if (state === "login_required") {
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
