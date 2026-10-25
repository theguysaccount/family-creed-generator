// What each element of a crest traditionally stands for, in plain words. Older readings follow
// W. Cecil Wade, "The Symbolism of Heraldry" (1898, public domain); the rest are modern readings.
// These are associations, not rules: a family can give any symbol its own meaning.
import { CHARGES } from "./charges.js";
import { TINCTURES } from "./tinctures.js";
import { ANIMAL_CHOICES } from "./values.js";
import { LAYOUTS, DIVISIONS, LINES } from "./crest.js";

export const CHARGE_MEANINGS = {
  star: "high aims and a guiding light",
  crescent: "hope and growing glory",
  heart: "love and sincerity",
  sun: "glory, warmth and new beginnings",
  rose: "hope and joy",
  fleur: "light and purity",
  tree: "strength, long life and deep roots",
  key: "guardianship and trust",
  anchor: "hope and steadiness",
  book: "learning and knowledge",
  tower: "safety and steadfastness",
  mountain: "steadfastness and challenges overcome",
  wheat: "plenty and the harvest of hope",
  lamp: "wisdom and truth",
  shell: "travel and pilgrimage",
  cross: "faith",
  sword: "courage and justice",
  flame: "zeal and passion",
  hammer: "honest work",
  leaf: "strength and growth",
  acorn: "patience and great things from small beginnings",
  scales: "fairness and justice",
  chaplet: "victory and excellence",
  compass: "direction and adventure",
  feather: "freedom and the written word",
  palette: "creativity",
  clover: "good luck and lasting things",
  apple: "health and plenty",
  pine: "endurance through every season",
  lyre: "music and harmony",
  house: "home and welcome",
  hourglass: "patience and the value of time",
  olive: "peace",
  rings: "unity: two joined as one",
};
for (const a of ANIMAL_CHOICES) CHARGE_MEANINGS[a.id] = a.meaning;

export const ORDINARY_MEANINGS = {
  chief: "the chief, a band across the top, stands for leadership and achievement",
  chevron: "the chevron, like the rafters of a roof, stands for protection and work well done",
  fess: "the fess, a band across the middle, stands for readiness to serve",
  bend: "the bend, a diagonal band, stands for protection and defense",
  cross: "the cross stands for faith",
  saltire: "the saltire, a diagonal cross, stands for resolve",
  canton: "the canton, a square in the corner, is a mark of honor",
  bordure: "the bordure, a border around the shield, stands for protection of what is inside",
};

export const LAYOUT_MEANINGS = {
  party: "a divided field with the charge in both colors (counterchanged) shows two parts of one whole",
  impaled: "a shield split in two halves shows two families joined, as heraldry has long done for marriages",
  quarterly: "quarters show several branches of one family held together",
  center: "a single great charge says one thing, clearly",
};

// A short "why your crest looks like this" list for a spec.
export function explain(spec, motto) {
  const out = [];
  const [tf, t2, to, tm, ts] = spec.t;
  const tin = (t) => `${TINCTURES[t].name} (${TINCTURES[t].plain}): ${TINCTURES[t].meaning}`;
  out.push(tin(tf));
  if (["party", "impaled", "quarterly"].includes(spec.layout)) out.push(tin(t2));
  else if (to && to !== tf && LAYOUTS[spec.layout]?.ordinary) out.push(tin(to));
  const m = CHARGES[spec.main], s = CHARGES[spec.second];
  if (m) out.push(`The ${m.plain}: ${CHARGE_MEANINGS[spec.main] || "a symbol of the family"}`);
  const usesSecond = !["center", "party"].includes(spec.layout) || spec.crest && spec.crestCharge === spec.second;
  if (s && usesSecond && spec.second !== spec.main) out.push(`The ${s.plain}: ${CHARGE_MEANINGS[spec.second] || "a symbol of the family"}`);
  const ord = LAYOUTS[spec.layout]?.ordinary;
  if (ord && ORDINARY_MEANINGS[ord]) out.push(cap(ORDINARY_MEANINGS[ord]));
  else if (LAYOUT_MEANINGS[spec.layout]) out.push(cap(LAYOUT_MEANINGS[spec.layout]));
  if (spec.line && spec.line !== "straight" && (LAYOUTS[spec.layout]?.lines || spec.layout === "party")) {
    const w = { wavy: "water and movement", embattled: "a castle wall: defense and strength", indented: "energy and fire", dancetty: "energy and fire", engrailed: "earth and steadiness", invected: "earth and steadiness" }[spec.line];
    if (w) out.push(`The ${LINES[spec.line].word} line suggests ${w}`);
  }
  if (spec.frame === "laurel") out.push("The laurel wreath: honor and achievement");
  if (spec.frame === "oak") out.push("The oak wreath: strength and endurance");
  if (motto?.text) out.push(`The motto: ${motto.text}${motto.translation ? ` (“${motto.translation}”)` : ""}`);
  return out;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export { DIVISIONS };
