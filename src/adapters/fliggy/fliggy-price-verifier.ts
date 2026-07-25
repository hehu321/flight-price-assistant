import { FlightResult } from "@/shared/types/flight";
import { clickControl, findFlightCard } from "../base/booking";
import { hasDisclosedFeeText, mergeDisclosedFeeText } from "@/core/pricing/fee-disclosure";
import { fliggySelectors } from "./fliggy-selectors";

export async function verifyFliggyPrice(flight: FlightResult): Promise<FlightResult> {
  const card = findFlightCard(flight, fliggySelectors.flightCard);
  if (!card) return flight;
  if (!hasDisclosedFeeText(card.textContent || "")) {
    // J_SelectFlight reveals fare rows; it is not the row-level “订” action.
    clickControl(card.querySelector<HTMLElement>(".J_SelectFlight") || undefined);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return mergeDisclosedFeeText(flight, card.textContent || "");
}
