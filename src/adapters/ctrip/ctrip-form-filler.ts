import { FlightQuery } from "@/shared/types/flight";
import { queryFirstAvailable } from "../base/selector-resolver";
import { ctripSelectors } from "./ctrip-selectors";
import { setNativeInputValue } from "../base/input-utils";

export async function fillCtripForm(query: FlightQuery): Promise<void> {
  const originInput = queryFirstAvailable(ctripSelectors.originInput) as HTMLInputElement;
  const destInput = queryFirstAvailable(ctripSelectors.destinationInput) as HTMLInputElement;

  if (originInput) {
    setNativeInputValue(originInput, query.originCity);
  }
  if (destInput) {
    setNativeInputValue(destInput, query.destinationCity);
  }

  const dateInput = queryFirstAvailable(ctripSelectors.departureDateInput) as HTMLInputElement;
  if (dateInput) {
    setNativeInputValue(dateInput, query.departureDate);
  }

  const searchBtn = queryFirstAvailable(ctripSelectors.searchButton) as HTMLElement;
  if (searchBtn) {
    searchBtn.click();
  }
}
