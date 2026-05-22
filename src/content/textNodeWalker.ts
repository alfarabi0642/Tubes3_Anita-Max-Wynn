const SKIPPED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "TEMPLATE"
]);

const EXTENSION_ATTRIBUTE = "data-judol-extension";

function hasTextContent(node: Text): boolean {
  const text = node.nodeValue ?? "";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char !== " " && char !== "\n" && char !== "\r" && char !== "\t") {
      return true;
    }
  }

  return false;
}

function isInsideExtensionElement(element: Element | null): boolean {
  let current: Element | null = element;

  while (current !== null) {
    if (current.hasAttribute(EXTENSION_ATTRIBUTE)) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function isElementVisible(element: Element): boolean {
  const htmlElement = element as HTMLElement;

  if (htmlElement.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const tagName = element.tagName.toUpperCase();
  if (SKIPPED_TAGS.has(tagName)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  return true;
}

function shouldAcceptTextNode(node: Text): boolean {
  const parentElement = node.parentElement;

  if (parentElement === null || !hasTextContent(node)) {
    return false;
  }

  if (isInsideExtensionElement(parentElement)) {
    return false;
  }

  let current: Element | null = parentElement;
  while (current !== null) {
    if (!isElementVisible(current)) {
      return false;
    }

    current = current.parentElement;
  }

  return true;
}

export interface VisibleTextNode {
  node: Text;
  text: string;
}

export function collectVisibleTextNodes(root: ParentNode = document.body): VisibleTextNode[] {
  const nodes: VisibleTextNode[] = [];

  if (root === null) {
    return nodes;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType !== Node.TEXT_NODE) {
        return NodeFilter.FILTER_REJECT;
      }

      return shouldAcceptTextNode(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  let currentNode = walker.nextNode();
  while (currentNode !== null) {
    const textNode = currentNode as Text;
    nodes.push({
      node: textNode,
      text: textNode.nodeValue ?? ""
    });
    currentNode = walker.nextNode();
  }

  return nodes;
}

export function isExtensionElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return isInsideExtensionElement(target);
}
