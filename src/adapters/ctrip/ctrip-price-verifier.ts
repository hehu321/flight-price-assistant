import { FlightResult } from "@/shared/types/flight";
import { queryAllAvailable, queryFirstAvailable } from "../base/selector-resolver";
import { ctripSelectors } from "./ctrip-selectors";
import { getCleanText } from "../base/dom-utils";
import { mergeDisclosedFeeText } from "@/core/pricing/fee-disclosure";

export async function verifyCtripPrice(flight: FlightResult): Promise<FlightResult> {
  const cards = queryAllAvailable(ctripSelectors.flightCard);
  for (const card of cards) {
    if (card.textContent?.includes(flight.marketingFlightNumber)) {
      const toggle = queryFirstAvailable(ctripSelectors.cabinDetailToggle, card) as HTMLElement;
      if (toggle) {
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const taxEl = queryFirstAvailable(ctripSelectors.taxAmountText, card);
      const baggageEl = queryFirstAvailable(ctripSelectors.baggageText, card);
      const refundEl = queryFirstAvailable(ctripSelectors.refundText, card);

      let updated = { ...flight };
      if (baggageEl) updated.baggage = getCleanText(baggageEl);
      if (refundEl) updated.refundRule = getCleanText(refundEl);
      // Prefer the focused tax node; cards occasionally contain several fare
      // rows, so their full text is used only as a fallback.
      updated = mergeDisclosedFeeText(updated, getCleanText(taxEl) || (card.textContent || ""));
      return updated;
    }
  }
  return flight;
}
