import { describe, expect, it } from "vitest";
import { findQunarBookingControls } from "@/adapters/qunar/qunar-adapter";

describe("去哪儿订票按钮定位", () => {
  it("兼容真实报价层中没有 btn-book 类名的橙色预订按钮", () => {
    document.body.innerHTML = `
      <section class="ota-wrapper">
        <a class="orange-action">预订</a>
        <button class="btn-order">订票</button>
        <button class="btn-order disabled">预订</button>
        <a>查看退改签</a>
      </section>`;

    const controls = findQunarBookingControls(document.querySelector(".ota-wrapper")!);
    expect(controls.map((item) => item.textContent?.trim())).toEqual(["预订", "订票"]);
  });
});
