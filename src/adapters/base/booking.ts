import { FlightResult } from "@/shared/types/flight";

export function waitForElement<T extends Element>(
  finder: () => T | undefined,
  timeoutMs = 5000,
  intervalMs = 120
): Promise<T | undefined> {
  const immediately = finder();
  if (immediately) return Promise.resolve(immediately);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const found = finder();
      if (found || Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(found);
      }
    }, intervalMs);
  });
}

export function clickControl(control: HTMLElement | undefined): boolean {
  if (!control) return false;
  control.scrollIntoView({ behavior: "smooth", block: "center" });
  control.click();
  return true;
}

export function findBookingControl(root: ParentNode, textPattern: RegExp): HTMLElement | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>("button, a"))
    .find((element) => textPattern.test((element.innerText || element.textContent || "").trim()));
}

export function findFlightCard(flight: FlightResult, cardSelectors: string[]): Element | undefined {
  const cards = cardSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
  const normalizedFlightNumber = normalize(flight.marketingFlightNumber);
  const canUseFlightNumber = normalizedFlightNumber.length >= 4 && !/待确认|unknown/.test(normalizedFlightNumber);

  const ranked = cards.map((candidate) => {
    const text = normalize(candidate.textContent || "");
    let score = 0;
    if (canUseFlightNumber && text.includes(normalizedFlightNumber)) score += 8;
    if (text.includes(normalize(flight.departureTime))) score += 3;
    if (text.includes(normalize(flight.arrivalTime))) score += 3;
    if (flight.airline && text.includes(normalize(flight.airline))) score += 2;
    if (flight.departureAirport && text.includes(normalize(flight.departureAirport))) score += 1;
    if (flight.arrivalAirport && text.includes(normalize(flight.arrivalAirport))) score += 1;
    return { candidate, score };
  }).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return undefined;
  // Flight number + either time is enough.  When an upstream page omits the
  // number, require both times plus another route signal before clicking.
  const minimumScore = canUseFlightNumber ? 11 : 8;
  return best.score >= minimumScore ? best.candidate : undefined;
}

export function chooseClosestPricedControl(
  controls: HTMLElement[],
  expectedPrice: number
): HTMLElement | undefined {
  if (!controls.length) return undefined;
  return controls
    .map((control) => ({ control, price: readNearbyPrice(control) }))
    .sort((a, b) => Math.abs((a.price ?? Number.MAX_SAFE_INTEGER) - expectedPrice)
      - Math.abs((b.price ?? Number.MAX_SAFE_INTEGER) - expectedPrice))[0]?.control;
}

function readNearbyPrice(control: HTMLElement): number | undefined {
  // Each platform nests a booking control differently.  Tongcheng uses a
  // `.cabins-item` fare row, while Qunar keeps controls in OTA rows.
  const text = (control.closest("tr, li, .b-ota-td, .ota-wrapper, .cabins-item")?.textContent || "").replace(/\s+/g, " ");
  const matched = text.match(/¥\s*(\d+(?:\.\d+)?)/);
  return matched ? Number(matched[1]) : undefined;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}
