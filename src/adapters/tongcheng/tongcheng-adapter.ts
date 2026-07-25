import { AdapterDiagnosticReport, BlockingState, SearchContextValidation } from "@/shared/types/platform";
import { FlightQuery, FlightResult, PlatformRawFlightResult, SupportedPlatform } from "@/shared/types/flight";
import { chooseClosestPricedControl, clickControl, findFlightCard, waitForElement } from "../base/booking";
import { PlatformAdapter } from "../base/platform-adapter";
import { scrollToCollectAllResults, waitForResultsStable } from "../base/page-stability";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { detectTongchengBlocking } from "./tongcheng-blocking-detector";
import { validateTongchengContext } from "./tongcheng-context-parser";
import { extractTongchengFlights } from "./tongcheng-flight-parser";
import { verifyTongchengPrice } from "./tongcheng-price-verifier";
import { tongchengSelectors } from "./tongcheng-selectors";
import { buildTongchengSearchUrl } from "./tongcheng-url-builder";

export class TongchengAdapter implements PlatformAdapter {
  id: SupportedPlatform = "tongcheng";
  name = "同程旅行";

  matches(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      if (hostname === "ly.com" || hostname.endsWith(".ly.com")) return true;
      return (hostname === "localhost" || hostname === "127.0.0.1") && new URL(url).port === "3004";
    } catch {
      return false;
    }
  }

  buildSearchUrl(query: FlightQuery): string | null { return buildTongchengSearchUrl(query); }
  async detectBlockingState(): Promise<BlockingState> { return detectTongchengBlocking(); }

  async waitForResults(): Promise<void> {
    await waitForResultsStable({ selectors: tongchengSelectors.flightCard, timeoutMs: 60000, intervalMs: 700, stableCountsRequired: 3 });
  }

  async prepareForExtraction(): Promise<void> {
    await scrollToCollectAllResults(tongchengSelectors.flightCard, { timeoutMs: 45000, stepPx: 820, pauseMs: 650, stableBottomRounds: 3 });
  }

  async validateSearchContext(query: FlightQuery): Promise<SearchContextValidation> { return validateTongchengContext(query); }
  async extractFlights(): Promise<PlatformRawFlightResult[]> { return extractTongchengFlights(); }
  async verifyPrice(flight: FlightResult): Promise<FlightResult> { return verifyTongchengPrice(flight); }

  async diagnose(): Promise<AdapterDiagnosticReport> {
    const cards = queryAllAvailable(tongchengSelectors.flightCard);
    return {
      platformId: "tongcheng", currentUrl: window.location.href, matchedUrlPattern: this.matches(window.location.href),
      pageType: cards.length ? "results" : "unknown",
      selectorsMatched: { flightCard: cards.length > 0, price: !!queryFirstAvailable(tongchengSelectors.price) },
      missingSelectors: [], detectedFlightCardsCount: cards.length, successfulPriceExtractionsCount: cards.length,
      failedPriceExtractionsCount: 0, adapterVersion: "0.1.0", timestamp: new Date().toISOString(),
    };
  }

  async openBooking(flight: FlightResult): Promise<boolean> {
    const card = findFlightCard(flight, tongchengSelectors.flightCard);
    if (!card) return false;
    let controls = bookingControls(card);
    if (!controls.length) {
      const expand = queryFirstAvailable(tongchengSelectors.expandFareButton, card) as HTMLElement | undefined;
      if (!clickControl(expand)) return false;
      controls = await waitForElement(() => bookingControls(card)[0], 5000).then(() => bookingControls(card));
    }
    return clickControl(chooseClosestPricedControl(controls, flight.displayedPrice));
  }
}

function bookingControls(card: Element): HTMLElement[] {
  const selector = tongchengSelectors.fareBookingButton.join(",");
  return Array.from(card.querySelectorAll<HTMLElement>(selector)).filter((element) => /预订|订票/.test(element.innerText || element.textContent || ""));
}
