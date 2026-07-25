export function getCleanText(el: Element | null): string {
  if (!el) return "";
  return (el.textContent || "").trim().replace(/\s+/g, " ");
}

export function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}
