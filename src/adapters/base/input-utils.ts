export function setNativeInputValue(
  element: HTMLInputElement,
  value: string
): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;

  if (!valueSetter) {
    throw new Error("INPUT_VALUE_SETTER_NOT_FOUND");
  }

  valueSetter.call(element, value);

  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: value,
    })
  );

  element.dispatchEvent(
    new Event("change", {
      bubbles: true,
    })
  );
}

export async function selectCityOption(
  inputEl: HTMLInputElement,
  cityName: string,
  optionSelector: string
): Promise<boolean> {
  setNativeInputValue(inputEl, cityName);
  inputEl.focus();
  inputEl.dispatchEvent(new Event("focus", { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 300));

  const options = document.querySelectorAll(optionSelector);
  for (const opt of Array.from(options)) {
    if (opt.textContent?.includes(cityName)) {
      (opt as HTMLElement).click();
      return true;
    }
  }

  return false;
}
