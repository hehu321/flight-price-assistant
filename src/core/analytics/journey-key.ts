import { FlightQuery } from "@/shared/types/flight";

/** A price history is only comparable inside the same city pair and departure day. */
export function buildJourneyKey(query: Pick<FlightQuery, "originCity" | "originCityCode" | "destinationCity" | "destinationCityCode" | "departureDate" | "tripType" | "returnDate" | "market" | "adultCount" | "childCount" | "cabinClass">): string {
  const origin = (query.originCityCode || query.originCity).trim().toUpperCase();
  const destination = (query.destinationCityCode || query.destinationCity).trim().toUpperCase();
  const market = query.market || "domestic";
  const travellers = `A${query.adultCount || 1}C${query.childCount || 0}`;
  const cabin = query.cabinClass || "economy";
  const route = query.tripType === "roundtrip" ? `${origin}-${destination}-${query.departureDate}-RT-${query.returnDate || "unknown"}` : `${origin}-${destination}-${query.departureDate}`;
  return `${market}:${route}:${travellers}:${cabin}`;
}

export function journeyLabel(query: Pick<FlightQuery, "originCity" | "destinationCity" | "departureDate" | "tripType" | "returnDate">): string {
  return query.tripType === "roundtrip" ? `${query.originCity} ⇄ ${query.destinationCity} · ${query.departureDate} - ${query.returnDate}` : `${query.originCity} → ${query.destinationCity} · ${query.departureDate}`;
}
