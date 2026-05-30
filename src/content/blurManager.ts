const BLUR_ATTR       = "data-judol-blur";
const EXTENSION_ATTR  = "data-judol-extension";
const BLUR_CLASS      = "judol-detector-blur";

function getBlurTarget(element: Element): Element {
  const BLOCK_TAGS = new Set([
    "P", "DIV", "SECTION", "ARTICLE", "ASIDE", "LI", "TD", "TH",
    "BLOCKQUOTE", "FIGCAPTION", "HEADER", "FOOTER", "MAIN", "NAV",
    "H1", "H2", "H3", "H4", "H5", "H6"
  ]);

  let current: Element | null = element.parentElement;

  while (current !== null && current !== document.body) {
    if (BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentElement;
  }

  return element.parentElement ?? element;
}

export function applyBlurToHighlights(): void {
  const highlights = document.querySelectorAll("[data-judol-highlight=\"true\"]");
  const alreadyBlurred = new Set<Element>();

  for (let i = 0; i < highlights.length; i += 1) {
    const highlight = highlights[i];
    const target = getBlurTarget(highlight);

    if (alreadyBlurred.has(target)) {
      continue;
    }

    target.classList.add(BLUR_CLASS);
    target.setAttribute(BLUR_ATTR, "true");
    target.setAttribute(EXTENSION_ATTR, "true");
    alreadyBlurred.add(target);
  }
}

export function removeAllBlurs(): void {
  const blurred = document.querySelectorAll(`[${BLUR_ATTR}="true"]`);

  for (let i = 0; i < blurred.length; i += 1) {
    blurred[i].classList.remove(BLUR_CLASS);
    blurred[i].removeAttribute(BLUR_ATTR);
  }
}

let blurEnabled = false;

export function setBlurEnabled(enabled: boolean): void {
  blurEnabled = enabled;

  if (enabled) {
    applyBlurToHighlights();
  } else {
    removeAllBlurs();
  }
}

export function isBlurEnabled(): boolean {
  return blurEnabled;
}

export function refreshBlur(): void {
  if (blurEnabled) {
    removeAllBlurs();
    applyBlurToHighlights();
  }
}