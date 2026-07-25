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
    ".flight-list-item.J_FlightItem",
    ".fliggy-flight-card",
    ".flight-item-card",
  ],
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
