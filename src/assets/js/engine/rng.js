// Seeded randomness, so the same answers and seed always give the same creed and crest.
// Used in the browser and in the Node tests and build.

// 32-bit FNV-1a hash of a string.
export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: small, fast and good enough for picking phrases and shapes.
export function makeRng(seed) {
  let a = (typeof seed === "string" ? hashString(seed) : seed >>> 0) || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle(arr) {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    // Weighted pick from [[item, weight], ...]; weights <= 0 are skipped.
    weighted(pairs) {
      const total = pairs.reduce((s, [, w]) => s + Math.max(0, w), 0);
      if (total <= 0) return pairs.length ? pairs[0][0] : undefined;
      let r = next() * total;
      for (const [item, w] of pairs) {
        if (w <= 0) continue;
        r -= w;
        if (r < 0) return item;
      }
      return pairs[pairs.length - 1][0];
    },
  };
  return rng;
}

// A short random seed for a new design (base36, 6 chars).
export function newSeed() {
  const n = Math.floor(Math.random() * 2176782336);
  return n.toString(36).padStart(6, "0");
}
