import { FlightResult } from "@/shared/types/flight";

export function calculateMatchScore(a: FlightResult, b: FlightResult): number {
  let score = 0;

  if (a.marketingFlightNumber === b.marketingFlightNumber) score += 40;
  if (a.departureDate === b.departureDate) score += 20;
  if (a.departureAirport === b.departureAirport) score += 10;
  if (a.arrivalAirport === b.arrivalAirport) score += 10;
  if (a.departureTime === b.departureTime) score += 10;
  if (a.arrivalTime === b.arrivalTime) score += 10;

  return Math.min(100, score);
}
