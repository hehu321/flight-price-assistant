import { afterEach, describe, expect, it } from "vitest";
import { extractTongchengFlights } from "@/adapters/tongcheng/tongcheng-flight-parser";
import { chooseClosestPricedControl } from "@/adapters/base/booking";

describe("同程航班解析与订票价位选择", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
  });

  it("从真实同程卡片结构读取航班、机场和公开价", async () => {
    window.history.replaceState({}, "", "/flights/itinerary/oneway/WUH-BJS?date=2026-07-31");
    document.body.innerHTML = `
      <article class="flight-item">
        <p class="flight-item-name">南方航空CZ3117</p>
        <div class="f-startTime"><strong>08:10</strong><em>天河机场T3</em></div>
        <div class="f-endTime"><strong>10:05</strong><em>大兴机场</em></div>
        <div class="head-prices"><strong><em>¥420</em></strong></div>
      </article>`;
    const results = await extractTongchengFlights();
    expect(results).toHaveLength(1);
    expect(results[0].parsedResult).toMatchObject({
      platform: "tongcheng", marketingFlightNumber: "CZ3117", airline: "南方航空",
      departureTime: "08:10", arrivalTime: "10:05", displayedPrice: 420, departureDate: "2026-07-31",
    });
  });

  it("在同程舱位行中选择最接近公开价的预订入口", () => {
    document.body.innerHTML = `
      <div class="cabins-item">¥420 <a href="javascript:;">预订</a></div>
      <div class="cabins-item">¥480 <a href="javascript:;">预订</a></div>`;
    const controls = Array.from(document.querySelectorAll<HTMLElement>("a"));
    expect(chooseClosestPricedControl(controls, 470)?.parentElement?.textContent).toContain("¥480");
  });
});
