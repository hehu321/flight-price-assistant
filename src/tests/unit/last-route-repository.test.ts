import { beforeEach, describe, expect, it } from "vitest";
import { createLastRouteSelection, getLastRouteSelection, saveLastRouteSelection } from "@/core/storage/last-route-repository";
import { FlightQuery } from "@/shared/types/flight";

const query: FlightQuery = {
  tripType: "oneway",
  originCity: "武汉",
  originCityCode: "WUH",
  destinationCity: "昆明",
  destinationCityCode: "KMG",
  departureDate: "2026-09-01",
  adultCount: 1,
  cabinClass: "economy",
  directOnly: false,
  enabledPlatforms: ["ctrip"],
};

describe("last route repository", () => {
  beforeEach(() => localStorage.clear());

  it("keeps only the reusable route selection from a confirmed query", () => {
    expect(createLastRouteSelection(query, "2026-08-17T00:00:00.000Z")).toEqual({
      originCity: "武汉", originCityCode: "WUH", originAirport: undefined, originAirportCode: undefined,
      destinationCity: "昆明", destinationCityCode: "KMG", destinationAirport: undefined, destinationAirportCode: undefined,
      savedAt: "2026-08-17T00:00:00.000Z",
    });
  });

  it("restores a saved route and ignores an invalid stored route", async () => {
    await saveLastRouteSelection(query);
    await expect(getLastRouteSelection()).resolves.toMatchObject({ originCity: "武汉", originCityCode: "WUH", destinationCity: "昆明", destinationCityCode: "KMG" });

    localStorage.setItem("last_successful_flight_route", JSON.stringify({ originCity: "北京", destinationCity: "北京" }));
    await expect(getLastRouteSelection()).resolves.toBeNull();
  });
});
