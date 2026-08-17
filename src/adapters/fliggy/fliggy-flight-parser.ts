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
    const marketingFlightNumber = flightNumMatch ? flightNumMatch[1] : rawFlightNumberText || "待确认航班号";
    const airline = rawFlightNumberText.replace(flightNumMatch?.[1] || "", "").trim() || "待确认航空公司";
    const departureDate = new URL(window.location.href).searchParams.get("depDate");
    const departureTime = getCleanText(depTimeEl);
    const arrivalTime = getCleanText(arrTimeEl);
    const departureAirport = getCleanText(depAirEl);
    const arrivalAirport = getCleanText(arrAirEl);
    if (!departureDate || !departureTime || !arrivalTime || !departureAirport || !arrivalAirport) continue;
    const warnings = [...parsedPrice.warnings];
    if (!flightNumMatch) warnings.push("未能从飞猪卡片提取标准航班号");
    if (airline === "待确认航空公司") warnings.push("未能从飞猪卡片提取航空公司");

    const parsedResult: FlightResult = {
      id: generateId("fliggy_flight"),
      platform: "fliggy",
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
      priceType: parsedPrice.priceType === "unknown" && rawCardText.includes("会员") ? "member" : parsedPrice.priceType,
      isStartingPrice: parsedPrice.isStartingPrice,
      currency: "CNY",
      queryContextValid: true,
      confidence: flightNumMatch && airline !== "待确认航空公司" ? 82 : 68,
      collectedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      rawPriceText,
      warnings,
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
