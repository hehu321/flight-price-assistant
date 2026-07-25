import { FlightResult, PlatformRawFlightResult } from "@/shared/types/flight";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { qunarSelectors } from "./qunar-selectors";
import { getCleanText } from "../base/dom-utils";
import { parsePriceText } from "@/core/pricing/price-parser";
import { generateId } from "@/shared/utils/id-generator";

export async function extractQunarFlights(): Promise<PlatformRawFlightResult[]> {
  const cards = queryAllAvailable(qunarSelectors.flightCard);
  const rawResults: PlatformRawFlightResult[] = [];

  for (const card of cards) {
    const rawCardText = card.textContent || "";

    const numEl = queryFirstAvailable(qunarSelectors.flightNumber, card);
    const depTimeEl = queryFirstAvailable(qunarSelectors.departureTime, card);
    const arrTimeEl = queryFirstAvailable(qunarSelectors.arrivalTime, card);
    const depAirEl = queryFirstAvailable(qunarSelectors.departureAirport, card);
    const arrAirEl = queryFirstAvailable(qunarSelectors.arrivalAirport, card);
    const priceEl = queryFirstAvailable(qunarSelectors.price, card);

    const rawFlightNumberText = getCleanText(numEl);
    const rawPriceText = priceEl?.getAttribute("aria-label") || getCleanText(priceEl);
    const rawRouteText = `${getCleanText(depAirEl)} -> ${getCleanText(arrAirEl)}`;

    const parsedPrice = parsePriceText(rawPriceText);

    const flightNumMatch = rawFlightNumberText.match(/([A-Z0-9]{2}\d{3,4})/);
    const marketingFlightNumber = flightNumMatch ? flightNumMatch[1] : rawFlightNumberText;
    const airline = extractQunarAirline(card) || "待确认航空公司";
    const departureTime = getCleanText(depTimeEl);
    const arrivalTime = getCleanText(arrTimeEl);
    const departureAirport = getCleanText(depAirEl);
    const arrivalAirport = getCleanText(arrAirEl);
    const departureDate = new URL(window.location.href).searchParams.get("searchDepartureTime");

    if (!parsedPrice.amount || !departureDate || !departureTime || !arrivalTime || !departureAirport || !arrivalAirport) {
      continue;
    }

    const parsedResult: FlightResult = {
      id: generateId("qunar_flight"),
      platform: "qunar",
      marketingFlightNumber,
      airline,
      departureDate,
      departureTime,
      arrivalTime,
      arrivesNextDay: rawCardText.includes("+1天") || rawCardText.includes("次日"),
      departureAirport,
      arrivalAirport,
      direct: !rawCardText.includes("经停"),
      displayedPrice: parsedPrice.amount,
      airportConstructionFee: parsedPrice.airportConstructionFee,
      fuelSurcharge: parsedPrice.fuelSurcharge,
      taxAmount: parsedPrice.taxAmount,
      mandatoryFee: parsedPrice.mandatoryFee,
      totalPrice: parsedPrice.totalAmount,
      priceDisclosure: parsedPrice.priceDisclosure,
      includesTax: parsedPrice.includesTax,
      priceType: parsedPrice.priceType,
      isStartingPrice: parsedPrice.isStartingPrice,
      currency: "CNY",
      queryContextValid: true,
      confidence: 96,
      collectedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      rawPriceText,
      warnings: parsedPrice.warnings,
    };

    rawResults.push({
      platform: "qunar",
      rawCardText,
      rawPriceText,
      rawFlightNumberText,
      rawRouteText,
      parsedResult,
      warnings: [],
    });
  }

  return rawResults;
}

function extractQunarAirline(card: Element): string {
  const name = getCleanText(queryFirstAvailable(qunarSelectors.airlineName, card));
  if (name) return name;

  const logo = queryFirstAvailable(qunarSelectors.airlineLogo, card);
  return logo?.getAttribute("alt")?.trim()
    || logo?.getAttribute("title")?.trim()
    || "";
}
