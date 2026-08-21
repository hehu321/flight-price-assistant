import { FlightQuery, FlightResult, PlatformRawFlightResult } from "@/shared/types/flight";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { fliggySelectors } from "./fliggy-selectors";
import { getCleanText } from "../base/dom-utils";
import { parsePriceText } from "@/core/pricing/price-parser";
import { generateId } from "@/shared/utils/id-generator";

export async function extractFliggyFlights(query?: FlightQuery): Promise<PlatformRawFlightResult[]> {
  const international = isInternationalResult(query);
  const cards = queryAllAvailable(international ? fliggySelectors.internationalFlightCard : fliggySelectors.flightCard);
  const rawResults: PlatformRawFlightResult[] = [];

  for (const card of cards) {
    const rawCardText = card.textContent || "";

    const numEl = queryFirstAvailable(international ? fliggySelectors.internationalFlightHeadline : fliggySelectors.flightNumber, card);
    const depTimeEl = queryFirstAvailable(international ? fliggySelectors.internationalDepartureTime : fliggySelectors.departureTime, card);
    const arrTimeEl = queryFirstAvailable(international ? fliggySelectors.internationalArrivalTime : fliggySelectors.arrivalTime, card);
    const depAirEl = queryFirstAvailable(international ? fliggySelectors.internationalDepartureAirport : fliggySelectors.departureAirport, card);
    const arrAirEl = queryFirstAvailable(international ? fliggySelectors.internationalArrivalAirport : fliggySelectors.arrivalAirport, card);
    const priceEl = queryFirstAvailable(international ? fliggySelectors.internationalPrice : fliggySelectors.price, card);

    const rawFlightNumberText = getCleanText(numEl);
    // 国际页的价格数字和“含税总价”是相邻节点：数字必须放在前面，
    // 避免旧价/优惠价成为解析出的第一笔金额，同时保留含税语义。
    const rawPriceText = international
      ? `${getCleanText(priceEl)} ${getCleanText(queryFirstAvailable(fliggySelectors.internationalPriceContext, card))}`.trim()
      : getCleanText(priceEl);
    const rawRouteText = `${getCleanText(depAirEl)} -> ${getCleanText(arrAirEl)}`;

    const parsedPrice = parsePriceText(rawPriceText);

    // A real result card must carry a public fare.  Do not invent a fallback
    // price when a selector stops matching after a site change.
    if (parsedPrice.amount === undefined) continue;

    const flightNumMatch = rawFlightNumberText.match(/([A-Z0-9]{2}\d{3,4})/);
    const marketingFlightNumber = flightNumMatch ? flightNumMatch[1] : rawFlightNumberText || "待确认航班号";
    const airline = extractFliggyAirline(rawFlightNumberText, flightNumMatch?.[1]);
    const departureDate = query?.departureDate || new URL(window.location.href).searchParams.get("depDate");
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
      arrivesNextDay: Boolean(card.querySelector(".one-more")) || rawCardText.includes("+1天") || rawCardText.includes("次日"),
      departureAirport,
      arrivalAirport,
      direct: isDirectFlight(card, rawCardText, international),
      segments: [{ marketingFlightNumber, airline, departureDate, departureTime, arrivalTime, departureAirport, arrivalAirport }],
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
      currency: parsedPrice.currency,
      market: international ? "international_hmt" : undefined,
      priceUnit: "per_traveller",
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

function isInternationalResult(query?: FlightQuery): boolean {
  return query?.market === "international_hmt" || /\/ie\//.test(window.location.pathname);
}

function extractFliggyAirline(headline: string, flightNumber?: string): string {
  const candidate = headline
    .replace(flightNumber || "", "")
    // 国际模板第一行之后可能跟随机型、共享航班等说明，不把它们拼进航司。
    .replace(/(?:波音|空客|机型|共享航班|实际承运).*/u, "")
    .trim();
  return candidate || "待确认航空公司";
}

function isDirectFlight(card: Element, rawCardText: string, international: boolean): boolean {
  if (!international) return !/(经停|中转|转机)/.test(rawCardText);
  const transferText = getCleanText(queryFirstAvailable(fliggySelectors.internationalTransfer, card));
  return !transferText && !/(经停|中转|转机)/.test(rawCardText);
}
