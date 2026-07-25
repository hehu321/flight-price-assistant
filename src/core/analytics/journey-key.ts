import { FlightQuery } from "@/shared/types/flight";

/** A price history is only comparable inside the same city pair and departure day. */
export function buildJourneyKey(query: Pick<FlightQuery, "originCity" | "originCityCode" | "destinationCity" | "destinationCityCode" | "departureDate">): string {
  const origin = (query.originCityCode || query.originCity).trim().toUpperCase();
  const destination = (query.destinationCityCode || query.destinationCity).trim().toUpperCase();
  return `${origin}-${destination}-${query.departureDate}`;
}

export function journeyLabel(query: Pick<FlightQuery, "originCity" | "destinationCity" | "departureDate">): string {
  return `${query.originCity} → ${query.destinationCity} · ${query.departureDate}`;
}
