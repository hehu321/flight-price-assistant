import { FlightResult } from "@/shared/types/flight";

export function normalizeFlightPrice(flight: FlightResult): FlightResult {
  const norm = { ...flight };

  if (norm.totalPrice === undefined && norm.displayedPrice) {
    if (norm.includesTax) {
      norm.totalPrice = norm.displayedPrice;
    } else if (norm.taxAmount !== undefined) {
      norm.totalPrice = norm.displayedPrice + norm.taxAmount;
    } else if (norm.mandatoryFee !== undefined) {
      norm.totalPrice = norm.displayedPrice + norm.mandatoryFee;
    }
  }

  return norm;
}
