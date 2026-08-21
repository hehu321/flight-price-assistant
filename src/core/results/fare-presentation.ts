import { FlightResult } from "@/shared/types/flight";

export type FareConfidence = "verified_total" | "ticket_only";

export interface FarePresentation {
  amount: number;
  currency: string;
  confidence: FareConfidence;
  label: string;
  note: string;
}

/**
 * Keep a platform's ticket price distinct from a page-disclosed total fare.
 * A missing total is never silently promoted to a comparable all-in price.
 */
export function presentFare(flight: FlightResult): FarePresentation {
  if (flight.totalPrice !== undefined) {
    return {
      amount: flight.totalPrice,
      currency: flight.currency || "CNY",
      confidence: "verified_total",
      label: "含税总价",
      note: flight.priceDisclosure === "breakdown" ? "税费明细已公开" : "平台已展示含税总价",
    };
  }

  return {
    amount: flight.displayedPrice,
    currency: flight.currency || "CNY",
    confidence: "ticket_only",
    label: "票面价",
    note: "附加费待平台确认",
  };
}

export function isVerifiedTotal(flight: FlightResult): boolean {
  return flight.totalPrice !== undefined;
}

/** Only disclosed CNY totals are comparable across platforms in v1. */
export function isComparableCnyFare(flight: FlightResult): boolean {
  return (flight.currency || "CNY") === "CNY" && flight.totalPrice !== undefined;
}

export function verifiedTotalPrice(flight: FlightResult): number | undefined {
  return isComparableCnyFare(flight) ? flight.totalPrice : undefined;
}
