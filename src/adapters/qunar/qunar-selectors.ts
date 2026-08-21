export const qunarSelectors = {
  // The international form is a second, independent form on Qunar's
  // homepage.  Never query its controls from document scope: the domestic
  // form appears first and has the same field names.
  internationalForm: ["#ifsForm"],
  // 去哪儿首页默认展示国内表单；必须先切换这个顶部市场 Tab，国际表单
  // 中的单程/往返 Radio 才会真正可见、可交互。
  internationalMarketTab: ["#js_inter_tab a", "#js_inter_tab", '[data-lnk="js_flighttype_tab_inter"]'],
  originInput: [
    '[data-qunar-input="origin"]',
    'input[name="fromCity"]',
    '#fromCity',
  ],
  destinationInput: [
    '[data-qunar-input="destination"]',
    'input[name="toCity"]',
    '#toCity',
  ],
  departureDateInput: [
    '[data-qunar-input="date"]',
    'input[name="fromDate"]',
  ],
  searchButton: [
    '[data-qunar-btn="search"]',
    ".qunar-search-btn",
    'button[type="submit"]',
  ],
  internationalTab: ["#searchTypeInterSng", ".js-searchtype-international", '[data-search-type="international"]'],
  internationalRoundTripTab: ["#searchTypeInterRnd", '[data-search-type="international-roundtrip"]'],
  citySuggestion: [
    ".q-suggest tr[data-ind]",
    ".e-ac-result li",
    ".ac_result li",
    ".city_sug li",
    ".suggestion-item",
  ],
  internationalSearchButton: ["#ifsForm .btn_search", "#ifsForm button[type='submit']"],
  resultContainer: [
    ".e-airfly-list",
    ".e-airfly-wrap",
    "#qunar-flight-list",
    ".b-airfly-list",
  ],
  flightCard: [
    ".e-airfly",
    ".qunar-flight-card",
    ".b-airfly-item",
  ],
  flightNumber: [
    ".col-airline .num .n",
    ".qunar-flight-num",
    ".air-code",
  ],
  airlineName: [
    // 去哪儿真实卡片中，首段航司名称与航班号位于不同节点；不能从航班号文本反推。
    ".col-airline .d-air:first-child .air span",
    ".col-airline .d-air:first-child .airline-name",
    ".qunar-airline-name",
  ],
  airlineLogo: [
    ".col-airline .d-air:first-child img.air-logo[alt]",
    ".col-airline .d-air:first-child img[title]",
    ".qunar-airline-logo[alt]",
  ],
  departureTime: [
    ".sep-lf h2",
    ".qunar-dep-time",
    ".time-dep",
  ],
  arrivalTime: [
    ".sep-rt h2",
    ".qunar-arr-time",
    ".time-arr",
  ],
  departureAirport: [
    ".sep-lf .airport",
    ".qunar-dep-airport",
    ".airport-dep",
  ],
  arrivalAirport: [
    ".sep-rt .airport",
    ".qunar-arr-airport",
    ".airport-arr",
  ],
  price: [
    // 国际列表 `.prc` 没有 aria-label；只匹配 aria-label 会让每张真实
    // 国际卡片因为缺少报价而被解析器丢弃。
    ".col-price .prc",
    '.col-price .prc[aria-label^="报价："]',
    ".qunar-price-text",
    ".b-airfly-price",
    ".price",
  ],
  // 国际页 `.prc` 内是数字滚动动画，textContent 会把旧帧和当前帧拼成
  // 例如 `¥175574`。`title` 才是去哪儿写入 DOM 的稳定金额。
  stablePrice: [
    ".col-price .fix_price[title]",
    ".col-price [data-price]",
    ".col-price .prc[aria-label]",
  ],
  priceDisclosure: [".col-price .vim"],
  bookingButton: [
    ".btn-book",
    ".btn-order",
    ".btn-reserve",
    ".btn-buy",
    ".btn-booking",
    '[data-role="book"]',
    '[data-action="book"]',
    "button",
    "a",
  ],
  bookingDetail: [
    ".ota-wrapper",
  ],
};
