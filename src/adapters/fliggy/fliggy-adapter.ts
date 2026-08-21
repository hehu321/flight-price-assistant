import { PlatformAdapter } from "../base/platform-adapter";
import { FlightQuery, FlightResult, PlatformRawFlightResult, SupportedPlatform } from "@/shared/types/flight";
import { AdapterDiagnosticReport, BlockingState, SearchContextValidation } from "@/shared/types/platform";
import { FLIGGY_CONFIG } from "./fliggy-config";
import { buildFliggySearchUrl } from "./fliggy-url-builder";
import { fillFliggyForm } from "./fliggy-form-filler";
import { detectFliggyBlocking } from "./fliggy-blocking-detector";
import { validateFliggyContext } from "./fliggy-context-parser";
import { extractFliggyFlights } from "./fliggy-flight-parser";
import { verifyFliggyPrice } from "./fliggy-price-verifier";
import { waitForResultsStable } from "../base/page-stability";
import { fliggySelectors } from "./fliggy-selectors";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { chooseClosestPricedControl, clickControl, findBookingControl, findFlightCard, waitForElement } from "../base/booking";

export class FliggyAdapter implements PlatformAdapter {
  id: SupportedPlatform = "fliggy";
  name: string = "飞猪旅行";
  private activeQuery?: FlightQuery;

  matches(url: string): boolean {
    return FLIGGY_CONFIG.domains.some((d) => url.toLowerCase().includes(d.toLowerCase()));
  }

  buildSearchUrl(query: FlightQuery): string | null {
    return buildFliggySearchUrl(query);
  }

  async fillSearchForm(query: FlightQuery): Promise<void> {
    await fillFliggyForm(query);
  }

  shouldSubmitSearch(query?: FlightQuery): boolean {
    // International URLs above are already the platform's canonical search
    // result URLs.  Do not try to fill the domestic page form after a redirect.
    if (query?.market === "international_hmt") return false;
    return queryAllAvailable(fliggySelectors.flightCard).length === 0
      && !!queryFirstAvailable(fliggySelectors.searchButton);
  }

  async detectBlockingState(): Promise<BlockingState> {
    return detectFliggyBlocking();
  }

  async waitForResults(): Promise<void> {
    await waitForResultsStable({
      selectors: fliggySelectors.flightCard,
      timeoutMs: 60000,
      intervalMs: 800,
      stableCountsRequired: 3,
    });
  }

  async validateSearchContext(query: FlightQuery): Promise<SearchContextValidation> {
    this.activeQuery = query;
    return validateFliggyContext(query);
  }

  async extractFlights(): Promise<PlatformRawFlightResult[]> {
    return extractFliggyFlights(this.activeQuery);
  }

  async verifyPrice(flight: FlightResult): Promise<FlightResult> {
    return verifyFliggyPrice(flight);
  }

  async diagnose(): Promise<AdapterDiagnosticReport> {
    const cards = queryAllAvailable(fliggySelectors.flightCard);
    return {
      platformId: "fliggy",
      currentUrl: window.location.href,
      matchedUrlPattern: this.matches(window.location.href),
      pageType: cards.length > 0 ? "results" : "unknown",
      selectorsMatched: {
        flightCard: cards.length > 0,
        price: !!queryFirstAvailable(fliggySelectors.price),
      },
      missingSelectors: [],
      detectedFlightCardsCount: cards.length,
      successfulPriceExtractionsCount: cards.length,
      failedPriceExtractionsCount: 0,
      adapterVersion: "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }

  async openBooking(flight: FlightResult): Promise<boolean> {
    const card = findFlightCard(flight, fliggySelectors.flightCard);
    if (!card) return false;

    // The card-level button reveals seller/fare rows.  A row-level “订” then
    // creates the per-session fbuy.fliggy.com confirmation URL.
    const firstStep = card.querySelector<HTMLElement>(".J_SelectFlight")
      || findBookingControl(card, /^订票$/);
    if (!clickControl(firstStep || undefined)) return false;

    const reserve = await waitForElement(() => {
      const controls = Array.from(card.querySelectorAll<HTMLElement>(".J_Reserve, .select-btn"))
        .filter((control) => (control.innerText || control.textContent || "").trim() === "订");
      return chooseClosestPricedControl(controls, flight.displayedPrice);
    }, 7000);
    return clickControl(reserve);
  }
}
