import { BlockingState } from "@/shared/types/platform";
import { detectCommonBlockingState } from "../base/blocking-detector";

export async function detectTongchengBlocking(): Promise<BlockingState> {
  const common = detectCommonBlockingState();
  if (common.state !== "none") return common.state;
  try {
    if (new URL(window.location.href).hostname === "passport.ly.com") return "login_required";
  } catch {
    // Let normal result extraction report a retryable failure for malformed URLs.
  }
  return "none";
}
