import { FlightQuery } from "@/shared/types/flight";

/** A price history is only comparable inside the same city pair and departure day. */
export function buildJourneyKey(query: Pick<FlightQuery, "originCity" | "originCityCode" | "destinationCity" | "destinationCityCode" | "departureDate" | "tripType" | "returnDate">): string {
  const origin = (query.originCityCode || query.originCity).trim().toUpperCase();
  const destination = (query.destinationCityCode || query.destinationCity).trim().toUpperCase();
  return query.tripType === "roundtrip" ? `${origin}-${destination}-${query.departureDate}-RT-${query.returnDate || "unknown"}` : `${origin}-${destination}-${query.departureDate}`;
}

export function journeyLabel(query: Pick<FlightQuery, "originCity" | "destinationCity" | "departureDate" | "tripType" | "returnDate">): string {
  return query.tripType === "roundtrip" ? `${query.originCity} ⇄ ${query.destinationCity} · ${query.departureDate} - ${query.returnDate}` : `${query.originCity} → ${query.destinationCity} · ${query.departureDate}`;
}
