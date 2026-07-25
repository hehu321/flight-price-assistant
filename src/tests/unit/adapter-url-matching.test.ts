import { describe, expect, it } from "vitest";
import { CtripAdapter } from "@/adapters/ctrip/ctrip-adapter";
import { QunarAdapter } from "@/adapters/qunar/qunar-adapter";
import { FliggyAdapter } from "@/adapters/fliggy/fliggy-adapter";
import { TongchengAdapter } from "@/adapters/tongcheng/tongcheng-adapter";

describe("本地模拟平台 URL 匹配", () => {
  const adapters = [new CtripAdapter(), new QunarAdapter(), new FliggyAdapter(), new TongchengAdapter()];

  it.each([
    ["http://localhost:3001/search.html", "ctrip"],
    ["http://localhost:3002/results.html", "qunar"],
    ["http://localhost:3003/results.html", "fliggy"],
    ["https://www.ly.com/flights/itinerary/oneway/WUH-BJS?date=2026-07-31", "tongcheng"],
  ] as const)("%s 只匹配 %s", (url, expectedPlatform) => {
    const matched = adapters.filter((adapter) => adapter.matches(url));

    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe(expectedPlatform);
  });
});
