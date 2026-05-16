import type { AlgorithmName } from "../algorithms/types";

export const DEFAULT_FUZZY_THRESHOLD = 0.85;
export const VISUAL_SUBSTITUTION_COST = 0.25;
export const NORMAL_SUBSTITUTION_COST = 1;
export const INSERTION_COST = 1;
export const DELETION_COST = 1;

export const ACTIVE_ALGORITHMS: AlgorithmName[] = [
  "KMP",
  "Boyer-Moore",
  "RegEx",
  "Weighted-Levenshtein"
];

export const DEFAULT_KEYWORDS = ["GACOR99", "MAXWIN88", "HOKI88", "SLOT99"];
export const DEFAULT_KEYWORD_PATH = "keywords/keywords.txt";
