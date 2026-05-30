import { DEFAULT_KEYWORD_PATH } from "./config";
import { normalizeCase } from "./normalize";

export function normalizeKeywords(rawKeywords: string[]): string[] {
  const normalizedKeywords: string[] = [];
  const seenKeywords = new Set<string>();

  for (let i = 0; i < rawKeywords.length; i += 1) {
    const normalizedKeyword = normalizeCase(rawKeywords[i].trim());

    if (normalizedKeyword.length === 0) {
      continue;
    }

    if (!seenKeywords.has(normalizedKeyword)) {
      seenKeywords.add(normalizedKeyword);
      normalizedKeywords.push(normalizedKeyword);
    }
  }

  return normalizedKeywords;
}

export function parseKeywordsFromText(keywordFileContent: string): string[] {
  const rawKeywords: string[] = [];
  let currentLine = "";

  for (let i = 0; i < keywordFileContent.length; i += 1) {
    const char = keywordFileContent[i];

    if (char === "\n" || char === "\r") {
      rawKeywords.push(currentLine);
      currentLine = "";
      continue;
    }

    currentLine += char;
  }

  rawKeywords.push(currentLine);

  return normalizeKeywords(rawKeywords);
}

export async function loadKeywordsFromUrl(
  keywordUrl: string = DEFAULT_KEYWORD_PATH,
  fetcher: typeof fetch = fetch
): Promise<string[]> {
  const response = await fetcher(keywordUrl);

  if (!response.ok) {
    throw new Error(`Failed to load keywords from ${keywordUrl}: ${response.status}`);
  }

  return parseKeywordsFromText(await response.text());
}
