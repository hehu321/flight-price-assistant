import { PlatformAdapter } from "../base/platform-adapter";
import { FlightQuery, FlightResult, PlatformRawFlightResult, SupportedPlatform } from "@/shared/types/flight";
import { AdapterDiagnosticReport, BlockingState, SearchContextValidation } from "@/shared/types/platform";
import { CTRIP_CONFIG } from "./ctrip-config";
import { buildCtripSearchUrl } from "./ctrip-url-builder";
import { fillCtripForm } from "./ctrip-form-filler";
import { detectCtripBlocking } from "./ctrip-blocking-detector";
import { validateCtripContext } from "./ctrip-context-parser";
import { verifyCtripPrice } from "./ctrip-price-verifier";
import { scrollToCollectAllResults, waitForResultsStable } from "../base/page-stability";
import { ctripSelectors } from "./ctrip-selectors";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { extractCtripFlights } from "./ctrip-flight-parser";
import { clickControl, findBookingControl, findFlightCard, waitForElement } from "../base/booking";

export class CtripAdapter implements PlatformAdapter {
  id: SupportedPlatform = "ctrip";
  name: string = "携程旅行";

  matches(url: string): boolean {
    return CTRIP_CONFIG.domains.some((d) => url.toLowerCase().includes(d.toLowerCase()));
  }

  buildSearchUrl(query: FlightQuery): string | null {
    return buildCtripSearchUrl(query);
  }

  async fillSearchForm(query: FlightQuery): Promise<void> {
    await fillCtripForm(query);
  }

  async detectBlockingState(): Promise<BlockingState> {
    return detectCtripBlocking();
  }

  async waitForResults(): Promise<void> {
    await waitForResultsStable({
      selectors: ctripSelectors.flightCard,
      timeoutMs: 60000,
      intervalMs: 800,
      stableCountsRequired: 3,
    });
  }

  async prepareForExtraction(): Promise<void> {
    await scrollToCollectAllResults(ctripSelectors.flightCard);
  }

  async collectIncrementally(onUpdate: (results: FlightResult[], message: string) => Promise<void> | void): Promise<PlatformRawFlightResult[]> {
    const startedAt = Date.now();
    // Live Ctrip pages can finish their first render after 90 seconds.  Keep
    // waiting for the first observable card, while reporting that state to the
    // side panel instead of failing before the page has actually rendered.
    const initialResultsTimeoutMs = 180000;
    const collectionTimeoutMs = 240000;
    const seen = new Map<string, PlatformRawFlightResult>();
    let scrollRounds = 0;
    let lastWaitingReportAt = 0;
    let lastGrowthAt = startedAt;
    // Ctrip commonly reveals only the first screen (seven rows in the live
    // page) before it reacts to a visible-page scroll.  A few 800ms checks at
    // the current bottom are not evidence that the whole list is complete.
    const stableAfterLastGrowthMs = 15000;
    const minimumScrollRounds = 6;

    while (Date.now() - startedAt < collectionTimeoutMs) {
      const rawResults = await extractCtripFlights();
      let changed = false;
      for (const result of rawResults) {
        const flight = result.parsedResult;
        if (!flight) continue;
        const key = `${flight.marketingFlightNumber}|${flight.departureTime}|${flight.arrivalTime}|${flight.displayedPrice}`;
        if (!seen.has(key)) {
          seen.set(key, result);
          changed = true;
        }
      }

      if (changed) {
        lastGrowthAt = Date.now();
        await onUpdate(
          [...seen.values()].map((item) => item.parsedResult!).filter(Boolean),
          `正在采集：已获取${seen.size}条航班，已滚动${scrollRounds}次`
        );
      } else if (seen.size === 0 && Date.now() - lastWaitingReportAt >= 8000) {
        lastWaitingReportAt = Date.now();
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        await onUpdate([], `页面仍在加载，等待首批航班（已等待${elapsedSeconds}秒）`);
      }

      const height = document.documentElement.scrollHeight;
      const atBottom = window.scrollY >= height - window.innerHeight - 4;
      const stableForMs = Date.now() - lastGrowthAt;
      if (seen.size > 0 && atBottom && scrollRounds >= minimumScrollRounds && stableForMs >= stableAfterLastGrowthMs) {
        return [...seen.values()];
      }

      window.scrollTo({ top: Math.min(height, window.scrollY + 760), behavior: "instant" });
      scrollRounds++;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (seen.size === 0 && Date.now() - startedAt >= initialResultsTimeoutMs) break;
    }

    if (seen.size > 0) return [...seen.values()];
    throw new Error("TIMEOUT_WAITING_FOR_INITIAL_RESULTS");
  }

  async openBooking(flight: FlightResult): Promise<boolean> {
    const card = findFlightCard(flight, ctripSelectors.flightCard);
    if (!card) return false;

    // Ctrip's result-card "订票" only expands fare rows.  The actual order
    // session is created by the second "预订" action inside the expanded card.
    const firstStep = findBookingControl(card, /^订票/);
    if (!clickControl(firstStep)) return false;

    const fareBooking = await waitForElement(() => findBookingControl(card, /^预订$/), 7000);
    return clickControl(fareBooking);
  }

  async validateSearchContext(query: FlightQuery): Promise<SearchContextValidation> {
    return validateCtripContext(query);
  }

  async extractFlights(): Promise<PlatformRawFlightResult[]> {
    return extractCtripFlights();
  }

  async verifyPrice(flight: FlightResult): Promise<FlightResult> {
    return verifyCtripPrice(flight);
  }

  async diagnose(): Promise<AdapterDiagnosticReport> {
    const cards = queryAllAvailable(ctripSelectors.flightCard);
    return {
      platformId: "ctrip",
      currentUrl: window.location.href,
      matchedUrlPattern: this.matches(window.location.href),
      pageType: cards.length > 0 ? "results" : "unknown",
      selectorsMatched: {
        flightCard: cards.length > 0,
        price: !!queryFirstAvailable(ctripSelectors.price),
      },
      missingSelectors: [],
      detectedFlightCardsCount: cards.length,
      successfulPriceExtractionsCount: cards.length,
      failedPriceExtractionsCount: 0,
      adapterVersion: "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }
}
