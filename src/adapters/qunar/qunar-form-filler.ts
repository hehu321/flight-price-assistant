import { FlightQuery } from "@/shared/types/flight";
import { queryFirstAvailable } from "../base/selector-resolver";
import { qunarSelectors } from "./qunar-selectors";
import { setNativeInputValue } from "../base/input-utils";
import { isInternationalQuery, queryLocationCode } from "@/core/query/international-location-dictionary";
import { logger } from "@/shared/logger/logger";

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export async function fillQunarForm(query: FlightQuery): Promise<void> {
  if (isInternationalQuery(query)) {
    await fillInternationalQunarForm(query);
    return;
  }
  const originInput = queryFirstAvailable(qunarSelectors.originInput) as HTMLInputElement;
  const destInput = queryFirstAvailable(qunarSelectors.destinationInput) as HTMLInputElement;
  const dateInput = queryFirstAvailable(qunarSelectors.departureDateInput) as HTMLInputElement;

  if (originInput) setNativeInputValue(originInput, query.originCity);
  if (destInput) setNativeInputValue(destInput, query.destinationCity);
  if (dateInput) setNativeInputValue(dateInput, query.departureDate);

  const searchBtn = queryFirstAvailable(qunarSelectors.searchButton) as HTMLElement;
  if (searchBtn) searchBtn.click();
}

async function fillInternationalQunarForm(query: FlightQuery): Promise<void> {
  // 真实首页初始只显示国内表单。以前直接操作隐藏的 #ifsForm，视觉上
  // 没有进入国际模式，后续城市联想也不会工作，因此页面一直停在首页。
  const marketTab = queryFirstAvailable(qunarSelectors.internationalMarketTab) as HTMLElement | undefined;
  if (!marketTab) throw new Error("QUNAR_INTERNATIONAL_MARKET_TAB_UNAVAILABLE");
  logger.info("去哪儿国际表单：切换顶部国际市场");
  marketTab.click();

  const form = await waitForVisibleInternationalForm();
  if (!form) throw new Error("QUNAR_INTERNATIONAL_FORM_HIDDEN");
  const mode = query.tripType === "roundtrip" ? qunarSelectors.internationalRoundTripTab : qunarSelectors.internationalTab;
  const tab = queryFirstAvailable(mode, form) as HTMLElement | undefined;
  if (!tab) throw new Error("QUNAR_INTERNATIONAL_MODE_UNAVAILABLE");
  tab.click();
  await delay(120);

  const originInput = form.querySelector<HTMLInputElement>('input[name="fromCity"]');
  const destInput = form.querySelector<HTMLInputElement>('input[name="toCity"]');
  const dateInput = form.querySelector<HTMLInputElement>('input[name="fromDate"]');
  if (!originInput || !destInput || !dateInput) throw new Error("QUNAR_INTERNATIONAL_FORM_UNAVAILABLE");

  await setAndChooseLocation(originInput, query.originCity, queryLocationCode(query, "origin"));
  await setAndChooseLocation(destInput, query.destinationCity, queryLocationCode(query, "destination"));
  setNativeInputValue(dateInput, query.departureDate);
  if (query.tripType === "roundtrip" && query.returnDate) {
    const returnInput = form.querySelector<HTMLInputElement>('input[name="toDate"], input[name="returnDate"]');
    if (returnInput) setNativeInputValue(returnInput, query.returnDate);
  }
  const searchBtn = queryFirstAvailable(qunarSelectors.internationalSearchButton, form) as HTMLElement | undefined;
  if (!searchBtn) throw new Error("QUNAR_INTERNATIONAL_SEARCH_UNAVAILABLE");
  logger.info("去哪儿国际表单：城市和日期已确认，提交搜索");
  searchBtn.click();
}

async function setAndChooseLocation(input: HTMLInputElement, displayName: string, code: string): Promise<void> {
  setNativeInputValue(input, displayName);
  input.focus();
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  // `.q-suggest` 被去哪儿渲染为 `.qcbox` 外的浮层。只能从 document
  // 范围查找可见候选；在 cityBox 内查询会始终得到空数组。
  const candidates = await waitForVisibleCandidates();
  logger.info(`去哪儿国际表单：${code} 城市联想命中 ${candidates.length} 项`);
  const candidate = candidates.find((item) => {
    const text = (item.innerText || item.textContent || "").toUpperCase();
    return text.includes(code) || text.includes(displayName.toUpperCase());
  }) || candidates[0];
  if (!candidate) throw new Error(`QUNAR_LOCATION_SUGGESTION_UNAVAILABLE_${code}`);
  // 去哪儿的城市浮层把“选择城市”绑定在 mousedown，而不是 click。
  // HTMLElement.click() 只会触发 click，页面仍保留裸城市名（例如“武汉”），
  // 随后提交会被网站忽略并停留在首页。按真实鼠标事件顺序触发选择。
  dispatchSuggestionSelection(candidate);
  await delay(120);
  if (!isLocationCommitted(input, displayName, code)) {
    throw new Error(`QUNAR_LOCATION_SELECTION_NOT_APPLIED_${code}`);
  }
}

function dispatchSuggestionSelection(candidate: HTMLElement): void {
  // 不传 view：Chrome 不需要该字段，且 JSDOM 的 Window 类型与运行时 Window
  // 不同会导致单元测试构造 MouseEvent 失败。
  const options = { bubbles: true, cancelable: true };
  candidate.dispatchEvent(new window.MouseEvent("mousedown", options));
  candidate.dispatchEvent(new window.MouseEvent("mouseup", options));
  candidate.dispatchEvent(new window.MouseEvent("click", options));
}

function isLocationCommitted(input: HTMLInputElement, displayName: string, code: string): boolean {
  const value = input.value.trim().toUpperCase();
  // 已真正选择的国际城市会带 IATA 码，例如“武汉(WUH)”。仅有“武汉”
  // 说明仍然只是脚本填入的搜索词，不能继续提交。
  return code ? value.includes(code.toUpperCase()) : value.includes(displayName.toUpperCase());
}

async function waitForVisibleInternationalForm(timeoutMs = 3000): Promise<HTMLElement | undefined> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const form = queryFirstAvailable(qunarSelectors.internationalForm) as HTMLElement | null;
    if (form && isVisibleCandidate(form)) return form;
    await delay(100);
  }
  return undefined;
}

async function waitForVisibleCandidates(timeoutMs = 3000): Promise<HTMLElement[]> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(qunarSelectors.citySuggestion.join(",")))
      .filter(isVisibleCandidate);
    if (candidates.length) return candidates;
    await delay(100);
  }
  return [];
}

function isVisibleCandidate(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}
