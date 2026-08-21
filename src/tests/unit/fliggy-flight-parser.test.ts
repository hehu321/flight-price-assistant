import { afterEach, describe, expect, it } from "vitest";
import { extractFliggyFlights } from "@/adapters/fliggy/fliggy-flight-parser";
import { FlightQuery } from "@/shared/types/flight";

const internationalQuery: FlightQuery = {
  tripType: "oneway",
  market: "international_hmt",
  originCity: "武汉",
  originCityCode: "WUH",
  destinationCity: "香港",
  destinationCityCode: "HKG",
  departureDate: "2026-08-28",
  adultCount: 1,
  childCount: 0,
  cabinClass: "economy",
  directOnly: false,
  enabledPlatforms: ["fliggy"],
};

describe("飞猪国际航班解析", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
  });

  it("读取 /ie/ 国际结果页的卡片、航司和含税总价", async () => {
    window.history.replaceState({}, "", "/ie/flight_search_result.htm?depCityCode=WUH&arrCityCode=HKG&depDate=2026-08-28");
    document.body.innerHTML = `
      <div id="J_DepResultContainer">
        <article class="J_FlightItem item-root">
          <table class="flightInfoItem"><tbody><tr>
            <td class="col-flightinfo"><div class="flight-info"><img class="airline-logo" alt="东方航空"><div><p><span>东方航空 MU5123</span></p><p>波音737</p></div></div></td>
            <td class="col-time"><div><p class="time-info">08:15</p><p>天河机场T3</p></div><div class="time-arrow"><span class="transfer-city"></span></div></td>
            <td class="col-arr-time"><p class="time-info">10:05</p><p>香港国际机场T1</p></td>
            <td class="col-price"><div class="price-info"><div class="total-price"><span class="price-num"><em>¥</em>860</span><span class="price-type">含税总价</span></div></div></td>
          </tr></tbody></table>
        </article>
      </div>`;

    const [result] = await extractFliggyFlights(internationalQuery);

    expect(result.parsedResult).toMatchObject({
      marketingFlightNumber: "MU5123",
      airline: "东方航空",
      departureDate: "2026-08-28",
      departureTime: "08:15",
      arrivalTime: "10:05",
      departureAirport: "天河机场T3",
      arrivalAirport: "香港国际机场T1",
      displayedPrice: 860,
      totalPrice: 860,
      includesTax: true,
      currency: "CNY",
      market: "international_hmt",
      direct: true,
    });
  });

  it("国际卡片有中转城市时不标为直飞", async () => {
    window.history.replaceState({}, "", "/ie/flight_search_result.htm?depDate=2026-08-28");
    document.body.innerHTML = `
      <div id="J_DepResultContainer"><article class="J_FlightItem item-root"><table class="flightInfoItem"><tbody><tr>
        <td class="col-flightinfo"><div class="flight-info"><div><p>中国国航 CA100</p></div></div></td>
        <td class="col-time"><div><p class="time-info">08:15</p><p>天河机场</p></div><div class="time-arrow"><span class="transfer-city">上海中转</span></div></td>
        <td class="col-arr-time"><p class="time-info">14:05</p><p>香港国际机场</p></td>
        <td class="col-price"><div class="price-info"><div class="total-price"><span class="price-num">¥960</span><span>含税总价</span></div></div></td>
      </tr></tbody></table></article></div>`;

    const [result] = await extractFliggyFlights(internationalQuery);
    expect(result.parsedResult?.direct).toBe(false);
  });
});
