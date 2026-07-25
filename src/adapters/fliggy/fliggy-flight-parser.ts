import { FlightResult, PlatformRawFlightResult } from "@/shared/types/flight";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { fliggySelectors } from "./fliggy-selectors";
import { getCleanText } from "../base/dom-utils";
import { parsePriceText } from "@/core/pricing/price-parser";
import { generateId } from "@/shared/utils/id-generator";

export async function extractFliggyFlights(): Promise<PlatformRawFlightResult[]> {
  const cards = queryAllAvailable(fliggySelectors.flightCard);
  const rawResults: PlatformRawFlightResult[] = [];

  for (const card of cards) {
    const rawCardText = card.textContent || "";

    const numEl = queryFirstAvailable(fliggySelectors.flightNumber, card);
    const depTimeEl = queryFirstAvailable(fliggySelectors.departureTime, card);
    const arrTimeEl = queryFirstAvailable(fliggySelectors.arrivalTime, card);
    const depAirEl = queryFirstAvailable(fliggySelectors.departureAirport, card);
    const arrAirEl = queryFirstAvailable(fliggySelectors.arrivalAirport, card);
    const priceEl = queryFirstAvailable(fliggySelectors.price, card);

    const rawFlightNumberText = getCleanText(numEl);
    const rawPriceText = getCleanText(priceEl);
    const rawRouteText = `${getCleanText(depAirEl)} -> ${getCleanText(arrAirEl)}`;

    const parsedPrice = parsePriceText(rawPriceText);

    // A real result card must carry a public fare.  Do not invent a fallback
    // price when a selector stops matching after a site change.
    if (parsedPrice.amount === undefined) continue;

    const flightNumMatch = rawFlightNumberText.match(/([A-Z0-9]{2}\d{3,4})/);
    const marketingFlightNumber = flightNumMatch ? flightNumMatch[1] : rawFlightNumberText;
    const airline = rawFlightNumberText.replace(marketingFlightNumber, "").trim() || "中国国航";

    const parsedResult: FlightResult = {
      id: generateId("fliggy_flight"),
      platform: "fliggy",
      marketingFlightNumber,
      airline,
      departureDate: new URL(window.location.href).searchParams.get("depDate") || new Date().toISOString().split("T")[0],
      departureTime: getCleanText(depTimeEl),
      arrivalTime: getCleanText(arrTimeEl),
      arrivesNextDay: rawCardText.includes("+1天") || rawCardText.includes("次日"),
      departureAirport: getCleanText(depAirEl),
      arrivalAirport: getCleanText(arrAirEl),
      direct: !rawCardText.includes("经停"),
      displayedPrice: parsedPrice.amount,
      airportConstructionFee: parsedPrice.airportConstructionFee,
      fuelSurcharge: parsedPrice.fuelSurcharge,
      taxAmount: parsedPrice.taxAmount,
      mandatoryFee: parsedPrice.mandatoryFee,
      totalPrice: parsedPrice.totalAmount,
      priceDisclosure: parsedPrice.priceDisclosure,
      includesTax: parsedPrice.includesTax,
      priceType: parsedPrice.priceType === "unknown" && rawCardText.includes("会员") ? "member" : parsedPrice.priceType,
      isStartingPrice: parsedPrice.isStartingPrice,
      currency: "CNY",
      queryContextValid: true,
      confidence: 82,
      collectedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      rawPriceText,
      warnings: parsedPrice.warnings,
    };

    rawResults.push({
      platform: "fliggy",
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
