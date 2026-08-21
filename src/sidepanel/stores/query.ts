import { defineStore } from "pinia";
import { FlightLocation, FlightMarket, FlightQuery, SupportedPlatform } from "@/shared/types/flight";
import { findCityAirports } from "@/core/query/airport-dictionary";
import { getLastRouteSelection, saveLastRouteSelection } from "@/core/storage/last-route-repository";

const defaultDepartureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export const useQueryStore = defineStore("query", {
  state: () => ({
    query: {
      tripType: "oneway",
      market: "domestic",
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
        this.query.originLocation = city ? { displayName: city.cityName, iataCode: city.cityCode, type: "city", countryOrRegion: "中国大陆", market: "domestic", timeZone: "Asia/Shanghai", aliases: city.aliases } : undefined;
        return;
      }
      this.query.destinationCity = cityName;
      this.query.destinationCityCode = city?.cityCode;
      this.query.destinationLocation = city ? { displayName: city.cityName, iataCode: city.cityCode, type: "city", countryOrRegion: "中国大陆", market: "domestic", timeZone: "Asia/Shanghai", aliases: city.aliases } : undefined;
    },
    setLocation(kind: "origin" | "destination", location: FlightLocation) {
      if (kind === "origin") {
        this.query.originCity = location.displayName;
        this.query.originCityCode = location.iataCode;
        this.query.originLocation = location;
      } else {
        this.query.destinationCity = location.displayName;
        this.query.destinationCityCode = location.iataCode;
        this.query.destinationLocation = location;
      }
      if (location.market === "international_hmt") this.query.market = "international_hmt";
    },
    setMarket(market: FlightMarket) {
      this.query.market = market;
      if (market === "domestic") {
        this.synchronizeCityCodes();
      } else {
        this.query.originLocation = undefined;
        this.query.destinationLocation = undefined;
        this.query.originCityCode = undefined;
        this.query.destinationCityCode = undefined;
      }
    },
    synchronizeCityCodes() {
      if (this.query.market === "international_hmt") {
        this.query.originCityCode = this.query.originLocation?.iataCode || this.query.originCityCode;
        this.query.destinationCityCode = this.query.destinationLocation?.iataCode || this.query.destinationCityCode;
        return;
      }
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
      this.query.market = lastRoute.market || "domestic";
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
