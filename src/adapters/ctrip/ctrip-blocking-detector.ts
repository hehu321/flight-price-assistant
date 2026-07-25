import { BlockingState } from "@/shared/types/platform";
import { detectCommonBlockingState } from "../base/blocking-detector";

export async function detectCtripBlocking(): Promise<BlockingState> {
  const result = detectCommonBlockingState();
  return result.state;
}
