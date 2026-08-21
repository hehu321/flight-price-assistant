import { afterEach, describe, expect, it } from "vitest";
import { fillQunarForm } from "@/adapters/qunar/qunar-form-filler";
import { FlightQuery } from "@/shared/types/flight";

const query: FlightQuery = {
  tripType: "oneway", market: "international_hmt",
  originCity: "上海", originCityCode: "SHA", destinationCity: "香港", destinationCityCode: "HKG",
  departureDate: "2026-08-23", adultCount: 1, childCount: 0, cabinClass: "economy", directOnly: false,
  enabledPlatforms: ["qunar"],
};

describe("去哪儿国际首页表单", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("先切换顶部国际市场，并从全局浮层选择城市后提交", async () => {
    document.body.innerHTML = `
      <ul><li id="js_inter_tab"><a href="#">国际·港澳台机票</a></li></ul>
      <form id="ifsForm" style="display:none">
        <input id="searchTypeInterSng" type="radio" name="searchType"><input id="searchTypeInterRnd" type="radio" name="searchType">
        <div class="qcbox"><input name="fromCity"></div><div class="qcbox"><input name="toCity"></div>
        <input name="fromDate"><button class="btn_search" type="submit">搜索</button>
      </form>`;
    const form = document.querySelector<HTMLElement>("#ifsForm")!;
    document.querySelector("#js_inter_tab a")!.addEventListener("click", (event) => { event.preventDefault(); form.style.display = "block"; });
    const installSuggestion = (inputName: string, city: string, code: string) => {
      const input = document.querySelector<HTMLInputElement>(`#ifsForm input[name="${inputName}"]`)!;
      input.addEventListener("input", () => {
        document.querySelector(".q-suggest")?.parentElement?.remove();
        const host = document.createElement("div"); host.className = "qcbox-fixed js-suggestcontainer";
        host.innerHTML = `<div class="q-suggest"><table><tbody><tr data-ind="0">城市 ${city} ${code} 中国</tr></tbody></table></div>`;
        // 真实去哪儿的浮层在 mousedown 时提交城市选择；若实现退化成
        // HTMLElement.click()，这个 fixture 会保留裸城市名并导致测试失败。
        host.querySelector("tr")!.addEventListener("mousedown", () => { input.value = `${city}(${code})`; host.remove(); });
        document.body.append(host);
      });
    };
    installSuggestion("fromCity", "上海", "SHA"); installSuggestion("toCity", "香港", "HKG");
    let submitted = false;
    form.addEventListener("submit", (event) => { event.preventDefault(); submitted = true; });

    await fillQunarForm(query);

    expect(form.style.display).toBe("block");
    expect(document.querySelector<HTMLInputElement>('#ifsForm input[name="fromCity"]')?.value).toBe("上海(SHA)");
    expect(document.querySelector<HTMLInputElement>('#ifsForm input[name="toCity"]')?.value).toBe("香港(HKG)");
    expect(document.querySelector<HTMLInputElement>('#ifsForm input[name="fromDate"]')?.value).toBe("2026-08-23");
    expect(submitted).toBe(true);
  });
});
