import { FlightQuery, FlightResult, PlatformRawFlightResult } from "@/shared/types/flight";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { qunarSelectors } from "./qunar-selectors";
import { getCleanText } from "../base/dom-utils";
import { parsePriceText } from "@/core/pricing/price-parser";
import { generateId } from "@/shared/utils/id-generator";

export async function extractQunarFlights(query?: FlightQuery): Promise<PlatformRawFlightResult[]> {
  const cards = queryAllAvailable(qunarSelectors.flightCard);
  const rawResults: PlatformRawFlightResult[] = [];

  for (const card of cards) {
    const rawCardText = card.textContent || "";

    const numEl = queryFirstAvailable(qunarSelectors.flightNumber, card);
    const depTimeEl = queryFirstAvailable(qunarSelectors.departureTime, card);
    const arrTimeEl = queryFirstAvailable(qunarSelectors.arrivalTime, card);
    const depAirEl = queryFirstAvailable(qunarSelectors.departureAirport, card);
    const arrAirEl = queryFirstAvailable(qunarSelectors.arrivalAirport, card);
    const price = extractQunarDisplayedPrice(card);

    const rawFlightNumberText = getCleanText(numEl);
    const rawPriceText = price.rawPriceText;
    const rawRouteText = `${getCleanText(depAirEl)} -> ${getCleanText(arrAirEl)}`;

    const international = query?.market === "international_hmt" || /international|inter/i.test(window.location.href) || /国际|港澳台/.test(document.body.innerText || "");
    const parsedPrice = parsePriceText(rawPriceText, international ? "UNKNOWN" : "CNY");

    const flightNumMatch = rawFlightNumberText.match(/([A-Z0-9]{2}\d{3,4})/);
    const marketingFlightNumber = flightNumMatch ? flightNumMatch[1] : rawFlightNumberText;
    const airline = extractQunarAirline(card) || "待确认航空公司";
    const departureTime = getCleanText(depTimeEl);
    const arrivalTime = getCleanText(arrTimeEl);
    const departureAirport = getCleanText(depAirEl);
    const arrivalAirport = getCleanText(arrAirEl);
    const departureDate = query?.departureDate || new URL(window.location.href).searchParams.get("searchDepartureTime")
      || new URL(window.location.href).searchParams.get("fromDate")
      || document.body.innerText.match(/20\d{2}-\d{2}-\d{2}/)?.[0];

    if (parsedPrice.amount === undefined || !departureDate || !departureTime || !arrivalTime || !departureAirport || !arrivalAirport) {
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
      direct: !/(经停|中转|转机)/.test(rawCardText),
      segments: [{ marketingFlightNumber, airline, departureDate, departureTime, arrivalTime, departureAirport, arrivalAirport }],
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
      market: international ? "international_hmt" : undefined,
      priceUnit: "per_traveller",
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

/**
 * 去哪儿国际列表的数字使用滚动动画实现。不能读取 `.prc.textContent`：
 * 动画的前一帧仍保留在 DOM 中，会把 ¥1475 读成 ¥175574。优先读取
 * 去哪儿标注在稳定属性中的金额；无法确认时宁可丢弃，绝不写入伪造报价。
 */
export function extractQunarDisplayedPrice(card: Element): { rawPriceText: string; source: "stable_attribute" | "plain_text" | "unavailable" } {
  const disclosure = getCleanText(queryFirstAvailable(qunarSelectors.priceDisclosure, card));
  for (const selector of qunarSelectors.stablePrice) {
    const element = card.querySelector(selector);
    if (!element) continue;
    const candidate = element.getAttribute("title")
      || element.getAttribute("data-price")
      || element.getAttribute("aria-label")
      || "";
    const amount = parseStableAmount(candidate);
    if (amount !== undefined) return { rawPriceText: `¥${amount}${disclosure ? ` ${disclosure}` : ""}`, source: "stable_attribute" };
  }

  // 旧版/降级页面没有动画属性时才读取文本，且只接受单一合理金额。
  const plainText = getCleanText(queryFirstAvailable(qunarSelectors.price, card));
  const amount = parsePlainPriceAmount(plainText);
  if (amount !== undefined) return { rawPriceText: `¥${amount}${disclosure ? ` ${disclosure}` : ""}`, source: "plain_text" };
  return { rawPriceText: "", source: "unavailable" };
}

function parseStableAmount(value: string): number | undefined {
  const match = value.replace(/,/g, "").match(/(?:报价\s*[：:]?\s*)?[¥￥]?\s*(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  return isReasonableFare(amount) ? amount : undefined;
}

function parsePlainPriceAmount(value: string): number | undefined {
  const compact = value.replace(/\s+/g, "");
  const amounts = compact.match(/[¥￥]\s*(\d+(?:\.\d+)?)/g) || [];
  if (amounts.length !== 1) return undefined;
  const amount = Number(amounts[0].replace(/[¥￥\s]/g, ""));
  return isReasonableFare(amount) ? amount : undefined;
}

function isReasonableFare(amount: number): boolean {
  // 仅是防止动画帧拼接；真实国际单人公开票价在没有稳定属性时宁可
  // 标记为待重试，也不应把六位动画残影当作可比较价格。
  return Number.isFinite(amount) && amount > 0 && amount < 100000;
}

function extractQunarAirline(card: Element): string {
  const name = getCleanText(queryFirstAvailable(qunarSelectors.airlineName, card));
  if (name) return name;

  const logo = queryFirstAvailable(qunarSelectors.airlineLogo, card);
  return logo?.getAttribute("alt")?.trim()
    || logo?.getAttribute("title")?.trim()
    || "";
}
