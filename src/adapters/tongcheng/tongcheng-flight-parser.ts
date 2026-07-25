import { parsePriceText } from "@/core/pricing/price-parser";
import { FlightResult, PlatformRawFlightResult } from "@/shared/types/flight";
import { generateId } from "@/shared/utils/id-generator";
import { getCleanText } from "../base/dom-utils";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { tongchengSelectors } from "./tongcheng-selectors";

export async function extractTongchengFlights(): Promise<PlatformRawFlightResult[]> {
  return queryAllAvailable(tongchengSelectors.flightCard).flatMap((card) => {
    const rawCardText = card.textContent || "";
    const rawFlightNumberText = getCleanText(queryFirstAvailable(tongchengSelectors.flightNumber, card));
    const rawPriceText = getCleanText(queryFirstAvailable(tongchengSelectors.price, card));
    const parsedPrice = parsePriceText(rawPriceText);
    const flightMatch = rawFlightNumberText.match(/([A-Z]{2}\d{3,4})/i);
    if (!flightMatch || !parsedPrice.amount) return [];

    const marketingFlightNumber = flightMatch[1].toUpperCase();
    const airline = rawFlightNumberText.replace(flightMatch[0], "").trim() || "待确认航空公司";
    const departureAirport = getCleanText(queryFirstAvailable(tongchengSelectors.departureAirport, card));
    const arrivalAirport = getCleanText(queryFirstAvailable(tongchengSelectors.arrivalAirport, card));
    const rawRouteText = `${departureAirport} -> ${arrivalAirport}`;
    const date = new URL(window.location.href).searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const parsedResult: FlightResult = {
      id: generateId("tongcheng_flight"),
      platform: "tongcheng",
      marketingFlightNumber,
      airline,
      departureDate: date,
      departureTime: getCleanText(queryFirstAvailable(tongchengSelectors.departureTime, card)),
      arrivalTime: getCleanText(queryFirstAvailable(tongchengSelectors.arrivalTime, card)),
      arrivesNextDay: /\+1天|次日/.test(rawCardText),
      departureAirport,
      arrivalAirport,
      direct: !/经停|中转|转机/.test(rawCardText),
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
      confidence: 95,
      collectedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      rawPriceText,
      warnings: parsedPrice.warnings,
    };
    return [{ platform: "tongcheng" as const, rawCardText, rawPriceText, rawFlightNumberText, rawRouteText, parsedResult, warnings: [] }];
  });
}
