import { parsePriceText } from "@/core/pricing/price-parser";
import { generateId } from "@/shared/utils/id-generator";
import { FlightQuery, RoundTripFlightSegment, RoundTripPackageResult } from "@/shared/types/flight";
import { getCleanText } from "../base/dom-utils";

const MAX_OUTBOUND_CHOICES = 3;
const MAX_PACKAGES = 48;
const CARD_SELECTOR = ".flight-box, .flight-item.domestic, [data-testid^='flight-item-']";

export function isCtripNativeRoundTripPage(query: FlightQuery): boolean {
  if (query.tripType !== "roundtrip" || !query.returnDate) return false;
  const url = new URL(window.location.href);
  return /\/online\/list\/round-/i.test(url.pathname)
    && url.searchParams.get("depdate") === `${query.departureDate}_${query.returnDate}`;
}

/**
 * Ctrip exposes a return package as a two-step picker: select an outbound
 * candidate, then the return list labels its price as "往返总价".  We only
 * persist records from that second screen; no arithmetic is performed here.
 */
export async function collectCtripRoundTripPackages(
  query: FlightQuery,
  onUpdate: (packages: RoundTripPackageResult[], message: string) => Promise<void> | void
): Promise<RoundTripPackageResult[]> {
  if (!isCtripNativeRoundTripPage(query)) throw new Error("ROUNDTRIP_CONTEXT_MISMATCH");
  await waitFor(() => getCards().length > 0, 90000, "TIMEOUT_WAITING_FOR_OUTBOUND_OPTIONS");

  const packages = new Map<string, RoundTripPackageResult>();
  for (let outboundIndex = 0; outboundIndex < MAX_OUTBOUND_CHOICES && packages.size < MAX_PACKAGES; outboundIndex++) {
    await waitFor(() => isOutboundPhase() && getCards().length > outboundIndex, 20000, "OUTBOUND_OPTIONS_NOT_READY");
    const card = getCards()[outboundIndex];
    const outbound = parseSegment(card, query.departureDate);
    const selectButton = findButton(card, /选为去程/);
    if (!outbound || !selectButton) continue;

    selectButton.click();
    await waitFor(() => isInboundPhase() && getCards().length > 0, 30000, "TIMEOUT_WAITING_FOR_RETURN_OPTIONS");

    for (const inboundCard of getCards()) {
      const inbound = parseSegment(inboundCard, query.returnDate!);
      const packagePrice = parsePackagePrice(inboundCard);
      if (!inbound || !packagePrice) continue;
      const key = `${outbound.marketingFlightNumber}|${outbound.departureTime}|${inbound.marketingFlightNumber}|${inbound.departureTime}|${packagePrice.amount}`;
      if (packages.has(key)) continue;
      packages.set(key, {
        id: generateId("ctrip_roundtrip"), platform: "ctrip", resultScope: "roundtrip_package", outbound, inbound,
        displayedTotalPrice: packagePrice.amount, isStartingPrice: packagePrice.isStartingPrice,
        currency: "CNY", confidence: 92, collectedAt: new Date().toISOString(),
        sourceUrl: window.location.href, rawPriceText: packagePrice.rawText,
        warnings: packagePrice.rawText.includes("往返总价") ? [] : ["已从携程返程选择页读取套餐价格，请以订票页为准"],
      });
      if (packages.size >= MAX_PACKAGES) break;
    }

    await onUpdate([...packages.values()], `携程往返套餐：已核验${outboundIndex + 1}个去程候选，获得${packages.size}个套餐`);
    if (packages.size >= MAX_PACKAGES) break;
    const changeOutbound = findButton(document.body, /修改去程|重新选择去程/);
    if (!changeOutbound) break;
    changeOutbound.click();
    await waitFor(() => isOutboundPhase(), 20000, "RETURN_TO_OUTBOUND_FAILED");
  }

  return [...packages.values()];
}

function getCards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(CARD_SELECTOR)].filter((card) => card.offsetParent !== null);
}

function isOutboundPhase(): boolean {
  return /选择去程/.test(document.body.innerText) && Boolean(getCards().some((card) => findButton(card, /选为去程/)));
}

function isInboundPhase(): boolean {
  return /选择返程/.test(document.body.innerText) || Boolean(document.querySelector(".segment_tab_selected_flight"));
}

function findButton(root: ParentNode, pattern: RegExp): HTMLElement | undefined {
  return [...root.querySelectorAll<HTMLElement>("button, a, [role='button']")]
    .find((element) => pattern.test(getCleanText(element)) && element.offsetParent !== null);
}

function parseSegment(card: HTMLElement, date: string): RoundTripFlightSegment | undefined {
  const text = getCleanText(card);
  const marketingFlightNumber = getCleanText(card.querySelector(".flight-airline .plane-No"))
    .match(/[A-Z0-9]{2}\d{3,4}/i)?.[0]?.toUpperCase()
    || [...card.querySelectorAll<HTMLElement>("[id^='airlineName']")]
      .map((element) => element.id.match(/([A-Z0-9]{2}\d{3,4})/i)?.[1]?.toUpperCase()).find(Boolean)
    || "待确认航班号";
  const airline = getCleanText(card.querySelector(".flight-airline .airline-name")) || "待确认航空公司";
  const departureTime = getCleanText(card.querySelector(".depart-box .time"));
  const arrivalTime = getCleanText(card.querySelector(".arrive-box .time"));
  const departureAirport = getCleanText(card.querySelector(".depart-box .airport"));
  const arrivalAirport = getCleanText(card.querySelector(".arrive-box .airport"));
  if (!departureTime || !arrivalTime || !departureAirport || !arrivalAirport) return undefined;
  return { marketingFlightNumber, airline, departureDate: date, departureTime, arrivalTime, departureAirport, arrivalAirport, direct: !/经停|中转|转\d+次/.test(text) };
}

function parsePackagePrice(card: HTMLElement): { amount: number; rawText: string; isStartingPrice: boolean } | undefined {
  const scope = card.querySelector(".flight-operate") || card;
  const rawText = getCleanText(scope);
  if (!/往返总价/.test(rawText)) return undefined;
  const priceText = getCleanText(scope.querySelector(".flight-price .price")) || rawText;
  const parsed = parsePriceText(priceText);
  return parsed.amount ? { amount: parsed.amount, rawText, isStartingPrice: parsed.isStartingPrice } : undefined;
}

async function waitFor(check: () => boolean, timeoutMs: number, errorCode: string): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(errorCode);
}
