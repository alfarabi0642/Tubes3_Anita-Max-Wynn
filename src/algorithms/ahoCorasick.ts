import type { MatchResult, MatcherRunResult } from "./types";
import { normalizeCase } from "../shared/normalize";


interface AhoCorasickNode {
  goto: Map<string, number>;   
  failure: number;             
  output: string[];           
}

export interface AhoCorasickAutomaton {
  nodes: AhoCorasickNode[];
}

function makeNode(): AhoCorasickNode {
  return { goto: new Map(), failure: 0, output: [] };
}

export function buildAhoCorasick(keywords: string[]): AhoCorasickAutomaton {
  const nodes: AhoCorasickNode[] = [makeNode()]; 

  for (let ki = 0; ki < keywords.length; ki += 1) {
    const normalizedKeyword = normalizeCase(keywords[ki]);

    if (normalizedKeyword.length === 0) {
      continue;
    }
    let current = 0;

    for (let ci = 0; ci < normalizedKeyword.length; ci += 1) {
      const char = normalizedKeyword[ci];
      let next = nodes[current].goto.get(char);

      if (next === undefined) {
        next = nodes.length;
        nodes.push(makeNode());
        nodes[current].goto.set(char, next);
      }

      current = next;
    }

    nodes[current].output.push(normalizedKeyword);
  }

  const queue: number[] = [];

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
      nodes[child].failure = nextFailure !== undefined && nextFailure !== child ? nextFailure : 0;

      const failureNode = nodes[nodes[child].failure];
      for (let oi = 0; oi < failureNode.output.length; oi += 1) {
        nodes[child].output.push(failureNode.output[oi]);
      }

      queue.push(child);
    }
  }

  return { nodes };
}

export function searchAhoCorasick(
  text: string,
  automaton: AhoCorasickAutomaton
): MatcherRunResult {
  const normalizedText = normalizeCase(text);
  const { nodes } = automaton;
  const matches: MatchResult[] = [];
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

    if (next !== undefined) {
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


export function searchAhoCorasickWithKeywords(
  text: string,
  keywords: string[]
): MatcherRunResult {
  const automaton = buildAhoCorasick(keywords);
  return searchAhoCorasick(text, automaton);
}
