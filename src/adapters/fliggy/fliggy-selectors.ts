export const fliggySelectors = {
  originInput: [
    "input#form_depCity",
    '[data-fliggy-input="origin"]',
    '#depCityName',
    'input[aria-label*="出发"]',
  ],
  destinationInput: [
    "input#form_arrCity",
    '[data-fliggy-input="destination"]',
    '#arrCityName',
    'input[aria-label*="到达"]',
  ],
  cityOptionItem: [
    ".ant-select-dropdown .ant-select-item-option",
    ".fliggy-option-item",
    ".city-option",
    ".ks-suggest-item",
  ],
  departureDateInput: [
    "input#form_depDate",
    '[data-fliggy-input="date"]',
    '#depDate',
  ],
  searchButton: [
    '[data-testid="search-flight-button"]',
    '[data-fliggy-btn="search"]',
    ".fliggy-search-btn",
    ".btn-search",
  ],
  resultContainer: [
    ".flight-list-box",
    ".flight-list.J_FlightList",
    "#fliggy-flight-list",
    ".flight-list-wrap",
  ],
  flightCard: [
    // 飞猪国际页 `/ie/` 使用独立的 `item-root` 卡片结构，不会命中国内
    // `.flight-list-item`，但内容脚本的稳定等待和订票重验仍要能发现它。
    "#J_DepResultContainer .J_FlightItem.item-root",
    ".flight-list-item.J_FlightItem",
    ".fliggy-flight-card",
    ".flight-item-card",
  ],
  internationalFlightCard: [
    "#J_DepResultContainer .J_FlightItem.item-root",
    ".J_FlightItem.item-root",
  ],
  internationalFlightHeadline: [
    ".flightInfoItem .flight-info > div > p:first-child",
    ".flightInfoItem .flight-info p:first-of-type",
  ],
  internationalDepartureTime: [".flightInfoItem .col-time .time-info"],
  internationalArrivalTime: [".flightInfoItem .col-arr-time .time-info"],
  internationalDepartureAirport: [".flightInfoItem .col-time p:not(.time-info)"],
  internationalArrivalAirport: [".flightInfoItem .col-arr-time p:not(.time-info)"],
  internationalPrice: [".flightInfoItem .price-info .total-price .price-num"],
  internationalPriceContext: [".flightInfoItem .price-info .total-price"],
  internationalTransfer: [".flightInfoItem .time-arrow .transfer-city"],
  flightNumber: [
    ".flight-line .J_line",
    ".flight-line .airline-name",
    ".fliggy-flight-num",
    ".flight-no",
  ],
  departureTime: [
    ".flight-time-deptime",
    ".fliggy-dep-time",
    ".dep-time",
  ],
  arrivalTime: [
    ".flight-time .s-time",
    ".fliggy-arr-time",
    ".arr-time",
  ],
  departureAirport: [
    ".flight-port .port-dep",
    ".fliggy-dep-airport",
    ".dep-airport",
  ],
  arrivalAirport: [
    ".flight-port .port-arr",
    ".fliggy-arr-airport",
    ".arr-airport",
  ],
  price: [
    ".flight-price .J_FlightListPrice",
    ".flight-price .pi-price",
    ".fliggy-price-text",
    ".price-num",
    ".num",
  ],
  bookingButton: [
    ".J_SelectFlight",
    ".select-btn",
    "button",
    "a",
  ],
};
