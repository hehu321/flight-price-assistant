export const tongchengSelectors = {
  resultContainer: [".flight-list", ".flight-list-wrap", ".flight-list-container"],
  flightCard: [".flight-item"],
  flightNumber: [".flight-item-name"],
  departureTime: [".f-startTime strong"],
  arrivalTime: [".f-endTime strong"],
  departureAirport: [".f-startTime em"],
  arrivalAirport: [".f-endTime em"],
  price: [".head-prices strong em", ".head-prices strong", ".price-show"],
  expandFareButton: [".btn-select"],
  fareBookingButton: [".cabins-item a[href='javascript:;']", ".cabins-item .btn-submit", ".cabins-item a"],
};
