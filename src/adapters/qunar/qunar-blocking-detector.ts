import { BlockingState } from "@/shared/types/platform";
import { detectCommonBlockingState } from "../base/blocking-detector";

export async function detectQunarBlocking(): Promise<BlockingState> {
  return detectCommonBlockingState().state;
}
