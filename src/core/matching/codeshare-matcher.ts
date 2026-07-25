import { FlightResult } from "@/shared/types/flight";

export function isCodeShareFlight(flight: FlightResult): boolean {
  if (flight.operatingFlightNumber && flight.operatingFlightNumber !== flight.marketingFlightNumber) {
    return true;
  }
  return flight.rawPriceText.includes("共享");
}
