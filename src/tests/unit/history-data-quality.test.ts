import { afterEach, describe, expect, it } from "vitest";
import { extractCtripFlights } from "@/adapters/ctrip/ctrip-flight-parser";
import { extractQunarFlights } from "@/adapters/qunar/qunar-flight-parser";

describe("历史数据质量", () => {
  afterEach(() => { document.body.innerHTML = ""; window.history.replaceState({}, "", "/"); });

  it("携程卡片缺少真实价格时不再写入默认价格", async () => {
    window.history.replaceState({}, "", "/online/list/oneway-wuh-bjs?depdate=2026-08-08");
    document.body.innerHTML = `<article class="flight-item"><span class="flight-number">CZ3117</span><span class="depart-time">08:10</span><span class="arrive-time">10:05</span><span class="depart-airport">天河机场T3</span><span class="arrive-airport">大兴机场</span></article>`;
    expect(await extractCtripFlights()).toHaveLength(0);
  });

  it("去哪儿卡片缺少真实价格时不再写入默认价格", async () => {
    window.history.replaceState({}, "", "/site/oneway_list.htm?searchDepartureTime=2026-08-08");
    document.body.innerHTML = `<article class="qunar-flight-card"><span class="qunar-flight-num">CZ3117</span><span class="qunar-dep-time">08:10</span><span class="qunar-arr-time">10:05</span><span class="qunar-dep-airport">天河机场T3</span><span class="qunar-arr-airport">大兴机场</span></article>`;
    expect(await extractQunarFlights()).toHaveLength(0);
  });
});
