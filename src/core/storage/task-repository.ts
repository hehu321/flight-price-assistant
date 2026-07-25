import { ComparisonTask } from "@/shared/types/platform";
import { FlightResult, SupportedPlatform } from "@/shared/types/flight";

const CURRENT_TASK_KEY = "current_comparison_task";
const CURRENT_RESULTS_KEY = "current_comparison_results";

export async function saveCurrentTask(task: ComparisonTask): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [CURRENT_TASK_KEY]: task });
  } else {
    localStorage.setItem(CURRENT_TASK_KEY, JSON.stringify(task));
  }
}

export async function getCurrentTask(): Promise<ComparisonTask | null> {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    const res = await chrome.storage.local.get(CURRENT_TASK_KEY);
    return (res[CURRENT_TASK_KEY] as ComparisonTask) || null;
  } else {
    const data = localStorage.getItem(CURRENT_TASK_KEY);
    return data ? JSON.parse(data) : null;
  }
}

export async function saveCurrentTaskResults(results: Record<SupportedPlatform, FlightResult[]>): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ [CURRENT_RESULTS_KEY]: results });
  } else {
    localStorage.setItem(CURRENT_RESULTS_KEY, JSON.stringify(results));
  }
}

export async function getCurrentTaskResults(): Promise<Record<SupportedPlatform, FlightResult[]>> {
  const empty: Record<SupportedPlatform, FlightResult[]> = { ctrip: [], qunar: [], fliggy: [], tongcheng: [] };
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    const res = await chrome.storage.local.get(CURRENT_RESULTS_KEY);
    return { ...empty, ...(res[CURRENT_RESULTS_KEY] as Partial<Record<SupportedPlatform, FlightResult[]>> | undefined) };
  }
  const data = localStorage.getItem(CURRENT_RESULTS_KEY);
  return data ? { ...empty, ...JSON.parse(data) } : empty;
}
