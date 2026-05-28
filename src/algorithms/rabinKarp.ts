import type {MatchResult, MatcherRunResult} from "./types";
import {normalizeCase} from "../shared/normalize";


const BASE = 131;  
const MOD  = 1_000_000_007; 

function mulMod(a: number, b: number): number {
  return ((a * b) % MOD + MOD) % MOD;
}

function addMod(a: number, b: number): number {
  return ((a + b) % MOD + MOD) % MOD;
}

function subMod(a: number, b: number): number {
  return ((a - b) % MOD + MOD) % MOD;
}

function power(base: number, exp: number): number {
  let result = 1;
  let current = base % MOD;
  let remaining = exp;

  while (remaining > 0) {
    if (remaining % 2 === 1) {
      result = mulMod(result, current);
    }
    current = mulMod(current, current);
    remaining = Math.floor(remaining / 2);
  }

  return result;
}

function searchSinglePattern(
  normalizedText: string,
  originalText: string,
  normalizedPattern: string
): MatcherRunResult {
  const matches: MatchResult[] = [];
  let comparisons = 0;

  const n = normalizedText.length;
  const m = normalizedPattern.length;

  if (m === 0 || n < m) {
    return { matches, comparisons };
  }

  const highPower = power(BASE, m - 1);
  let patternHash = 0;
  let windowHash = 0;

  for (let i = 0; i < m; i += 1) {
    patternHash = addMod(mulMod(patternHash, BASE), normalizedPattern.charCodeAt(i));
    windowHash  = addMod(mulMod(windowHash,  BASE), normalizedText.charCodeAt(i));
  }

  for (let start = 0; start <= n - m; start += 1) {
    comparisons += 1;

    if (windowHash === patternHash) {
      let matched = true;

      for (let k = 0; k < m; k += 1) {
        comparisons += 1;

        if (normalizedText[start + k] !== normalizedPattern[k]) {
          matched = false;
          break;
        }
      }

      if (matched) {
        matches.push({
          keyword: normalizedPattern,
          matchedText: originalText.slice(start, start + m),
          algorithm: "Rabin-Karp",
          start,
          end: start + m,
          comparisons
        });
      }
    }

    if (start < n - m) {
      const outChar = normalizedText.charCodeAt(start);
      const inChar  = normalizedText.charCodeAt(start + m);

      windowHash = addMod(
        mulMod(subMod(windowHash, mulMod(outChar, highPower)), BASE),
        inChar
      );
    }
  }

  return { matches, comparisons };
}

export function searchRabinKarp(text: string, keyword: string): MatcherRunResult {
  const normalizedText    = normalizeCase(text);
  const normalizedKeyword = normalizeCase(keyword);

  return searchSinglePattern(normalizedText, text, normalizedKeyword);
}

export function searchRabinKarpAll(text: string, keywords: string[]): MatcherRunResult {
  const normalizedText = normalizeCase(text);
  const allMatches: MatchResult[] = [];
  let totalComparisons = 0;

  for (let ki = 0; ki < keywords.length; ki += 1) {
    const normalizedKeyword = normalizeCase(keywords[ki]);

    if (normalizedKeyword.length === 0) {
      continue;
    }

    const result = searchSinglePattern(normalizedText, text, normalizedKeyword);
    totalComparisons += result.comparisons;

    for (let mi = 0; mi < result.matches.length; mi += 1) {
      allMatches.push(result.matches[mi]);
    }
  }

  return { matches: allMatches, comparisons: totalComparisons };
}
