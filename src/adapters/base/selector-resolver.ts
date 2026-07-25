export function queryFirstAvailable(
  selectors: string[],
  root: ParentNode = document
): Element | null {
  if (!selectors || selectors.length === 0) return null;
  for (const selector of selectors) {
    if (!selector) continue;
    try {
      const el = root.querySelector(selector);
      if (el) return el;
    } catch {
      // 忽略非法选择器
    }
  }
  return null;
}

export function queryAllAvailable(
  selectors: string[],
  root: ParentNode = document
): Element[] {
  if (!selectors || selectors.length === 0) return [];
  for (const selector of selectors) {
    if (!selector) continue;
    try {
      const elements = root.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        return Array.from(elements);
      }
    } catch {
      // 忽略非法选择器
    }
  }
  return [];
}
