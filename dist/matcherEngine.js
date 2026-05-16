const E = {
  0: "O",
  4: "A",
  1: "I",
  3: "E",
  5: "S",
  8: "B",
  $: "S",
  "@": "A",
  "!": "I",
  "|": "I",
  Α: "A",
  Ο: "O",
  Ε: "E",
  Ι: "I"
};
function f(o) {
  return o.toUpperCase();
}
function C(o) {
  const n = f(o), t = E[n];
  return t !== void 0 ? t : n;
}
function L(o, n) {
  return C(o) === C(n);
}
function b(o) {
  if (o.length === 0)
    return !1;
  const n = o.charCodeAt(0), t = n >= 48 && n <= 57, e = n >= 65 && n <= 90, s = n >= 97 && n <= 122;
  return t || e || s;
}
function O(o) {
  const n = f(o), t = /* @__PURE__ */ new Map();
  for (let e = 0; e < n.length; e += 1)
    t.set(n[e], e);
  return t;
}
function k(o, n) {
  const t = f(o), e = f(n), s = [];
  let i = 0;
  if (e.length === 0 || t.length < e.length)
    return { matches: s, comparisons: i };
  const l = O(e);
  let u = 0;
  for (; u <= t.length - e.length; ) {
    let r = e.length - 1;
    for (; r >= 0; ) {
      if (i += 1, e[r] === t[u + r]) {
        r -= 1;
        continue;
      }
      const a = t[u + r], c = l.get(a), d = r - (c === void 0 ? -1 : c);
      u += Math.max(1, d);
      break;
    }
    if (r < 0) {
      const a = u, c = u + e.length;
      s.push({
        keyword: e,
        matchedText: o.slice(a, c),
        algorithm: "Boyer-Moore",
        start: a,
        end: c,
        comparisons: i
      }), u += 1;
    }
  }
  return { matches: s, comparisons: i };
}
function I(o) {
  const n = f(o), t = new Array(n.length).fill(0);
  let e = 0, s = 1;
  for (; s < n.length; ) {
    if (n[s] === n[e]) {
      e += 1, t[s] = e, s += 1;
      continue;
    }
    if (e > 0) {
      e = t[e - 1];
      continue;
    }
    t[s] = 0, s += 1;
  }
  return t;
}
function v(o, n) {
  const t = f(o), e = f(n), s = [];
  let i = 0;
  if (e.length === 0 || t.length < e.length)
    return { matches: s, comparisons: i };
  const l = I(e);
  let u = 0, r = 0;
  for (; u < t.length; ) {
    if (i += 1, t[u] === e[r]) {
      if (u += 1, r += 1, r === e.length) {
        const a = u - e.length, c = u;
        s.push({
          keyword: e,
          matchedText: o.slice(a, c),
          algorithm: "KMP",
          start: a,
          end: c,
          comparisons: i
        }), r = l[r - 1];
      }
      continue;
    }
    if (r > 0) {
      r = l[r - 1];
      continue;
    }
    u += 1;
  }
  return { matches: s, comparisons: i };
}
const p = /(^|[^A-Za-z0-9])([A-Za-z]+[0-9]{2,3})(?![A-Za-z0-9])/g;
function D(o) {
  const n = [];
  let t = p.exec(o);
  for (; t !== null; ) {
    const e = t[1] ?? "", s = t[2] ?? "", i = t.index + e.length, l = i + s.length, u = f(s);
    n.push({
      keyword: u,
      matchedText: s,
      algorithm: "RegEx",
      start: i,
      end: l,
      comparisons: 0
    }), p.lastIndex <= t.index && (p.lastIndex = t.index + 1), t = p.exec(o);
  }
  return p.lastIndex = 0, { matches: n, comparisons: 0 };
}
const z = 0.85, _ = 0.25, U = 1, P = 1, N = 1, B = [
  "KMP",
  "Boyer-Moore",
  "RegEx",
  "Weighted-Levenshtein"
], W = ["GACOR99", "MAXWIN88", "HOKI88", "SLOT99"], F = "keywords/keywords.txt";
function H(o, n, t) {
  return o === n ? 0 : L(o, n) ? t.visualSubstitutionCost : t.normalSubstitutionCost;
}
function V(o = {}) {
  return {
    visualSubstitutionCost: o.visualSubstitutionCost ?? _,
    normalSubstitutionCost: o.normalSubstitutionCost ?? U,
    insertionCost: o.insertionCost ?? P,
    deletionCost: o.deletionCost ?? N
  };
}
function Z(o, n, t = {}) {
  const e = f(o), s = f(n), i = V(t), l = [];
  let u = 0;
  for (let r = 0; r <= e.length; r += 1)
    l[r] = [], l[r][0] = r * i.deletionCost;
  for (let r = 0; r <= s.length; r += 1)
    l[0][r] = r * i.insertionCost;
  for (let r = 1; r <= e.length; r += 1)
    for (let a = 1; a <= s.length; a += 1) {
      u += 1;
      const c = H(
        e[r - 1],
        s[a - 1],
        i
      ), m = l[r - 1][a] + i.deletionCost, d = l[r][a - 1] + i.insertionCost, h = l[r - 1][a - 1] + c;
      l[r][a] = Math.min(m, d, h);
    }
  return {
    distance: l[e.length][s.length],
    comparisons: u
  };
}
function Y(o) {
  const n = f(o), t = [];
  let e = -1;
  for (let s = 0; s < n.length; s += 1) {
    if (b(n[s])) {
      e < 0 && (e = s);
      continue;
    }
    e >= 0 && (t.push({
      normalizedText: n.slice(e, s),
      start: e,
      end: s
    }), e = -1);
  }
  return e >= 0 && t.push({
    normalizedText: n.slice(e, n.length),
    start: e,
    end: n.length
  }), t;
}
function j(o, n, t = z, e = {}) {
  const s = f(n), i = [];
  let l = 0;
  if (s.length === 0)
    return { matches: i, comparisons: l };
  const u = Y(o), r = Math.max(1, Math.floor(s.length * 0.2));
  for (let a = 0; a < u.length; a += 1) {
    const c = u[a];
    if (Math.abs(c.normalizedText.length - s.length) > r)
      continue;
    const d = Z(c.normalizedText, s, e);
    l += d.comparisons;
    const h = Math.max(c.normalizedText.length, s.length), w = h === 0 ? 1 : Math.max(0, 1 - d.distance / h);
    w >= t && i.push({
      keyword: s,
      matchedText: o.slice(c.start, c.end),
      algorithm: "Weighted-Levenshtein",
      start: c.start,
      end: c.end,
      score: w,
      comparisons: l
    });
  }
  return { matches: i, comparisons: l };
}
function M(o) {
  const n = [], t = /* @__PURE__ */ new Set();
  for (let e = 0; e < o.length; e += 1) {
    const s = f(o[e].trim());
    s.length !== 0 && (t.has(s) || (t.add(s), n.push(s)));
  }
  return n;
}
function R(o) {
  const n = [];
  let t = "";
  for (let e = 0; e < o.length; e += 1) {
    const s = o[e];
    if (s === `
` || s === "\r") {
      n.push(t), t = "";
      continue;
    }
    t += s;
  }
  return n.push(t), M(n);
}
async function $(o = F, n = fetch) {
  const t = await n(o);
  if (!t.ok)
    throw new Error(`Failed to load keywords from ${o}: ${t.status}`);
  return R(await t.text());
}
function g() {
  return typeof performance < "u" && typeof performance.now == "function" ? performance.now() : Date.now();
}
function y(o, n) {
  for (let t = 0; t < o.length; t += 1)
    if (o[t] === n)
      return !0;
  return !1;
}
function q(o) {
  return o.keywords !== void 0 ? M(o.keywords) : o.keywordText !== void 0 ? R(o.keywordText) : M(W);
}
function T(o, n, t, e) {
  return {
    algorithm: o,
    matchCount: n,
    executionTimeMs: t,
    comparisons: e
  };
}
function A(o, n, t) {
  const e = [], s = /* @__PURE__ */ new Set();
  let i = 0;
  for (let l = 0; l < n.length; l += 1) {
    const u = n[l], r = t === "KMP" ? v(o, u) : k(o, u);
    i += r.comparisons, r.matches.length > 0 && s.add(f(u));
    for (let a = 0; a < r.matches.length; a += 1)
      e.push(r.matches[a]);
  }
  return {
    runResult: { matches: e, comparisons: i },
    exactKeywords: s
  };
}
function K(o, n) {
  for (const t of n)
    o.add(t);
}
function G(o) {
  const n = {};
  for (let t = 0; t < o.length; t += 1) {
    const e = o[t].keyword;
    n[e] = (n[e] ?? 0) + 1;
  }
  return n;
}
function X(o, n) {
  return o.start === n.start && o.end === n.end;
}
function J(o) {
  const n = [];
  for (let t = 0; t < o.length; t += 1) {
    const e = o[t];
    let s = !1;
    for (let i = 0; i < n.length; i += 1)
      if (X(e, n[i])) {
        s = !0;
        break;
      }
    s || n.push(e);
  }
  return n.sort((t, e) => t.start !== e.start ? t.start - e.start : t.end - e.end), n;
}
function Q(o, n = {}) {
  const t = q(n), e = n.activeAlgorithms ?? B, s = n.fuzzyThreshold ?? z, i = [], l = [], u = /* @__PURE__ */ new Set();
  if (y(e, "KMP")) {
    const a = g(), { runResult: c, exactKeywords: m } = A(o, t, "KMP"), d = g() - a;
    K(u, m), l.push(T("KMP", c.matches.length, d, c.comparisons));
    for (let h = 0; h < c.matches.length; h += 1)
      i.push(c.matches[h]);
  }
  if (y(e, "Boyer-Moore")) {
    const a = g(), { runResult: c, exactKeywords: m } = A(o, t, "Boyer-Moore"), d = g() - a;
    K(u, m), l.push(
      T("Boyer-Moore", c.matches.length, d, c.comparisons)
    );
    for (let h = 0; h < c.matches.length; h += 1)
      i.push(c.matches[h]);
  }
  if (y(e, "RegEx")) {
    const a = g(), c = D(o), m = g() - a;
    l.push(T("RegEx", c.matches.length, m, c.comparisons));
    for (let d = 0; d < c.matches.length; d += 1)
      i.push(c.matches[d]);
  }
  if (y(e, "Weighted-Levenshtein")) {
    const a = g(), c = [];
    let m = 0;
    for (let h = 0; h < t.length; h += 1) {
      const w = f(t[h]);
      if (u.has(w))
        continue;
      const x = j(o, w, s);
      m += x.comparisons;
      for (let S = 0; S < x.matches.length; S += 1)
        c.push(x.matches[S]);
    }
    const d = g() - a;
    l.push(T("Weighted-Levenshtein", c.length, d, m));
    for (let h = 0; h < c.length; h += 1)
      i.push(c[h]);
  }
  const r = J(i);
  return {
    totalMatches: r.length,
    keywordCounts: G(r),
    algorithmStats: l,
    scannedAt: Date.now(),
    matches: r
  };
}
async function tt(o, n, t = {}) {
  const e = await $(n);
  return Q(o, {
    ...t,
    keywords: e
  });
}
export {
  Q as scanText,
  tt as scanTextWithKeywordUrl
};
