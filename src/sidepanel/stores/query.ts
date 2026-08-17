import { defineStore } from "pinia";
import { FlightQuery, SupportedPlatform } from "@/shared/types/flight";
import { findCityAirports } from "@/core/query/airport-dictionary";
import { getLastRouteSelection, saveLastRouteSelection } from "@/core/storage/last-route-repository";

const defaultDepartureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export const useQueryStore = defineStore("query", {
  state: () => ({
    query: {
      tripType: "oneway",
      originCity: "武汉",
      originCityCode: "WUH",
      destinationCity: "北京",
      destinationCityCode: "BJS",
      departureDate: defaultDepartureDate,
      adultCount: 1,
      childCount: 0,
      cabinClass: "economy",
      directOnly: false,
      enabledPlatforms: ["ctrip", "qunar", "fliggy", "tongcheng"] as SupportedPlatform[],
    } as FlightQuery,
  }),
  actions: {
    setQuery(newQuery: Partial<FlightQuery>) {
      this.query = { ...this.query, ...newQuery };
    },
    setCity(kind: "origin" | "destination", cityName: string) {
      const city = findCityAirports(cityName);
      if (kind === "origin") {
        this.query.originCity = cityName;
        // Never retain a previous city code when the user starts typing a new
        // name.  This prevents a visible city and the platform URL diverging.
        this.query.originCityCode = city?.cityCode;
        return;
      }
      this.query.destinationCity = cityName;
      this.query.destinationCityCode = city?.cityCode;
    },
    synchronizeCityCodes() {
      this.query.originCityCode = findCityAirports(this.query.originCity)?.cityCode;
      this.query.destinationCityCode = findCityAirports(this.query.destinationCity)?.cityCode;
    },
    async restoreLastRoute() {
      const lastRoute = await getLastRouteSelection();
      if (!lastRoute) return;

      this.query.originCity = lastRoute.originCity;
      this.query.originCityCode = lastRoute.originCityCode;
      this.query.originAirport = lastRoute.originAirport;
      this.query.originAirportCode = lastRoute.originAirportCode;
      this.query.destinationCity = lastRoute.destinationCity;
      this.query.destinationCityCode = lastRoute.destinationCityCode;
      this.query.destinationAirport = lastRoute.destinationAirport;
      this.query.destinationAirportCode = lastRoute.destinationAirportCode;
    },
    async rememberCurrentRoute() {
      await saveLastRouteSelection(this.query);
    },
    togglePlatform(platform: SupportedPlatform) {
      const idx = this.query.enabledPlatforms.indexOf(platform);
      if (idx > -1) {
        this.query.enabledPlatforms.splice(idx, 1);
      } else {
        this.query.enabledPlatforms.push(platform);
      }
    },
  },
});
