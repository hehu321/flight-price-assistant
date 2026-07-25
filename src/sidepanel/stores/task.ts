import { defineStore } from "pinia";
import { ComparisonTask, PlatformTaskState, SupportedPlatform } from "@/shared/types/platform";
import { isTaskInProgress } from "@/core/task/task-progress";

export const useTaskStore = defineStore("task", {
  state: () => ({
    currentTask: null as ComparisonTask | null,
    isComparing: false,
  }),
  actions: {
    setTask(task: ComparisonTask) {
      this.currentTask = task;
      // The latest task is persisted so that results survive a Side Panel or
      // extension reload.  Do not mistake a restored completed task for a
      // newly started query, otherwise no later event exists to stop loading.
      this.isComparing = isTaskInProgress(task);
    },
    updatePlatformState(platform: SupportedPlatform, state: PlatformTaskState) {
      if (this.currentTask) {
        this.currentTask.platforms[platform] = state;
        this.isComparing = isTaskInProgress(this.currentTask);
      }
    },
  },
});
