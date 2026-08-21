import { FlightQuery } from "@/shared/types/flight";
import { getCityCode } from "@/core/query/city-normalizer";
import { isInternationalQuery, queryLocationCode } from "@/core/query/international-location-dictionary";

export function buildQunarSearchUrl(query: FlightQuery): string | null {
  const originCode = (isInternationalQuery(query) ? queryLocationCode(query, "origin") : getCityCode(query.originCity) || query.originCityCode || query.originCity).toUpperCase();
  const destCode = (isInternationalQuery(query) ? queryLocationCode(query, "destination") : getCityCode(query.destinationCity) || query.destinationCityCode || query.destinationCity).toUpperCase();

  if (isLocalMockPage("3002")) {
    // 去哪儿模拟平台（表单+结果页模式）
    return `http://localhost:3002/results.html?from=${originCode}&to=${destCode}&date=${query.departureDate}`;
  }

  // 去哪儿国际页支持稳定的结果页直链。首页表单的城市联想依赖 mousedown
  // 和站内临时状态，后台脚本触发时经常留在首页；优先打开已经带完整
  // 城市、IATA、日期与乘客参数的结果页。若该直链被站点重定向到首页，
  // QunarAdapter.shouldSubmitSearch 会自动走现有表单回退流程。
  if (isInternationalQuery(query)) return buildInternationalQunarSearchUrl(query, originCode, destCode);

  return `https://flight.qunar.com/site/oneway_list.htm?searchDepartureAirport=${query.originCity}&searchArrivalAirport=${query.destinationCity}&searchDepartureTime=${query.departureDate}`;
}

function buildInternationalQunarSearchUrl(query: FlightQuery, originCode: string, destCode: string): string {
  const params = new URLSearchParams({
    from: "flight_int_search",
    lowestPrice: "null",
    favoriteKey: "",
    showTotalPr: "0",
    adultNum: String(query.adultCount),
    childNum: String(query.childCount || 0),
    // 去哪儿国际经济舱使用空值；其他舱位原样传递，页面是否实际生效仍由
    // 结果上下文与适配器能力状态验证，不能据此伪造筛选已生效。
    cabinClass: query.cabinClass === "economy" ? "" : query.cabinClass,
  });

  if (query.tripType === "roundtrip" && query.returnDate) {
    params.set("fromCity", query.originCity);
    params.set("toCity", query.destinationCity);
    params.set("fromDate", query.departureDate);
    params.set("toDate", query.returnDate);
    params.set("fromCode", originCode);
    params.set("toCode", destCode);
    params.set("isInter", "true");
    return `https://flight.qunar.com/site/interroundtrip_compare.htm?${params.toString()}`;
  }

  params.set("searchDepartureAirport", query.originCity);
  params.set("searchArrivalAirport", query.destinationCity);
  params.set("searchDepartureTime", query.departureDate);
  // 该字段由去哪儿国际搜索页保留，即使单程没有返程日期也应存在。
  params.set("searchArrivalTime", query.returnDate || "");
  params.set("nextNDays", "0");
  params.set("startSearch", "true");
  params.set("fromCode", originCode);
  params.set("toCode", destCode);
  return `https://flight.qunar.com/site/oneway_list_inter.htm?${params.toString()}`;
}

function isLocalMockPage(port: string): boolean {
  return typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    && window.location.port === port;
}
