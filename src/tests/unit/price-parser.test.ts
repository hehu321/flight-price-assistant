import { describe, it, expect } from "vitest";
import { parsePriceText } from "@/core/pricing/price-parser";

describe("price-parser", () => {
  it("应该正确解析标准人民币价格 '¥586'", () => {
    const res = parsePriceText("¥586");
    expect(res.valid).toBe(true);
    expect(res.amount).toBe(586);
    expect(res.priceType).toBe("public");
    expect(res.isStartingPrice).toBe(false);
  });

  it("应该正确识别起步价 '¥586起'", () => {
    const res = parsePriceText("¥586起");
    expect(res.valid).toBe(true);
    expect(res.amount).toBe(586);
    expect(res.isStartingPrice).toBe(true);
  });

  it("应该正确识别会员价与券后价", () => {
    const resMember = parsePriceText("会员价¥560");
    expect(resMember.priceType).toBe("member");

    const resCoupon = parsePriceText("券后¥530");
    expect(resCoupon.priceType).toBe("coupon");
  });

  it("应该正确解析包含票价和税费文本 '票价500＋税费70'", () => {
    const res = parsePriceText("票价500＋税费70");
    expect(res.valid).toBe(true);
    expect(res.amount).toBe(500);
    expect(res.taxAmount).toBe(70);
    expect(res.totalAmount).toBe(570);
    expect(res.priceDisclosure).toBe("total_only");
  });

  it("只在页面明确展示时拆分机建、燃油和含税总价", () => {
    const res = parsePriceText("票价¥420 机建费¥50 燃油附加费¥20 含税总价¥490");
    expect(res.amount).toBe(420);
    expect(res.airportConstructionFee).toBe(50);
    expect(res.fuelSurcharge).toBe(20);
    expect(res.taxAmount).toBe(70);
    expect(res.totalAmount).toBe(490);
    expect(res.priceDisclosure).toBe("breakdown");
  });

  it("普通列表价不伪造含税总价", () => {
    const res = parsePriceText("¥420起");
    expect(res.totalAmount).toBeUndefined();
    expect(res.priceDisclosure).toBe("base_only");
  });

  it("不把同一张卡片后续航班的起飞时间误读为附加费", () => {
    const res = parsePriceText("票价¥680 机建费用说明请查看下一航班 17:04 燃油费用以订单页为准");
    expect(res.airportConstructionFee).toBeUndefined();
    expect(res.fuelSurcharge).toBeUndefined();
    expect(res.totalAmount).toBeUndefined();
    expect(res.priceDisclosure).toBe("base_only");
  });

  it("费用拆分无法与页面含税价对账时降级为总价，不展示错误费用", () => {
    const res = parsePriceText("票价¥680 机建¥1704 燃油¥1704 含税总价¥682");
    expect(res.totalAmount).toBe(682);
    expect(res.airportConstructionFee).toBeUndefined();
    expect(res.fuelSurcharge).toBeUndefined();
    expect(res.priceDisclosure).toBe("total_only");
  });
});
