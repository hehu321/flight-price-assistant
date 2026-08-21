import { BlockingState } from "@/shared/types/platform";
import { detectCommonBlockingState } from "../base/blocking-detector";

export async function detectFliggyBlocking(): Promise<BlockingState> {
  const result = detectCommonBlockingState();
  // 支持模拟场景标识检测 (URL 参数 login=expired / captcha=true)
  const url = window.location.href;
  if (url.includes("login=expired")) return "login_required";
  if (url.includes("captcha=true")) return "captcha";
  if (/入参校验失败[：:]出发城市三字码或到达城市三字码查不到城市信息/.test(document.body?.innerText || "")) {
    return "page_changed";
  }
  return result.state;
}
