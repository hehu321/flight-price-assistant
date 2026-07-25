import { ExtensionMessage } from "@/shared/types/message";

export function sendToBackground<T = unknown>(message: ExtensionMessage<T>): Promise<unknown> {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    } else {
      resolve(null);
    }
  });
}
