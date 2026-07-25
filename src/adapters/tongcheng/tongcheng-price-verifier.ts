import { FlightResult } from "@/shared/types/flight";
import { clickControl, findFlightCard } from "../base/booking";
import { hasDisclosedFeeText, mergeDisclosedFeeText } from "@/core/pricing/fee-disclosure";
import { queryFirstAvailable } from "../base/selector-resolver";
import { tongchengSelectors } from "./tongcheng-selectors";

export async function verifyTongchengPrice(flight: FlightResult): Promise<FlightResult> {
  const card = findFlightCard(flight, tongchengSelectors.flightCard);
  if (!card) return flight;
  if (!hasDisclosedFeeText(card.textContent || "")) {
    // This only expands the cabin list.  Do not invoke a row's “预订” action.
    clickControl(queryFirstAvailable(tongchengSelectors.expandFareButton, card) as HTMLElement | undefined);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return mergeDisclosedFeeText(flight, card.textContent || "");
}
