// Turn a family's tally into crest specs. Same tally + seed = same crest.
import { VALUE_BY_ID, ANIMAL_CHOICES } from "./values.js";
import { LAYOUTS, SHIELDS, DIVISIONS, tinctureChecks } from "./crest.js";
import { CHARGES } from "./charges.js";
import { METALS, COLOURS, isMetal } from "./tinctures.js";
import { makeRng } from "./rng.js";
import { topValues } from "./creed.js";

const PARTY_DIVISIONS = [["pale", 4], ["fess", 3], ["bend", 4], ["bendSinister", 2], ["chevron", 3], ["quarterly", 3], ["saltire", 2], ["gyronny", 2], ["barry", 1], ["paly", 1], ["bendy", 1], ["chequy", 1]];

const VALUE_ANIMAL = { courage: "lion", strength: "bear", loyalty: "wolf", freedom: "eagle", wisdom: "owl", curiosity: "fox", peace: "dove", work: "bee", joy: "dolphin", patience: "turtle", love: "dove", kindness: "dove", learning: "owl", adventure: "eagle", togetherness: "wolf", humor: "fox", nature: "stag", hope: "dove", faith: "dove", service: "bee", tradition: "stag", fairness: "lion", excellence: "eagle", perseverance: "bear", hospitality: "bee", generosity: "bee", gratitude: "dove", respect: "stag", honesty: "dog", responsibility: "horse", humility: "turtle", forgiveness: "dove", creativity: "fox", health: "horse", simplicity: "turtle", music: "dove" };

function pickTincture(rng, pool, avoid = []) {
  const p = pool.filter((t) => !avoid.includes(t));
  return rng.pick(p.length ? p : pool);
}

