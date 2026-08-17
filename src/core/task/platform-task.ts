import { ComparisonTask, PlatformTaskState, SupportedPlatform } from "@/shared/types/platform";
import { FlightQuery } from "@/shared/types/flight";
import { generateId } from "@/shared/utils/id-generator";

export function createComparisonTask(query: FlightQuery, taskId = generateId("task")): ComparisonTask {
  const now = new Date().toISOString();

  const platformsState: Record<SupportedPlatform, PlatformTaskState> = {
    ctrip: createInitialPlatformTaskState("ctrip", taskId, now, query.enabledPlatforms.includes("ctrip")),
    qunar: createInitialPlatformTaskState("qunar", taskId, now, query.enabledPlatforms.includes("qunar")),
    fliggy: createInitialPlatformTaskState("fliggy", taskId, now, query.enabledPlatforms.includes("fliggy")),
    tongcheng: createInitialPlatformTaskState("tongcheng", taskId, now, query.enabledPlatforms.includes("tongcheng")),
  };

  return {
    id: taskId,
    query,
    createdAt: now,
    updatedAt: now,
    platforms: platformsState,
    roundTripPackageStates: query.tripType === "roundtrip" && query.enabledPlatforms.includes("ctrip")
      ? { ctrip: { ...createInitialPlatformTaskState("ctrip", taskId, now, true), message: "等待去程、返程分段结果后尝试套餐", retryable: true } }
      : undefined,
  };
}

function createInitialPlatformTaskState(
  platformId: SupportedPlatform,
  taskId: string,
  now: string,
  enabled: boolean
): PlatformTaskState {
  return {
    platformId,
    taskId,
    status: enabled ? "idle" : "cancelled",
    progress: 0,
    message: enabled ? "等待查询" : "未参与本次比价",
    retryable: enabled,
    resultCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
