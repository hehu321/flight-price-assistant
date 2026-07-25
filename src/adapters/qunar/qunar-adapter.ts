import { PlatformAdapter } from "../base/platform-adapter";
import { FlightQuery, FlightResult, PlatformRawFlightResult, SupportedPlatform } from "@/shared/types/flight";
import { AdapterDiagnosticReport, BlockingState, SearchContextValidation } from "@/shared/types/platform";
import { QUNAR_CONFIG } from "./qunar-config";
import { buildQunarSearchUrl } from "./qunar-url-builder";
import { fillQunarForm } from "./qunar-form-filler";
import { detectQunarBlocking } from "./qunar-blocking-detector";
import { validateQunarContext } from "./qunar-context-parser";
import { extractQunarFlights } from "./qunar-flight-parser";
import { verifyQunarPrice } from "./qunar-price-verifier";
import { waitForResultsStable } from "../base/page-stability";
import { qunarSelectors } from "./qunar-selectors";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { chooseClosestPricedControl, clickControl, findFlightCard, waitForElement } from "../base/booking";

export class QunarAdapter implements PlatformAdapter {
  id: SupportedPlatform = "qunar";
  name: string = "去哪儿旅行";

  matches(url: string): boolean {
    return QUNAR_CONFIG.domains.some((d) => url.toLowerCase().includes(d.toLowerCase()));
  }

  buildSearchUrl(query: FlightQuery): string | null {
    return buildQunarSearchUrl(query);
  }

  async fillSearchForm(query: FlightQuery): Promise<void> {
    await fillQunarForm(query);
  }

  async detectBlockingState(): Promise<BlockingState> {
    return detectQunarBlocking();
  }

  async waitForResults(): Promise<void> {
    await waitForResultsStable({
      selectors: qunarSelectors.flightCard,
      timeoutMs: 60000,
      intervalMs: 800,
      stableCountsRequired: 3,
    });
  }

  async validateSearchContext(query: FlightQuery): Promise<SearchContextValidation> {
    return validateQunarContext(query);
  }

  async extractFlights(): Promise<PlatformRawFlightResult[]> {
    return extractQunarFlights();
  }

  async verifyPrice(flight: FlightResult): Promise<FlightResult> {
    return verifyQunarPrice(flight);
  }

  async diagnose(): Promise<AdapterDiagnosticReport> {
    const cards = queryAllAvailable(qunarSelectors.flightCard);
    return {
      platformId: "qunar",
      currentUrl: window.location.href,
      matchedUrlPattern: this.matches(window.location.href),
      pageType: cards.length > 0 ? "results" : "unknown",
      selectorsMatched: {
        flightCard: cards.length > 0,
        price: !!queryFirstAvailable(qunarSelectors.price),
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
    const card = findFlightCard(flight, qunarSelectors.flightCard);
    if (!card) return false;

    let detail = findQunarBookingDetail(card);
    if (!detail) {
      const priceControl = card.querySelector(".col-price") as HTMLElement | null;
      if (!clickControl(priceControl || undefined)) return false;
      detail = await waitForElement(() => findQunarBookingDetail(card), 5000);
    }
    if (!detail) return false;

    // Qunar has changed the final orange action's class several times
    // (.btn-book, .btn-order, and plain links all occur in live pages).
    // Match the user-visible action text inside this flight's own OTA detail
    // rather than relying on a single historical class name.
    const controls = await waitForElement(() => findQunarBookingControls(detail)[0], 7000)
      .then(() => findQunarBookingControls(detail));
    return clickControl(chooseClosestPricedControl(controls, flight.displayedPrice));
  }
}

function findQunarBookingDetail(card: Element): Element | undefined {
  let sibling = card.nextElementSibling;
  // The detail is inserted immediately after its flight card.  Stop when the
  // next card starts so we never use another flight's “预订” control.
  while (sibling && !sibling.matches(qunarSelectors.flightCard.join(","))) {
    if (sibling.matches(qunarSelectors.bookingDetail.join(","))) return sibling;
    sibling = sibling.nextElementSibling;
  }
  return undefined;
}

export function findQunarBookingControls(detail: Element): HTMLElement[] {
  const selectors = [...qunarSelectors.bookingButton, '[role="button"]'].join(",");
  return Array.from(detail.querySelectorAll<HTMLElement>(selectors)).filter((control) => {
    const text = (control.innerText || control.textContent || "").trim();
    const disabled = control.matches("[disabled], .disabled, [aria-disabled='true']");
    return !disabled && /^(预订|订票|去预订|立即预订)$/.test(text);
  });
}
