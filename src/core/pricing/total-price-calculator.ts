export function calculateTotalPrice(
  displayedPrice: number,
  taxAmount: number = 70, // 默认民航基建燃油附加费预估
  mandatoryFee: number = 0,
  confirmedDiscount: number = 0
): number {
  const base = Math.max(0, displayedPrice);
  const tax = Math.max(0, taxAmount);
  const fee = Math.max(0, mandatoryFee);
  const discount = Math.max(0, confirmedDiscount);

  return base + tax + fee - discount;
}
