import { FlightResult } from "@/shared/types/flight";
import { normalizeFlightPrice } from "./price-normalizer";
import { parsePriceText } from "./price-parser";

/**
 * Merge only fees that the platform exposed in the current flight card or its
 * expanded fare panel.  The caller never supplies a guessed fee table.
 */
export function hasDisclosedFeeText(detailText: string): boolean {
  return Boolean(detailText) && /(?:机建|机场建设费|民航发展基金|燃油|税费|含税|总价|应付)/.test(detailText);
}

export function mergeDisclosedFeeText(flight: FlightResult, detailText: string): FlightResult {
  if (!hasDisclosedFeeText(detailText)) return flight;

  const parsed = parsePriceText(`票价${flight.displayedPrice} ${detailText}`);
  if (parsed.priceDisclosure === "base_only") return flight;

  return normalizeFlightPrice({
    ...flight,
    airportConstructionFee: parsed.airportConstructionFee ?? flight.airportConstructionFee,
    fuelSurcharge: parsed.fuelSurcharge ?? flight.fuelSurcharge,
    taxAmount: parsed.taxAmount ?? flight.taxAmount,
    totalPrice: parsed.totalAmount ?? flight.totalPrice,
    includesTax: parsed.includesTax ?? flight.includesTax,
    priceDisclosure: parsed.priceDisclosure,
    feeCollectedAt: new Date().toISOString(),
  });
}
