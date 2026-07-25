import { FlightQuery } from "@/shared/types/flight";
import { queryFirstAvailable } from "../base/selector-resolver";
import { qunarSelectors } from "./qunar-selectors";
import { setNativeInputValue } from "../base/input-utils";

export async function fillQunarForm(query: FlightQuery): Promise<void> {
  const originInput = queryFirstAvailable(qunarSelectors.originInput) as HTMLInputElement;
  const destInput = queryFirstAvailable(qunarSelectors.destinationInput) as HTMLInputElement;
  const dateInput = queryFirstAvailable(qunarSelectors.departureDateInput) as HTMLInputElement;

  if (originInput) setNativeInputValue(originInput, query.originCity);
  if (destInput) setNativeInputValue(destInput, query.destinationCity);
  if (dateInput) setNativeInputValue(dateInput, query.departureDate);

  const searchBtn = queryFirstAvailable(qunarSelectors.searchButton) as HTMLElement;
  if (searchBtn) searchBtn.click();
}
