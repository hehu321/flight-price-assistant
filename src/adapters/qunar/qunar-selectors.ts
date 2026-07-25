export const qunarSelectors = {
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
    '.col-price .prc[aria-label^="报价："]',
    ".qunar-price-text",
    ".b-airfly-price",
    ".price",
  ],
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