// Design one crest. tally from creed.tally(); opts: { tone, occasion, seed, motto }
export function designCrest(t, opts = {}) {
  const seed = opts.seed || "0";
  const rng = makeRng("crest:" + seed);
  const vals = topValues(t, makeRng("creed:" + seed), 4).map((id) => VALUE_BY_ID[id]).filter(Boolean);
  const tone = opts.tone || "warm";

  // Colours: the family's favourite first.
  const favs = t.color.map(([c]) => c);
  let tf = favs.length ? favs[0] : vals[0]?.tincture || rng.pick(["azure", "gules", "vert"]);
  // A tie for favourite colour is broken by the seed.
  const topCount = t.color.length ? t.color[0][1] : 0;
  const tied = t.color.filter(([, n]) => n === topCount).map(([c]) => c);
  if (tied.length > 1) tf = rng.pick(tied);
  const want = (metal) => {
    const fromVotes = favs.find((c) => isMetal(c) === metal && c !== tf);
    if (fromVotes) return fromVotes;
    const fromValues = vals.map((v) => v.tincture).find((c) => isMetal(c) === metal && c !== tf);
    if (fromValues) return fromValues;
    return metal ? rng.pick(METALS) : pickTincture(rng, ["azure", "gules", "vert", "purpure"], [tf]);
  };
  const t2 = want(!isMetal(tf));

  // Charges: the family animal, then a symbol from the top values.
  let main = t.animal.length ? t.animal[0][0] : "";
  const aTop = t.animal.length ? t.animal[0][1] : 0;
  const aTied = t.animal.filter(([, n]) => n === aTop).map(([a]) => a);
  if (aTied.length > 1) main = rng.pick(aTied);
  if (!main || !CHARGES[main]) main = (vals[0] && VALUE_ANIMAL[vals[0].id]) || "lion";
  // Symbols that read alike at small sizes never share a shield.
  const LOOKALIKE = { lion: ["sun"], sun: ["lion"], dove: ["olive"], olive: ["dove"] };
  const symbolPool = vals.flatMap((v, i) => v.charges.map((c, j) => [c, (4 - i) * (2 - j)]))
    .filter(([c]) => c !== main && CHARGES[c] && !(LOOKALIKE[main] || []).includes(c));
  const second = symbolPool.length ? rng.weighted(symbolPool) : "star";

  // Layout: weighted by values and occasion.
  const w = { center: 3, party: 3, impaled: 1, quarterly: 1.5, chief: 2.5, chevron: 2.5, fess: 1.5, bend: 1.5, cross: 0.6, saltire: 1, canton: 1, bordure: 2 };
  vals.forEach((v, i) => (v.layouts || []).forEach((l) => (w[l] = (w[l] || 0) + (i === 0 ? 3 : 1.5))));
  if (opts.occasion === "wedding") { w.impaled += 6; w.party += 2; }
  if (opts.occasion === "baby") { w.bordure += 2; w.center += 1; }
  if (opts.occasion === "reunion") { w.quarterly += 2; w.chief += 1; }
  if (vals.some((v) => v.id === "faith")) w.cross += 2;
  if (CHARGES[second]?.single) { w.chief = 0; w.cross = 0; w.saltire = 0; w.chevron = 0; }
  const layout = opts.layout || rng.weighted(Object.entries(w));

  // Partition line: mostly straight, nudged by values.
  const lw = { straight: 7, wavy: 1, indented: 0.6, embattled: 0.8, engrailed: 0.8, invected: 0.4, dancetty: 0.4 };
  vals.forEach((v, i) => (v.lines || []).forEach((l) => (lw[l] += i === 0 ? 2.5 : 1.2)));
  const line = rng.weighted(Object.entries(lw));

  let division = "pale";
  if (layout === "party") {
    const dw = PARTY_DIVISIONS.map(([d, x]) => [d, x]);
    division = rng.weighted(dw);
  }

  // Tinctures by the rule of tincture: metal on colour, colour on metal.
  const opposite = (x) => (isMetal(x) ? (isMetal(t2) ? want(false) : t2) : isMetal(t2) ? t2 : want(true));
  const metalOther = (x) => (x === "or" ? "argent" : "or");
  let to = opposite(tf), tm = opposite(tf), ts = opposite(tf);
  const variety = rng.next();
  switch (layout) {
    case "chief": case "canton": case "bordure":
      to = opposite(tf);
      tm = variety < 0.5 ? to : isMetal(to) ? metalOther(to) : opposite(tf);
      ts = isMetal(to) ? (isMetal(tf) ? want(false) : tf) : want(true);
      break;
    case "cross": case "saltire":
      to = opposite(tf);
      tm = isMetal(to) ? (isMetal(tf) ? want(false) : tf) : want(true);
      ts = variety < 0.5 ? to : isMetal(to) ? metalOther(to) : opposite(tf);
      break;
    case "chevron": case "fess": case "bend":
      to = opposite(tf);
      tm = variety < 0.6 ? to : isMetal(to) ? metalOther(to) : to;
      ts = tm;
      break;
    default:
      to = opposite(tf);
      tm = opposite(tf);
      ts = tm;
  }
  const isParty = LAYOUTS[layout]?.party;
  const spec = {
    shield: rng.weighted([["heater", 5], ["french", 2], ["spanish", 2], ["swiss", 1], ["oval", 1]]),
    layout, division, line,
    t: [tf, t2, to, tm, ts],
    main, second,
    bordureCharged: layout === "bordure" && rng.chance(0.5) && !CHARGES[second]?.single,
    frame: tone === "playful" ? rng.weighted([["none", 3], ["laurel", 1]]) : rng.weighted([["laurel", 3], ["oak", 1.5], ["none", 2]]),
    frameT: rng.chance(0.75) ? "or" : "vert",
    crest: tone === "classic" ? rng.chance(0.6) : rng.chance(0.3),
    crestCharge: rng.chance(0.5) ? main : second,
    ribbon: true,
    ribbonText: opts.motto ? String(opts.motto).toUpperCase() : "",
    finish: "shaded",
  };
  // Party fields need two contrasting tinctures; every check must pass.
  if (isParty && !tinctureChecks(spec).every((c) => c.ok)) spec.t[1] = isMetal(tf) ? want(false) : want(true);
  return spec;
}

// Three distinct options for the family to vote on.
export function designOptions(t, opts = {}, n = 3) {
  const out = [];
  const used = new Set();
  for (let k = 0; out.length < n && k < 40; k++) {
    const s = designCrest(t, { ...opts, seed: `${opts.seed || "0"}-${k}` });
    if (used.has(s.layout) && k < 30) continue;
    used.add(s.layout);
    out.push({ seed: `${opts.seed || "0"}-${k}`, spec: s });
  }
  return out;
}

export { SHIELDS, LAYOUTS, DIVISIONS, ANIMAL_CHOICES };
