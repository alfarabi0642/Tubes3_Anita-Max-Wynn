(function() {
  "use strict";
  const DEFAULT_FUZZY_THRESHOLD = 0.85;
  const VISUAL_SUBSTITUTION_COST = 0.25;
  const NORMAL_SUBSTITUTION_COST = 1;
  const INSERTION_COST = 1;
  const DELETION_COST = 1;
  const ACTIVE_ALGORITHMS = [
    "KMP",
    "Boyer-Moore",
    "RegEx",
    "Weighted-Levenshtein",
    "Aho-Corasick",
    "Rabin-Karp"
  ];
  const DEFAULT_KEYWORDS = ["GACOR99", "MAXWIN88", "HOKI88", "SLOT99"];
  const DEFAULT_KEYWORD_PATH = "keywords/keywords.txt";
  const BLUR_MODE_STORAGE_KEY = "judol-detector:blur-mode";
  const VISUAL_CHARACTER_MAP = {
    "0": "O",
    "4": "A",
    "1": "I",
    "3": "E",
    "5": "S",
    "8": "B",
    "$": "S",
    "@": "A",
    "!": "I",
    "|": "I",
    "Α": "A",
    "Ο": "O",
    "Ε": "E",
    "Ι": "I"
  };
  function normalizeCase(input) {
    return input.toUpperCase();
  }
  function normalizeVisualCharacter(char) {
    const upperChar = normalizeCase(char);
    const mappedChar = VISUAL_CHARACTER_MAP[upperChar];
    if (mappedChar !== void 0) {
      return mappedChar;
    }
    return upperChar;
  }
  function areCharactersVisuallyEquivalent(left, right) {
    return normalizeVisualCharacter(left) === normalizeVisualCharacter(right);
  }
  function isAsciiAlphaNumeric(char) {
    if (char.length === 0) {
      return false;
    }
    const code = char.charCodeAt(0);
    const isDigit = code >= 48 && code <= 57;
    const isUppercase = code >= 65 && code <= 90;
    const isLowercase = code >= 97 && code <= 122;
    return isDigit || isUppercase || isLowercase;
  }
  function normalizeKeywords(rawKeywords) {
    const normalizedKeywords = [];
    const seenKeywords = /* @__PURE__ */ new Set();
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
  function parseKeywordsFromText(keywordFileContent) {
    const rawKeywords = [];
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
  async function loadKeywordsFromUrl(keywordUrl = DEFAULT_KEYWORD_PATH, fetcher = fetch) {
    const response = await fetcher(keywordUrl);
    if (!response.ok) {
      throw new Error(`Failed to load keywords from ${keywordUrl}: ${response.status}`);
    }
    return parseKeywordsFromText(await response.text());
  }
  const MESSAGE_TYPES = {
    getSummary: "JUDOL_GET_SUMMARY",
    rescan: "JUDOL_RESCAN",
    scanUpdated: "JUDOL_SCAN_UPDATED",
    setBlurMode: "JUDOL_SET_BLUR_MODE",
    getBlurMode: "JUDOL_GET_BLUR_MODE"
  };
  const LAST_SCAN_KEY = "judol-detector:last-scan";
  function ensureChromeStorage() {
    if (typeof chrome === "undefined" || chrome.storage?.local === void 0) {
      throw new Error("Chrome storage API is not available.");
    }
  }
  async function saveScanRecord(record) {
    ensureChromeStorage();
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [LAST_SCAN_KEY]: record }, () => {
        const error = chrome.runtime.lastError;
        if (error !== void 0) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }
  async function saveBlurMode(enabled) {
    ensureChromeStorage();
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [BLUR_MODE_STORAGE_KEY]: enabled }, () => {
        const error = chrome.runtime.lastError;
        if (error !== void 0) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }
  async function loadBlurMode() {
    ensureChromeStorage();
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(BLUR_MODE_STORAGE_KEY, (items) => {
        const error = chrome.runtime.lastError;
        if (error !== void 0) {
          reject(new Error(error.message));
          return;
        }
        resolve(items[BLUR_MODE_STORAGE_KEY] ?? false);
      });
    });
  }
  function buildLastOccurrenceTable(pattern) {
    const normalizedPattern = normalizeCase(pattern);
    const lastOccurrence = /* @__PURE__ */ new Map();
    for (let i = 0; i < normalizedPattern.length; i += 1) {
      lastOccurrence.set(normalizedPattern[i], i);
    }
    return lastOccurrence;
  }
  function searchBoyerMoore(text, keyword) {
    const normalizedText = normalizeCase(text);
    const normalizedKeyword = normalizeCase(keyword);
    const matches = [];
    let comparisons = 0;
    if (normalizedKeyword.length === 0 || normalizedText.length < normalizedKeyword.length) {
      return { matches, comparisons };
    }
    const lastOccurrence = buildLastOccurrenceTable(normalizedKeyword);
    let shift = 0;
    while (shift <= normalizedText.length - normalizedKeyword.length) {
      let patternCursor = normalizedKeyword.length - 1;
      while (patternCursor >= 0) {
        comparisons += 1;
        if (normalizedKeyword[patternCursor] === normalizedText[shift + patternCursor]) {
          patternCursor -= 1;
          continue;
        }
        const mismatchedChar = normalizedText[shift + patternCursor];
        const lastSeenAt = lastOccurrence.get(mismatchedChar);
        const fallbackLastSeenAt = lastSeenAt === void 0 ? -1 : lastSeenAt;
        const badCharacterShift = patternCursor - fallbackLastSeenAt;
        shift += Math.max(1, badCharacterShift);
        break;
      }
      if (patternCursor < 0) {
        const start = shift;
        const end = shift + normalizedKeyword.length;
        matches.push({
          keyword: normalizedKeyword,
          matchedText: text.slice(start, end),
          algorithm: "Boyer-Moore",
          start,
          end,
          comparisons
        });
        shift += 1;
      }
    }
    return { matches, comparisons };
  }
  function buildKmpFailureTable(pattern) {
    const normalizedPattern = normalizeCase(pattern);
    const failureTable = new Array(normalizedPattern.length).fill(0);
    let borderLength = 0;
    let cursor = 1;
    while (cursor < normalizedPattern.length) {
      if (normalizedPattern[cursor] === normalizedPattern[borderLength]) {
        borderLength += 1;
        failureTable[cursor] = borderLength;
        cursor += 1;
        continue;
      }
      if (borderLength > 0) {
        borderLength = failureTable[borderLength - 1];
        continue;
      }
      failureTable[cursor] = 0;
      cursor += 1;
    }
    return failureTable;
  }
  function searchKmp(text, keyword) {
    const normalizedText = normalizeCase(text);
    const normalizedKeyword = normalizeCase(keyword);
    const matches = [];
    let comparisons = 0;
    if (normalizedKeyword.length === 0 || normalizedText.length < normalizedKeyword.length) {
      return { matches, comparisons };
    }
    const failureTable = buildKmpFailureTable(normalizedKeyword);
    let textCursor = 0;
    let patternCursor = 0;
    while (textCursor < normalizedText.length) {
      comparisons += 1;
      if (normalizedText[textCursor] === normalizedKeyword[patternCursor]) {
        textCursor += 1;
        patternCursor += 1;
        if (patternCursor === normalizedKeyword.length) {
          const start = textCursor - normalizedKeyword.length;
          const end = textCursor;
          matches.push({
            keyword: normalizedKeyword,
            matchedText: text.slice(start, end),
            algorithm: "KMP",
            start,
            end,
            comparisons
          });
          patternCursor = failureTable[patternCursor - 1];
        }
        continue;
      }
      if (patternCursor > 0) {
        patternCursor = failureTable[patternCursor - 1];
        continue;
      }
      textCursor += 1;
    }
    return { matches, comparisons };
  }
  const KEYWORD_NUMBER_PATTERN = /(^|[^A-Za-z0-9])([A-Za-z]+[0-9]{2,3})(?![A-Za-z0-9])/g;
  function searchRegexPatterns(text) {
    const matches = [];
    let regexResult = KEYWORD_NUMBER_PATTERN.exec(text);
    while (regexResult !== null) {
      const prefix = regexResult[1] ?? "";
      const matchedText = regexResult[2] ?? "";
      const start = regexResult.index + prefix.length;
      const end = start + matchedText.length;
      const normalizedKeyword = normalizeCase(matchedText);
      matches.push({
        keyword: normalizedKeyword,
        matchedText,
        algorithm: "RegEx",
        start,
        end,
        comparisons: 0
      });
      if (KEYWORD_NUMBER_PATTERN.lastIndex <= regexResult.index) {
        KEYWORD_NUMBER_PATTERN.lastIndex = regexResult.index + 1;
      }
      regexResult = KEYWORD_NUMBER_PATTERN.exec(text);
    }
    KEYWORD_NUMBER_PATTERN.lastIndex = 0;
    return { matches, comparisons: 0 };
  }
  function getSubstitutionCost(leftChar, rightChar, options) {
    if (leftChar === rightChar) {
      return 0;
    }
    if (areCharactersVisuallyEquivalent(leftChar, rightChar)) {
      return options.visualSubstitutionCost;
    }
    return options.normalSubstitutionCost;
  }
  function withDefaultOptions(options = {}) {
    return {
      visualSubstitutionCost: options.visualSubstitutionCost ?? VISUAL_SUBSTITUTION_COST,
      normalSubstitutionCost: options.normalSubstitutionCost ?? NORMAL_SUBSTITUTION_COST,
      insertionCost: options.insertionCost ?? INSERTION_COST,
      deletionCost: options.deletionCost ?? DELETION_COST
    };
  }
  function weightedLevenshteinDistance(left, right, options = {}) {
    const normalizedLeft = normalizeCase(left);
    const normalizedRight = normalizeCase(right);
    const resolvedOptions = withDefaultOptions(options);
    const matrix = [];
    let comparisons = 0;
    for (let row = 0; row <= normalizedLeft.length; row += 1) {
      matrix[row] = [];
      matrix[row][0] = row * resolvedOptions.deletionCost;
    }
    for (let column = 0; column <= normalizedRight.length; column += 1) {
      matrix[0][column] = column * resolvedOptions.insertionCost;
    }
    for (let row = 1; row <= normalizedLeft.length; row += 1) {
      for (let column = 1; column <= normalizedRight.length; column += 1) {
        comparisons += 1;
        const substitutionCost = getSubstitutionCost(
          normalizedLeft[row - 1],
          normalizedRight[column - 1],
          resolvedOptions
        );
        const deletionScore = matrix[row - 1][column] + resolvedOptions.deletionCost;
        const insertionScore = matrix[row][column - 1] + resolvedOptions.insertionCost;
        const substitutionScore = matrix[row - 1][column - 1] + substitutionCost;
        matrix[row][column] = Math.min(deletionScore, insertionScore, substitutionScore);
      }
    }
    return {
      distance: matrix[normalizedLeft.length][normalizedRight.length],
      comparisons
    };
  }
  function extractCandidateTokens(originalText) {
    const normalizedText = normalizeCase(originalText);
    const candidates = [];
    let tokenStart = -1;
    for (let i = 0; i < normalizedText.length; i += 1) {
      if (isAsciiAlphaNumeric(normalizedText[i])) {
        if (tokenStart < 0) {
          tokenStart = i;
        }
        continue;
      }
      if (tokenStart >= 0) {
        candidates.push({
          normalizedText: normalizedText.slice(tokenStart, i),
          start: tokenStart,
          end: i
        });
        tokenStart = -1;
      }
    }
    if (tokenStart >= 0) {
      candidates.push({
        normalizedText: normalizedText.slice(tokenStart, normalizedText.length),
        start: tokenStart,
        end: normalizedText.length
      });
    }
    return candidates;
  }
  function searchWeightedLevenshtein(text, keyword, threshold = DEFAULT_FUZZY_THRESHOLD, options = {}) {
    const normalizedKeyword = normalizeCase(keyword);
    const matches = [];
    let comparisons = 0;
    if (normalizedKeyword.length === 0) {
      return { matches, comparisons };
    }
    const candidates = extractCandidateTokens(text);
    const allowedLengthDelta = Math.max(1, Math.floor(normalizedKeyword.length * 0.2));
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      const lengthDelta = Math.abs(candidate.normalizedText.length - normalizedKeyword.length);
      if (lengthDelta > allowedLengthDelta) {
        continue;
      }
      const distanceResult = weightedLevenshteinDistance(candidate.normalizedText, normalizedKeyword, options);
      comparisons += distanceResult.comparisons;
      const maxLength = Math.max(candidate.normalizedText.length, normalizedKeyword.length);
      const score = maxLength === 0 ? 1 : Math.max(0, 1 - distanceResult.distance / maxLength);
      if (score >= threshold) {
        matches.push({
          keyword: normalizedKeyword,
          matchedText: text.slice(candidate.start, candidate.end),
          algorithm: "Weighted-Levenshtein",
          start: candidate.start,
          end: candidate.end,
          score,
          comparisons
        });
      }
    }
    return { matches, comparisons };
  }
  function makeNode() {
    return { goto: /* @__PURE__ */ new Map(), failure: 0, output: [] };
  }
  function buildAhoCorasick(keywords) {
    const nodes = [makeNode()];
    for (let ki = 0; ki < keywords.length; ki += 1) {
      const normalizedKeyword = normalizeCase(keywords[ki]);
      if (normalizedKeyword.length === 0) {
        continue;
      }
      let current = 0;
      for (let ci = 0; ci < normalizedKeyword.length; ci += 1) {
        const char = normalizedKeyword[ci];
        let next = nodes[current].goto.get(char);
        if (next === void 0) {
          next = nodes.length;
          nodes.push(makeNode());
          nodes[current].goto.set(char, next);
        }
        current = next;
      }
      nodes[current].output.push(normalizedKeyword);
    }
    const queue = [];
    for (const child of nodes[0].goto.values()) {
      nodes[child].failure = 0;
      queue.push(child);
    }
    let head = 0;
    while (head < queue.length) {
      const current = queue[head];
      head += 1;
      for (const [char, child] of nodes[current].goto) {
        let failureState = nodes[current].failure;
        while (failureState !== 0 && !nodes[failureState].goto.has(char)) {
          failureState = nodes[failureState].failure;
        }
        const nextFailure = nodes[failureState].goto.get(char);
        nodes[child].failure = nextFailure !== void 0 && nextFailure !== child ? nextFailure : 0;
        const failureNode = nodes[nodes[child].failure];
        for (let oi = 0; oi < failureNode.output.length; oi += 1) {
          nodes[child].output.push(failureNode.output[oi]);
        }
        queue.push(child);
      }
    }
    return { nodes };
  }
  function searchAhoCorasick(text, automaton) {
    const normalizedText = normalizeCase(text);
    const { nodes } = automaton;
    const matches = [];
    let comparisons = 0;
    let current = 0;
    for (let ti = 0; ti < normalizedText.length; ti += 1) {
      const char = normalizedText[ti];
      while (current !== 0 && !nodes[current].goto.has(char)) {
        comparisons += 1;
        current = nodes[current].failure;
      }
      const next = nodes[current].goto.get(char);
      comparisons += 1;
      if (next !== void 0) {
        current = next;
      }
      const output = nodes[current].output;
      for (let oi = 0; oi < output.length; oi += 1) {
        const keyword = output[oi];
        const start = ti - keyword.length + 1;
        const end = ti + 1;
        matches.push({
          keyword,
          matchedText: text.slice(start, end),
          algorithm: "Aho-Corasick",
          start,
          end,
          comparisons
        });
      }
    }
    return { matches, comparisons };
  }
  const BASE = 131;
  const MOD = 1000000007;
  function mulMod(a, b) {
    return (a * b % MOD + MOD) % MOD;
  }
  function addMod(a, b) {
    return ((a + b) % MOD + MOD) % MOD;
  }
  function subMod(a, b) {
    return ((a - b) % MOD + MOD) % MOD;
  }
  function power(base, exp) {
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
  function searchSinglePattern(normalizedText, originalText, normalizedPattern) {
    const matches = [];
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
      windowHash = addMod(mulMod(windowHash, BASE), normalizedText.charCodeAt(i));
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
        const inChar = normalizedText.charCodeAt(start + m);
        windowHash = addMod(
          mulMod(subMod(windowHash, mulMod(outChar, highPower)), BASE),
          inChar
        );
      }
    }
    return { matches, comparisons };
  }
  function searchRabinKarpAll(text, keywords) {
    const normalizedText = normalizeCase(text);
    const allMatches = [];
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
  function getNowMs() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }
  function isAlgorithmEnabled(activeAlgorithms, algorithm) {
    for (let i = 0; i < activeAlgorithms.length; i += 1) {
      if (activeAlgorithms[i] === algorithm) {
        return true;
      }
    }
    return false;
  }
  function resolveKeywords(options) {
    if (options.keywords !== void 0) {
      return normalizeKeywords(options.keywords);
    }
    if (options.keywordText !== void 0) {
      return parseKeywordsFromText(options.keywordText);
    }
    return normalizeKeywords(DEFAULT_KEYWORDS);
  }
  function createStats(algorithm, matchCount, executionTimeMs, comparisons) {
    return {
      algorithm,
      matchCount,
      executionTimeMs,
      comparisons
    };
  }
  function runKeywordMatcher(text, keywords, algorithm) {
    const matches = [];
    const exactKeywords = /* @__PURE__ */ new Set();
    let comparisons = 0;
    for (let i = 0; i < keywords.length; i += 1) {
      const keyword = keywords[i];
      const result = algorithm === "KMP" ? searchKmp(text, keyword) : searchBoyerMoore(text, keyword);
      comparisons += result.comparisons;
      if (result.matches.length > 0) {
        exactKeywords.add(normalizeCase(keyword));
      }
      for (let j = 0; j < result.matches.length; j += 1) {
        matches.push(result.matches[j]);
      }
    }
    return {
      runResult: { matches, comparisons },
      exactKeywords
    };
  }
  function addSetValues(target, source) {
    for (const value of source) {
      target.add(value);
    }
  }
  function countKeywordMatches(matches) {
    const keywordCounts = {};
    for (let i = 0; i < matches.length; i += 1) {
      const keyword = matches[i].keyword;
      keywordCounts[keyword] = (keywordCounts[keyword] ?? 0) + 1;
    }
    return keywordCounts;
  }
  function hasSameRange(left, right) {
    return left.start === right.start && left.end === right.end;
  }
  function deduplicateMatches(matches) {
    const uniqueMatches = [];
    for (let i = 0; i < matches.length; i += 1) {
      const candidate = matches[i];
      let duplicateFound = false;
      for (let j = 0; j < uniqueMatches.length; j += 1) {
        if (hasSameRange(candidate, uniqueMatches[j])) {
          duplicateFound = true;
          break;
        }
      }
      if (!duplicateFound) {
        uniqueMatches.push(candidate);
      }
    }
    uniqueMatches.sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      return left.end - right.end;
    });
    return uniqueMatches;
  }
  function scanText(text, options = {}) {
    const keywords = resolveKeywords(options);
    const activeAlgorithms = options.activeAlgorithms ?? ACTIVE_ALGORITHMS;
    const fuzzyThreshold = options.fuzzyThreshold ?? DEFAULT_FUZZY_THRESHOLD;
    const rawMatches = [];
    const algorithmStats = [];
    const exactKeywords = /* @__PURE__ */ new Set();
    if (isAlgorithmEnabled(activeAlgorithms, "KMP")) {
      const startedAt = getNowMs();
      const { runResult, exactKeywords: kmpExactKeywords } = runKeywordMatcher(text, keywords, "KMP");
      const executionTimeMs = getNowMs() - startedAt;
      addSetValues(exactKeywords, kmpExactKeywords);
      algorithmStats.push(createStats("KMP", runResult.matches.length, executionTimeMs, runResult.comparisons));
      for (let i = 0; i < runResult.matches.length; i += 1) {
        rawMatches.push(runResult.matches[i]);
      }
    }
    if (isAlgorithmEnabled(activeAlgorithms, "Boyer-Moore")) {
      const startedAt = getNowMs();
      const { runResult, exactKeywords: bmExactKeywords } = runKeywordMatcher(text, keywords, "Boyer-Moore");
      const executionTimeMs = getNowMs() - startedAt;
      addSetValues(exactKeywords, bmExactKeywords);
      algorithmStats.push(
        createStats("Boyer-Moore", runResult.matches.length, executionTimeMs, runResult.comparisons)
      );
      for (let i = 0; i < runResult.matches.length; i += 1) {
        rawMatches.push(runResult.matches[i]);
      }
    }
    if (isAlgorithmEnabled(activeAlgorithms, "RegEx")) {
      const startedAt = getNowMs();
      const runResult = searchRegexPatterns(text);
      const executionTimeMs = getNowMs() - startedAt;
      algorithmStats.push(createStats("RegEx", runResult.matches.length, executionTimeMs, runResult.comparisons));
      for (let i = 0; i < runResult.matches.length; i += 1) {
        rawMatches.push(runResult.matches[i]);
      }
    }
    if (isAlgorithmEnabled(activeAlgorithms, "Weighted-Levenshtein")) {
      const startedAt = getNowMs();
      const fuzzyMatches = [];
      let comparisons = 0;
      for (let i = 0; i < keywords.length; i += 1) {
        const normalizedKeyword = normalizeCase(keywords[i]);
        if (exactKeywords.has(normalizedKeyword)) {
          continue;
        }
        const runResult = searchWeightedLevenshtein(text, normalizedKeyword, fuzzyThreshold);
        comparisons += runResult.comparisons;
        for (let j = 0; j < runResult.matches.length; j += 1) {
          fuzzyMatches.push(runResult.matches[j]);
        }
      }
      const executionTimeMs = getNowMs() - startedAt;
      algorithmStats.push(createStats("Weighted-Levenshtein", fuzzyMatches.length, executionTimeMs, comparisons));
      for (let i = 0; i < fuzzyMatches.length; i += 1) {
        rawMatches.push(fuzzyMatches[i]);
      }
    }
    if (isAlgorithmEnabled(activeAlgorithms, "Aho-Corasick")) {
      const startedAt = getNowMs();
      const automaton = buildAhoCorasick(keywords);
      const runResult = searchAhoCorasick(text, automaton);
      const executionTimeMs = getNowMs() - startedAt;
      algorithmStats.push(createStats("Aho-Corasick", runResult.matches.length, executionTimeMs, runResult.comparisons));
      for (let i = 0; i < runResult.matches.length; i += 1) {
        rawMatches.push(runResult.matches[i]);
      }
    }
    if (isAlgorithmEnabled(activeAlgorithms, "Rabin-Karp")) {
      const startedAt = getNowMs();
      const runResult = searchRabinKarpAll(text, keywords);
      const executionTimeMs = getNowMs() - startedAt;
      algorithmStats.push(createStats("Rabin-Karp", runResult.matches.length, executionTimeMs, runResult.comparisons));
      for (let i = 0; i < runResult.matches.length; i += 1) {
        rawMatches.push(runResult.matches[i]);
      }
    }
    const matches = deduplicateMatches(rawMatches);
    return {
      totalMatches: matches.length,
      keywordCounts: countKeywordMatches(matches),
      algorithmStats,
      scannedAt: Date.now(),
      matches
    };
  }
  function createEmptyScanSummary(scannedAt = Date.now()) {
    return {
      totalMatches: 0,
      keywordCounts: {},
      algorithmStats: [],
      scannedAt,
      matches: []
    };
  }
  function addKeywordCount(target, keyword, count) {
    target[keyword] = (target[keyword] ?? 0) + count;
  }
  function findAlgorithmStat(stats, algorithm) {
    for (let i = 0; i < stats.length; i += 1) {
      if (stats[i].algorithm === algorithm) {
        return stats[i];
      }
    }
    return void 0;
  }
  function mergeAlgorithmStats(target, source) {
    for (let i = 0; i < source.length; i += 1) {
      const incoming = source[i];
      const existing = findAlgorithmStat(target, incoming.algorithm);
      if (existing === void 0) {
        target.push({
          algorithm: incoming.algorithm,
          matchCount: incoming.matchCount,
          executionTimeMs: incoming.executionTimeMs,
          comparisons: incoming.comparisons
        });
        continue;
      }
      existing.matchCount += incoming.matchCount;
      existing.executionTimeMs += incoming.executionTimeMs;
      existing.comparisons = (existing.comparisons ?? 0) + (incoming.comparisons ?? 0);
    }
  }
  function combineScanSummaries(summaries) {
    const combined = createEmptyScanSummary();
    for (let i = 0; i < summaries.length; i += 1) {
      const summary = summaries[i];
      combined.totalMatches += summary.totalMatches;
      mergeAlgorithmStats(combined.algorithmStats, summary.algorithmStats);
      const keywords = Object.keys(summary.keywordCounts);
      for (let keywordIndex = 0; keywordIndex < keywords.length; keywordIndex += 1) {
        const keyword = keywords[keywordIndex];
        addKeywordCount(combined.keywordCounts, keyword, summary.keywordCounts[keyword]);
      }
      for (let matchIndex = 0; matchIndex < summary.matches.length; matchIndex += 1) {
        combined.matches.push(summary.matches[matchIndex]);
      }
    }
    combined.algorithmStats.sort((left, right) => left.algorithm.localeCompare(right.algorithm));
    return combined;
  }
  function getKeywordCount(summary, keyword) {
    return summary.keywordCounts[keyword] ?? 0;
  }
  function getAlgorithmExecutionTime(summary, algorithm) {
    const stat = findAlgorithmStat(summary.algorithmStats, algorithm);
    return stat?.executionTimeMs ?? 0;
  }
  const SKIPPED_TAGS = /* @__PURE__ */ new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "TEMPLATE"
  ]);
  const EXTENSION_ATTRIBUTE$2 = "data-judol-extension";
  function hasTextContent(node) {
    const text = node.nodeValue ?? "";
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char !== " " && char !== "\n" && char !== "\r" && char !== "	") {
        return true;
      }
    }
    return false;
  }
  function isInsideExtensionElement(element) {
    let current = element;
    while (current !== null) {
      if (current.hasAttribute(EXTENSION_ATTRIBUTE$2)) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }
  function isElementVisible(element) {
    const htmlElement = element;
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
  function shouldAcceptTextNode(node) {
    const parentElement = node.parentElement;
    if (parentElement === null || !hasTextContent(node)) {
      return false;
    }
    if (isInsideExtensionElement(parentElement)) {
      return false;
    }
    let current = parentElement;
    while (current !== null) {
      if (!isElementVisible(current)) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  }
  function collectVisibleTextNodes(root = document.body) {
    const nodes = [];
    if (root === null) {
      return nodes;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType !== Node.TEXT_NODE) {
          return NodeFilter.FILTER_REJECT;
        }
        return shouldAcceptTextNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let currentNode = walker.nextNode();
    while (currentNode !== null) {
      const textNode = currentNode;
      nodes.push({
        node: textNode,
        text: textNode.nodeValue ?? ""
      });
      currentNode = walker.nextNode();
    }
    return nodes;
  }
  function isExtensionElement(target) {
    if (!(target instanceof Element)) {
      return false;
    }
    return isInsideExtensionElement(target);
  }
  function scanPageText(keywords, options = {}) {
    const visibleNodes = collectVisibleTextNodes();
    const summaries = [];
    const nodeResults = [];
    for (let i = 0; i < visibleNodes.length; i += 1) {
      const visibleNode = visibleNodes[i];
      const summary = scanText(visibleNode.text, { ...options, keywords });
      if (summary.matches.length > 0) {
        nodeResults.push({
          node: visibleNode.node,
          text: visibleNode.text,
          matches: summary.matches
        });
      }
      summaries.push(summary);
    }
    return {
      summary: combineScanSummaries(summaries),
      nodeResults
    };
  }
  const TOOLTIP_ID = "judol-detector-tooltip";
  const EXTENSION_ATTRIBUTE$1 = "data-judol-extension";
  function formatMs(value) {
    return `${value.toFixed(2)} ms`;
  }
  function ensureTooltipElement() {
    const existing = document.getElementById(TOOLTIP_ID);
    if (existing instanceof HTMLElement) {
      return existing;
    }
    const tooltip = document.createElement("div");
    tooltip.id = TOOLTIP_ID;
    tooltip.setAttribute(EXTENSION_ATTRIBUTE$1, "true");
    tooltip.className = "judol-detector-tooltip";
    document.documentElement.appendChild(tooltip);
    return tooltip;
  }
  function positionTooltip(tooltip, event) {
    const padding = 12;
    const offset = 14;
    const maxLeft = window.innerWidth - tooltip.offsetWidth - padding;
    const maxTop = window.innerHeight - tooltip.offsetHeight - padding;
    const nextLeft = Math.max(padding, Math.min(event.clientX + offset, maxLeft));
    const nextTop = Math.max(padding, Math.min(event.clientY + offset, maxTop));
    tooltip.style.left = `${nextLeft}px`;
    tooltip.style.top = `${nextTop}px`;
  }
  function clearElement(element) {
    while (element.firstChild !== null) {
      element.removeChild(element.firstChild);
    }
  }
  function appendTooltipRow(tooltip, labelText, valueText) {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const value = document.createElement("strong");
    label.textContent = labelText;
    value.textContent = valueText;
    row.appendChild(label);
    row.appendChild(value);
    tooltip.appendChild(row);
  }
  function setTooltipContent(tooltip, match, summary) {
    const occurrenceCount = getKeywordCount(summary, match.keyword);
    const executionTime = getAlgorithmExecutionTime(summary, match.algorithm);
    clearElement(tooltip);
    appendTooltipRow(tooltip, "Keyword", match.keyword);
    appendTooltipRow(tooltip, "Algorithm", match.algorithm);
    appendTooltipRow(tooltip, "Occurrences", String(occurrenceCount));
    appendTooltipRow(tooltip, "Time", formatMs(executionTime));
    if (match.score !== void 0) {
      appendTooltipRow(tooltip, "Score", match.score.toFixed(2));
    }
  }
  function attachTooltip(element, match, summary) {
    element.addEventListener("mouseenter", (event) => {
      const tooltip = ensureTooltipElement();
      setTooltipContent(tooltip, match, summary);
      tooltip.classList.add("judol-detector-tooltip--visible");
      positionTooltip(tooltip, event);
    });
    element.addEventListener("mousemove", (event) => {
      const tooltip = ensureTooltipElement();
      positionTooltip(tooltip, event);
    });
    element.addEventListener("mouseleave", () => {
      removeTooltip();
    });
  }
  function removeTooltip() {
    const tooltip = document.getElementById(TOOLTIP_ID);
    if (tooltip !== null) {
      tooltip.remove();
    }
  }
  const HIGHLIGHT_SELECTOR = '[data-judol-highlight="true"]';
  const EXTENSION_ATTRIBUTE = "data-judol-extension";
  function sortMatchesForHighlight(matches) {
    const sorted = matches.slice();
    sorted.sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      return right.end - left.end;
    });
    return sorted;
  }
  function selectNonOverlappingMatches(matches) {
    const sorted = sortMatchesForHighlight(matches);
    const selected = [];
    let lastEnd = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      const match = sorted[i];
      if (match.start < lastEnd || match.start >= match.end) {
        continue;
      }
      selected.push(match);
      lastEnd = match.end;
    }
    return selected;
  }
  function createHighlightSpan(match, summary) {
    const span = document.createElement("span");
    span.className = `judol-detector-highlight judol-detector-highlight--${match.algorithm.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    span.setAttribute("data-judol-highlight", "true");
    span.setAttribute(EXTENSION_ATTRIBUTE, "true");
    span.dataset.keyword = match.keyword;
    span.dataset.algorithm = match.algorithm;
    span.textContent = match.matchedText;
    attachTooltip(span, match, summary);
    return span;
  }
  function applyHighlights(node, matches, summary) {
    const parent = node.parentNode;
    if (parent === null || matches.length === 0) {
      return;
    }
    const selectedMatches = selectNonOverlappingMatches(matches);
    if (selectedMatches.length === 0) {
      return;
    }
    const originalText = node.nodeValue ?? "";
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (let i = 0; i < selectedMatches.length; i += 1) {
      const match = selectedMatches[i];
      if (match.start > cursor) {
        fragment.appendChild(document.createTextNode(originalText.slice(cursor, match.start)));
      }
      fragment.appendChild(createHighlightSpan(match, summary));
      cursor = match.end;
    }
    if (cursor < originalText.length) {
      fragment.appendChild(document.createTextNode(originalText.slice(cursor)));
    }
    parent.replaceChild(fragment, node);
  }
  function cleanupHighlights() {
    removeTooltip();
    const highlights = Array.from(document.querySelectorAll(HIGHLIGHT_SELECTOR));
    for (let i = 0; i < highlights.length; i += 1) {
      const highlight = highlights[i];
      const parent = highlight.parentNode;
      if (parent === null) {
        continue;
      }
      parent.replaceChild(document.createTextNode(highlight.textContent ?? ""), highlight);
      parent.normalize();
    }
  }
  function createDebouncedRescan(callback, delayMs) {
    let timerId;
    return () => {
      if (timerId !== void 0) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => {
        timerId = void 0;
        callback();
      }, delayMs);
    };
  }
  const BLUR_ATTR = "data-judol-blur";
  const EXTENSION_ATTR = "data-judol-extension";
  const BLUR_CLASS = "judol-detector-blur";
  function getBlurTarget(element) {
    const BLOCK_TAGS = /* @__PURE__ */ new Set([
      "P",
      "DIV",
      "SECTION",
      "ARTICLE",
      "ASIDE",
      "LI",
      "TD",
      "TH",
      "BLOCKQUOTE",
      "FIGCAPTION",
      "HEADER",
      "FOOTER",
      "MAIN",
      "NAV",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6"
    ]);
    let current = element.parentElement;
    while (current !== null && current !== document.body) {
      if (BLOCK_TAGS.has(current.tagName)) {
        return current;
      }
      current = current.parentElement;
    }
    return element.parentElement ?? element;
  }
  function applyBlurToHighlights() {
    const highlights = document.querySelectorAll('[data-judol-highlight="true"]');
    const alreadyBlurred = /* @__PURE__ */ new Set();
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
  function removeAllBlurs() {
    const blurred = document.querySelectorAll(`[${BLUR_ATTR}="true"]`);
    for (let i = 0; i < blurred.length; i += 1) {
      blurred[i].classList.remove(BLUR_CLASS);
      blurred[i].removeAttribute(BLUR_ATTR);
    }
  }
  let blurEnabled = false;
  function setBlurEnabled(enabled) {
    blurEnabled = enabled;
    if (enabled) {
      applyBlurToHighlights();
    } else {
      removeAllBlurs();
    }
  }
  function isBlurEnabled() {
    return blurEnabled;
  }
  function refreshBlur() {
    if (blurEnabled) {
      removeAllBlurs();
      applyBlurToHighlights();
    }
  }
  const RESCAN_DEBOUNCE_MS = 450;
  let cachedKeywords;
  let currentRecord;
  let activeScanPromise;
  let observer;
  async function loadKeywords() {
    if (cachedKeywords !== void 0) {
      return cachedKeywords;
    }
    const keywordUrl = chrome.runtime.getURL(DEFAULT_KEYWORD_PATH);
    cachedKeywords = await loadKeywordsFromUrl(keywordUrl);
    return cachedKeywords;
  }
  function createRecord(summary) {
    return {
      url: window.location.href,
      title: document.title,
      summary,
      updatedAt: Date.now()
    };
  }
  function broadcastScanUpdated(record) {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.scanUpdated, record }, () => {
      void chrome.runtime.lastError;
    });
  }
  function disconnectObserver() {
    observer?.disconnect();
  }
  function observePage() {
    const target = document.body ?? document.documentElement;
    if (target === null) {
      return;
    }
    if (observer === void 0) {
      observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i += 1) {
          const mutation = mutations[i];
          if (isExtensionElement(mutation.target)) {
            continue;
          }
          scheduleRescan();
          break;
        }
      });
    }
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  async function performPageScan() {
    disconnectObserver();
    cleanupHighlights();
    try {
      const keywords = await loadKeywords();
      const pageScan = scanPageText(keywords);
      for (let i = 0; i < pageScan.nodeResults.length; i += 1) {
        const result = pageScan.nodeResults[i];
        applyHighlights(result.node, result.matches, pageScan.summary);
      }
      refreshBlur();
      const record = createRecord(pageScan.summary);
      currentRecord = record;
      await saveScanRecord(record);
      broadcastScanUpdated(record);
      return record;
    } finally {
      observePage();
    }
  }
  function runPageScan() {
    if (activeScanPromise !== void 0) {
      return activeScanPromise;
    }
    activeScanPromise = performPageScan().finally(() => {
      activeScanPromise = void 0;
    });
    return activeScanPromise;
  }
  const scheduleRescan = createDebouncedRescan(() => {
    void runPageScan();
  }, RESCAN_DEBOUNCE_MS);
  function sendResponseSafely(sendResponse, response) {
    try {
      sendResponse(response);
    } catch {
    }
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === MESSAGE_TYPES.getSummary) {
      if (currentRecord !== void 0) {
        sendResponseSafely(sendResponse, { ok: true, record: currentRecord });
        return false;
      }
      runPageScan().then((record) => sendResponseSafely(sendResponse, { ok: true, record })).catch(
        (error) => sendResponseSafely(sendResponse, {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to scan page."
        })
      );
      return true;
    }
    if (message.type === MESSAGE_TYPES.rescan) {
      runPageScan().then((record) => sendResponseSafely(sendResponse, { ok: true, record })).catch(
        (error) => sendResponseSafely(sendResponse, {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to rescan page."
        })
      );
      return true;
    }
    if (message.type === MESSAGE_TYPES.setBlurMode) {
      const enabled = message.enabled;
      setBlurEnabled(enabled);
      saveBlurMode(enabled).catch(() => {
      });
      sendResponseSafely(sendResponse, { ok: true, enabled });
      return false;
    }
    if (message.type === MESSAGE_TYPES.getBlurMode) {
      sendResponseSafely(sendResponse, { ok: true, enabled: isBlurEnabled() });
      return false;
    }
    return false;
  });
  async function initialize() {
    try {
      const saved = await loadBlurMode();
      setBlurEnabled(saved);
    } catch {
    }
    observePage();
    void runPageScan();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void initialize();
    }, { once: true });
  } else {
    void initialize();
  }
})();
