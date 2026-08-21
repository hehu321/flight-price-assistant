import { FlightQuery, FlightResult, PlatformRawFlightResult } from "@/shared/types/flight";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { ctripSelectors } from "./ctrip-selectors";
import { getCleanText } from "../base/dom-utils";
import { parsePriceText } from "@/core/pricing/price-parser";
import { generateId } from "@/shared/utils/id-generator";

export async function extractCtripFlights(query?: FlightQuery): Promise<PlatformRawFlightResult[]> {
  const cards = queryAllAvailable(ctripSelectors.flightCard);
  const rawResults: PlatformRawFlightResult[] = [];

  for (const card of cards) {
    const rawCardText = card.textContent || "";

    const numEl = queryFirstAvailable(ctripSelectors.flightNumber, card);
    const depTimeEl = queryFirstAvailable(ctripSelectors.departureTime, card);
    const arrTimeEl = queryFirstAvailable(ctripSelectors.arrivalTime, card);
    const depAirEl = queryFirstAvailable(ctripSelectors.departureAirport, card);
    const arrAirEl = queryFirstAvailable(ctripSelectors.arrivalAirport, card);
    const priceEl = queryFirstAvailable(ctripSelectors.price, card);

    const visibleFlightText = getCleanText(numEl);
    const idFlightNumbers = Array.from(card.querySelectorAll('[id^="airlineName"], [id^="comfort-"]'))
      .map((element) => element.id.match(/(?:airlineName|comfort-)([A-Z0-9]{2}\d{3,4})/i)?.[1]?.toUpperCase())
      .filter((value): value is string => Boolean(value));
    const visibleFlightNumber = visibleFlightText.match(/([A-Z0-9]{2}\d{3,4})/i)?.[1]?.toUpperCase();
    const marketingFlightNumber = visibleFlightNumber || idFlightNumbers[0];
    const rawFlightNumberText = marketingFlightNumber
      ? `${marketingFlightNumber} ${visibleFlightText}`.trim()
      : visibleFlightText;
    const rawPriceText = getCleanText(priceEl);
    const rawRouteText = `${getCleanText(depAirEl)} -> ${getCleanText(arrAirEl)}`;

    const parsedPrice = parsePriceText(rawPriceText);

    // 某些携程卡片只显示航空公司；真实航班号保存在 airlineName/comfort 的 id 中。
    const airline = getCleanText(card.querySelector(".flight-airline .airline-name"))
      || getCleanText(card.querySelector(".flight-airline .airline-item .airline-name"))
      || "航空公司";
    const warnings = [...parsedPrice.warnings];
    if (!marketingFlightNumber) warnings.push("未能从携程卡片提取标准航班号");
    const departureDate = query?.departureDate || new URL(window.location.href).searchParams.get("depdate")
      || new URL(window.location.href).searchParams.get("depDate");
    const departureTime = getCleanText(depTimeEl);
    const arrivalTime = getCleanText(arrTimeEl);
    const departureAirport = getCleanText(depAirEl);
    const arrivalAirport = getCleanText(arrAirEl);

    // Do not manufacture a price, date or route if the platform changes its
    // markup.  A partial card can still be diagnosed, but it must never enter
    // comparisons or the local price history as a fabricated observation.
    if (!parsedPrice.amount || !departureDate || !departureTime || !arrivalTime || !departureAirport || !arrivalAirport) {
      continue;
    }

    const parsedResult: FlightResult = {
      id: generateId("ctrip_flight"),
      platform: "ctrip",
      marketingFlightNumber: marketingFlightNumber || "待确认航班号",
      airline,
      departureDate,
      departureTime,
      arrivalTime,
      arrivesNextDay: rawCardText.includes("+1天") || rawCardText.includes("次日"),
      departureAirport,
      arrivalAirport,
      direct: !/经停|中转|转\d+次/.test(rawCardText),
      segments: [{ marketingFlightNumber: marketingFlightNumber || "待确认航班号", airline, departureDate, departureTime, arrivalTime, departureAirport, arrivalAirport }],
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
      currency: parsedPrice.currency,
      market: query?.market === "international_hmt" || /international/i.test(window.location.href) || /出入境提醒|国际机票/.test(document.body.innerText || "") ? "international_hmt" : undefined,
      priceUnit: "per_traveller",
      queryContextValid: true,
      confidence: 90,
      collectedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      rawPriceText,
      warnings,
    };

    rawResults.push({
      platform: "ctrip",
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
