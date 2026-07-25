import { FlightResult } from "@/shared/types/flight";
import { clickControl, findFlightCard } from "../base/booking";
import { hasDisclosedFeeText, mergeDisclosedFeeText } from "@/core/pricing/fee-disclosure";
import { qunarSelectors } from "./qunar-selectors";

export async function verifyQunarPrice(flight: FlightResult): Promise<FlightResult> {
  const card = findFlightCard(flight, qunarSelectors.flightCard);
  if (!card) return flight;
  // Qunar may append the expanded quote detail as the next sibling.  Reading
  // it is passive: we do not click a booking button or create an order.
  let detail = `${card.textContent || ""} ${card.nextElementSibling?.textContent || ""}`;
  if (!hasDisclosedFeeText(detail)) {
    // The price column only opens the quote detail; the actual “预订” control
    // lives inside that detail and is deliberately never clicked here.
    clickControl(card.querySelector<HTMLElement>(".col-price") || undefined);
    await new Promise((resolve) => setTimeout(resolve, 350));
    detail = `${card.textContent || ""} ${card.nextElementSibling?.textContent || ""}`;
  }
  return mergeDisclosedFeeText(flight, `${card.textContent || ""} ${detail}`);
}
