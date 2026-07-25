import { afterEach, describe, expect, it } from "vitest";
import { extractQunarFlights } from "@/adapters/qunar/qunar-flight-parser";

describe("去哪儿航班解析", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
  });

  it("从真实卡片的独立航司节点读取航司，而不是从航班号文本推断", async () => {
    window.history.replaceState({}, "", "/site/oneway_list.htm?searchDepartureTime=2026-08-07");
    document.body.innerHTML = `
      <article class="e-airfly">
        <div class="col-airline">
          <div class="d-air"><div class="air"><img class="air-logo" alt="中国国航"><span>中国国航</span></div><div class="num"><span class="n">CA8213</span><span class="n">空客321(中)</span></div></div>
          <div class="d-air"><div class="num"><span class="n">CA1571</span></div></div>
        </div>
        <div class="sep-lf"><h2>19:50</h2><span class="airport">天河机场T3</span></div>
        <div class="sep-rt"><h2>19:35</h2><span class="airport">胶东机场</span></div>
        <div class="col-price"><span class="prc" aria-label="报价：500">¥500</span></div>
      </article>`;

    const results = await extractQunarFlights();

    expect(results).toHaveLength(1);
    expect(results[0].parsedResult).toMatchObject({
      marketingFlightNumber: "CA8213",
      airline: "中国国航",
      departureTime: "19:50",
      arrivalTime: "19:35",
      displayedPrice: 500,
    });
  });

  it("名称节点缺失时回退读取航司图标 alt", async () => {
    window.history.replaceState({}, "", "/site/oneway_list.htm?searchDepartureTime=2026-08-07");
    document.body.innerHTML = `
      <article class="e-airfly">
        <div class="col-airline"><div class="d-air"><div class="air"><img class="air-logo" alt="东方航空"></div><div class="num"><span class="n">MU5480</span></div></div></div>
        <div class="sep-lf"><h2>23:35</h2><span class="airport">天河机场T3</span></div>
        <div class="sep-rt"><h2>01:25</h2><span class="airport">胶东机场</span></div>
        <div class="col-price"><span class="prc" aria-label="报价：665">¥665</span></div>
      </article>`;

    const [result] = await extractQunarFlights();
    expect(result.parsedResult?.airline).toBe("东方航空");
  });
});
