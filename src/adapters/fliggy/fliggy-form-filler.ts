import { FlightQuery } from "@/shared/types/flight";
import { queryFirstAvailable } from "../base/selector-resolver";
import { fliggySelectors } from "./fliggy-selectors";
import { selectCityOption, setNativeInputValue } from "../base/input-utils";

export async function fillFliggyForm(query: FlightQuery): Promise<void> {
  const originInput = queryFirstAvailable(fliggySelectors.originInput) as HTMLInputElement;
  const destInput = queryFirstAvailable(fliggySelectors.destinationInput) as HTMLInputElement;

  if (originInput) {
    await selectCityOption(originInput, query.originCity, fliggySelectors.cityOptionItem.join(","));
  }
  if (destInput) {
    await selectCityOption(destInput, query.destinationCity, fliggySelectors.cityOptionItem.join(","));
  }

  const dateInput = queryFirstAvailable(fliggySelectors.departureDateInput) as HTMLInputElement;
  if (dateInput) setNativeInputValue(dateInput, query.departureDate);

  const searchBtn = queryFirstAvailable(fliggySelectors.searchButton) as HTMLElement;
  if (searchBtn) searchBtn.click();
}
