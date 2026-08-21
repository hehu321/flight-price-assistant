import { FlightCurrency, FlightPriceType, ParsedPrice } from "@/shared/types/flight";

function amountForLabel(text: string, label: string): number | undefined {
  // Fee labels and their amount must be adjacent in the rendered price
  // fragment.  Do not scan across a whole flight card: otherwise a later
  // departure time such as 17:04 can become a fictitious ¥1704 fee.
  const match = text.match(new RegExp(`${label}[\\s：:（()）()每人/]{0,12}(?:[￥¥]\\s*)?([\\d,]+)(?:元)?`, "i"));
  return match ? parseInt(match[1].replace(/,/g, ""), 10) : undefined;
}

export function parsePriceText(rawText: string, fallbackCurrency: FlightCurrency = "CNY"): ParsedPrice {
  if (!rawText) {
    return {
      rawText: "",
      currency: fallbackCurrency,
      isStartingPrice: false,
      priceType: "unknown",
      priceDisclosure: "base_only",
      valid: false,
      warnings: ["价格文本为空"],
    };
  }

  const text = rawText.trim();
  const currency = detectCurrency(text, fallbackCurrency);
  const warnings: string[] = [];
  let priceType: FlightPriceType = "public";

  if (text.includes("会员")) priceType = "member";
  else if (text.includes("券后") || text.includes("优惠券")) priceType = "coupon";
  else if (text.includes("新客")) priceType = "new_user";
  else if (text.includes("学生")) priceType = "student";
  else if (text.includes("儿童")) priceType = "child";

  const isStartingPrice = text.includes("起");
  const includesTax = text.includes("含税") || text.includes("总价");

  // 匹配金额数字
  // 支持: ¥586, ￥586, 586元, 票价500＋税费70, 含税总价620
  const digitsMatch = text.match(/[\d,]+/g);

  if (!digitsMatch) {
    return {
      rawText: text,
      currency,
      isStartingPrice,
      priceType,
      priceDisclosure: "base_only",
      valid: false,
      warnings: ["无法识别价格数字"],
    };
  }

  const numbers = digitsMatch.map((n) => parseInt(n.replace(/,/g, ""), 10)).filter((n) => !isNaN(n));

  if (numbers.length === 0) {
    return {
      rawText: text,
      currency,
      isStartingPrice,
      priceType,
      priceDisclosure: "base_only",
      valid: false,
      warnings: ["没有包含合法的金额数字"],
    };
  }

  let amount: number | undefined;
  let airportConstructionFee = amountForLabel(text, "(?:机场建设费|民航发展基金|机建(?:费)?)");
  let fuelSurcharge = amountForLabel(text, "(?:燃油附加费|燃油费|燃油)");
  let taxAmount: number | undefined;
  let totalAmount: number | undefined;
  const explicitTotal = amountForLabel(text, "(?:含税总价|含税价|总价|应付(?:金额)?)");

  const labelledFare = amountForLabel(text, "(?:票价|票面价|销售价)");
  amount = labelledFare ?? numbers[0];

  const genericTax = amountForLabel(text, "(?:税费|税金)");
  if (genericTax !== undefined) taxAmount = genericTax;
  else if (airportConstructionFee !== undefined || fuelSurcharge !== undefined) {
    taxAmount = (airportConstructionFee || 0) + (fuelSurcharge || 0);
  }

  if (explicitTotal !== undefined) {
    totalAmount = explicitTotal;
  } else if (text.includes("票价") && taxAmount !== undefined) {
    totalAmount = amount + taxAmount;
  } else if (includesTax) {
    totalAmount = amount;
  } else {
    amount = numbers[0];
  }

  // A breakdown is useful only when it reconciles to the page's displayed
  // total.  Discard an inconsistent split rather than showing misleading
  // fees; a total-only value is still safe to expose as such.
  const breakdownTotal = airportConstructionFee !== undefined || fuelSurcharge !== undefined
    ? amount + (airportConstructionFee || 0) + (fuelSurcharge || 0)
    : undefined;
  if (explicitTotal !== undefined && breakdownTotal !== undefined && Math.abs(explicitTotal - breakdownTotal) > 1) {
    airportConstructionFee = undefined;
    fuelSurcharge = undefined;
    if (genericTax === undefined) taxAmount = undefined;
  }

  const priceDisclosure = airportConstructionFee !== undefined || fuelSurcharge !== undefined
    ? "breakdown"
    : totalAmount !== undefined ? "total_only" : "base_only";

  return {
    rawText: text,
    amount,
    airportConstructionFee,
    fuelSurcharge,
    taxAmount,
    totalAmount,
    currency,
    isStartingPrice,
    includesTax,
    priceDisclosure,
    priceType,
    valid: true,
    warnings,
  };
}

/** Never assume that a foreign page's bare number is RMB.  Result adapters may
 * provide their page context as a fallback; recognisable currency markers win. */
function detectCurrency(text: string, fallback: FlightCurrency): FlightCurrency {
  if (/HK\$|港币|港元/i.test(text)) return "HKD";
  if (/MOP\$|澳门元/i.test(text)) return "MOP";
  if (/NT\$|新台币|台币/i.test(text)) return "TWD";
  if (/US\$|美元|\bUSD\b/i.test(text)) return "USD";
  if (/\bJPY\b|日元|円/i.test(text)) return "JPY";
  if (/\bEUR\b|欧元/i.test(text)) return "EUR";
  if (/\bGBP\b|英镑/i.test(text)) return "GBP";
  if (/￥|¥|人民币|元/.test(text)) return "CNY";
  return fallback;
}
