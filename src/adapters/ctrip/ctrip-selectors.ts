export const ctripSelectors = {
  originInput: [
    '[data-ctrip-input="origin"]', // 模拟平台选择器
    '[data-testid="departure-city"]',
    'input[aria-label*="出发"]',
    'input[placeholder*="出发"]',
  ],

  destinationInput: [
    '[data-ctrip-input="destination"]',
    '[data-testid="arrival-city"]',
    'input[aria-label*="到达"]',
    'input[placeholder*="到达"]',
  ],

  departureDateInput: [
    '[data-ctrip-input="date"]',
    'input[aria-label*="日期"]',
  ],

  searchButton: [
    '[data-ctrip-btn="search"]',
    'button[data-testid="search-btn"]',
    '.search-button',
  ],

  resultContainer: [
    ".flight-list.root-flights",
    ".result-wrapper",
    "#ctrip-flight-list",
    ".flight-list",
    '[data-testid="flight-list"]',
  ],

  flightCard: [
    '[data-testid^="flight-item-"]',
    ".flight-item.domestic",
    ".ctrip-flight-card",
    ".flight-item",
    '[data-testid="flight-item"]',
  ],

  flightNumber: [
    ".flight-airline .plane-No",
    ".ctrip-flight-num",
    ".flight-number",
    ".airline-name",
  ],

  departureTime: [
    ".depart-box .time",
    ".ctrip-dep-time",
    ".depart-time",
    ".time-dep",
  ],

  arrivalTime: [
    ".arrive-box .time",
    ".ctrip-arr-time",
    ".arrive-time",
    ".time-arr",
  ],

  departureAirport: [
    ".depart-box .airport",
    ".ctrip-dep-airport",
    ".depart-airport",
  ],

  arrivalAirport: [
    ".arrive-box .airport",
    ".ctrip-arr-airport",
    ".arrive-airport",
  ],

  price: [
    ".flight-operate .flight-price .price",
    ".ctrip-price-text",
    ".price-number",
    ".currency-price",
  ],

  bookingButton: [
    '[data-testid*="book"]',
    '[data-testid*="select"]',
    'button',
    'a',
  ],

  cabinDetailToggle: [
    ".ctrip-expand-btn",
    ".expand-cabins",
  ],

  cabinDetailCard: [
    ".ctrip-cabin-item",
    ".cabin-row",
  ],

  taxAmountText: [
    ".ctrip-tax-text",
    ".tax-info",
  ],

  baggageText: [
    ".ctrip-baggage-text",
    ".baggage-info",
  ],

  refundText: [
    ".ctrip-refund-text",
    ".refund-info",
  ],
};
