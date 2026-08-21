import { FlightQuery } from "@/shared/types/flight";
import { getCityCode } from "@/core/query/city-normalizer";
import { isInternationalQuery, queryLocationCode } from "@/core/query/international-location-dictionary";

export function buildCtripSearchUrl(query: FlightQuery): string | null {
  // The visible city is the source of truth.  A stale persisted code must
  // never override a newly typed city name.
  const originCode = (isInternationalQuery(query) ? queryLocationCode(query, "origin") : getCityCode(query.originCity) || query.originCityCode || query.originCity).toLowerCase();
  const destCode = (isInternationalQuery(query) ? queryLocationCode(query, "destination") : getCityCode(query.destinationCity) || query.destinationCityCode || query.destinationCity).toLowerCase();

  if (isLocalMockPage("3001")) {
    // 模拟站点模式
    return `http://localhost:3001/search.html?from=${originCode.toUpperCase()}&to=${destCode.toUpperCase()}&date=${query.departureDate}`;
  }

  if (isInternationalQuery(query)) {
    const kind = query.tripType === "roundtrip" && query.returnDate ? "round" : "oneway";
    const depdate = query.tripType === "roundtrip" && query.returnDate ? `${query.departureDate}_${query.returnDate}` : query.departureDate;
    return `https://flights.ctrip.com/international/search/${kind}-${originCode}-${destCode}?depdate=${encodeURIComponent(depdate)}&cabin=y_s&adult=${query.adultCount}&child=${query.childCount || 0}&infant=0`;
  }

  if (query.tripType === "roundtrip" && query.returnDate) {
    return `https://flights.ctrip.com/online/list/round-${originCode}-${destCode}?depdate=${query.departureDate}_${query.returnDate}&cabin=y_s_c_f&adult=${query.adultCount}&child=${query.childCount || 0}&infant=0`;
  }

  // 携程公开 UR L模式
  return `https://flights.ctrip.com/online/list/oneway-${originCode}-${destCode}?depdate=${query.departureDate}`;
}

function isLocalMockPage(port: string): boolean {
  return typeof window !== "undefined"
    && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    && window.location.port === port;
}
