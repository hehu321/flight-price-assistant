import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { searchLocations } from "@/core/query/airport-dictionary";
import { useQueryStore } from "@/sidepanel/stores/query";
import { validateFlightQuery } from "@/core/query/query-validator";

describe("查询市场切换", () => {
  beforeEach(() => { setActivePinia(createPinia()); });

  it("切换到国际市场时保留已有国内城市的 IATA 与地点对象", () => {
    const store = useQueryStore();
    store.query.departureDate = "2099-09-15";

    store.setMarket("international_hmt");

    expect(store.query.originCity).toBe("武汉");
    expect(store.query.originCityCode).toBe("WUH");
    expect(store.query.originLocation).toMatchObject({ iataCode: "WUH", market: "domestic" });
    expect(store.query.destinationCityCode).toBe("BJS");
    expect(validateFlightQuery(store.query, new Date("2099-01-01T00:00:00+08:00")).errors).not.toContain("国际航线请从候选项中选择明确的出发城市、机场或 IATA 代码");
  });

  it("国际市场候选同时提供国内机场城市和海外城市", () => {
    expect(searchLocations("武汉", "international_hmt")).toContainEqual(expect.objectContaining({ iataCode: "WUH", market: "domestic" }));
    expect(searchLocations("东京", "international_hmt")).toContainEqual(expect.objectContaining({ iataCode: "TYO", market: "international_hmt" }));
  });
});
