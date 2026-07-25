import { queryAllAvailable, queryFirstAvailable } from "./selector-resolver";

export interface StableCheckConfig {
  selectors: string[];
  timeoutMs?: number;
  intervalMs?: number;
  stableCountsRequired?: number;
}

export function waitForElement(selectors: string[], timeoutMs: number = 20000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      const el = queryFirstAvailable(selectors);
      if (el) {
        resolve(el);
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        reject(new Error(`TIMEOUT_WAITING_FOR_ELEMENT: ${selectors.join(", ")}`));
        return;
      }

      setTimeout(check, 300);
    };

    check();
  });
}

export function waitForResultsStable(config: StableCheckConfig): Promise<void> {
  const {
    selectors,
    timeoutMs = 20000,
    intervalMs = 500,
    stableCountsRequired = 2,
  } = config;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let lastCount = -1;
    let consecutiveMatches = 0;

    const check = () => {
      const elements = queryAllAvailable(selectors);
      const currentCount = elements.length;

      if (currentCount > 0 && currentCount === lastCount) {
        consecutiveMatches++;
        if (consecutiveMatches >= stableCountsRequired) {
          resolve();
          return;
        }
      } else {
        consecutiveMatches = 0;
        lastCount = currentCount;
      }

      if (Date.now() - startTime >= timeoutMs) {
        if (currentCount > 0) {
          // 超时但已有部分结果，也算完成
          resolve();
        } else {
          reject(new Error("TIMEOUT_WAITING_FOR_STABLE_RESULTS"));
        }
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}

/** Scroll a progressively rendered flight list until its bottom has stopped growing. */
export async function scrollToCollectAllResults(
  selectors: string[],
  options: { timeoutMs?: number; stepPx?: number; pauseMs?: number; stableBottomRounds?: number } = {}
): Promise<void> {
  const {
    timeoutMs = 30000,
    stepPx = 760,
    pauseMs = 650,
    stableBottomRounds = 3,
  } = options;
  const startedAt = Date.now();
  let previousCount = queryAllAvailable(selectors).length;
  let previousHeight = document.documentElement.scrollHeight;
  let stableBottomCount = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: Math.min(maxScrollTop, window.scrollY + stepPx), behavior: "instant" });
    await new Promise((resolve) => setTimeout(resolve, pauseMs));

    const currentCount = queryAllAvailable(selectors).length;
    const currentHeight = document.documentElement.scrollHeight;
    const atBottom = window.scrollY >= currentHeight - window.innerHeight - 4;
    const unchanged = currentCount === previousCount && currentHeight === previousHeight;

    if (atBottom && unchanged) {
      stableBottomCount++;
      if (stableBottomCount >= stableBottomRounds) return;
    } else {
      stableBottomCount = 0;
    }

    previousCount = currentCount;
    previousHeight = currentHeight;
  }

  // Keep any flights collected before the timeout; callers will parse them and
  // surface the count instead of discarding an otherwise useful partial list.
}
