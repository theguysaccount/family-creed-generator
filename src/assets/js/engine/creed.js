// Assemble a family creed and motto from everyone's answers, using only the curated lines in
// this file and values.js. No AI and no network: the same answers and seed give the same text.
import { VALUES, VALUE_BY_ID, ANIMAL_CHOICES, COLOR_CHOICES } from "./values.js";
import { makeRng } from "./rng.js";

export const TONES = [
  { id: "classic", label: "Classic", hint: "Timeless and formal" },
  { id: "warm", label: "Warm", hint: "Heartfelt and plain-spoken" },
  { id: "playful", label: "Playful", hint: "Funny, but still true" },
];

export const OCCASIONS = [
  { id: "none", label: "Just because" },
  { id: "gift", label: "A holiday gift" },
  { id: "wedding", label: "A wedding" },
  { id: "baby", label: "A new baby" },
  { id: "reunion", label: "A family reunion" },
  { id: "home", label: "A new home" },
  { id: "memorial", label: "Remembering someone" },
];

export const ACTIVITIES = [
  { id: "table", label: "Eat together", classic: "We gather at our table, and there is always a place for one more.", warm: "We eat dinner together as often as we can.", playful: "We eat together, and nobody touches their phone. Mostly." },
  { id: "laugh", label: "Laugh at our own jokes", classic: "We fill our home with laughter.", warm: "We laugh together at the end of every day.", playful: "We laugh at our own jokes, especially the bad ones." },
  { id: "travel", label: "Go on road trips", classic: "We journey together and count the miles as blessings.", warm: "We take road trips and remember the stops more than the places.", playful: "We sing badly on long drives and stop at every roadside attraction." },
  { id: "cook", label: "Cook and bake", classic: "We feed one another with food made by hand.", warm: "We cook together and share our recipes.", playful: "We bake on rainy days and fight over who licks the spoon." },
  { id: "games", label: "Play games", classic: "We play together and take defeat with grace.", warm: "We play games together and cheer for whoever wins.", playful: "We play games with house rules and very serious trash talk." },
  { id: "music", label: "Make music", classic: "We make music together.", warm: "We sing and play music together.", playful: "We sing in the car and argue about the playlist." },
  { id: "outdoors", label: "Get outside", classic: "We walk the hills and forests together.", warm: "We spend our weekends outside together.", playful: "We go outside, even when it's raining sideways." },
  { id: "help", label: "Help our neighbors", classic: "We serve our neighbors and our community.", warm: "We volunteer together and look out for our neighbors.", playful: "We are the first to show up with a casserole." },
  { id: "worship", label: "Pray or worship", classic: "We pray together and give thanks.", warm: "We worship together and keep our faith close.", playful: "We pray together, sometimes for parking spots." },
  { id: "sports", label: "Play or watch sports", classic: "We compete with honor and cheer one another on.", warm: "We cheer each other on, on the field and off.", playful: "We cheer the loudest from the stands. Sorry, neighbors." },
  { id: "stories", label: "Tell stories", classic: "We keep our stories and tell them to the young.", warm: "We tell our family stories and listen to the old ones.", playful: "We tell the same stories every holiday, and they get better every year." },
  { id: "holidays", label: "Celebrate holidays", classic: "We keep the feasts and holidays together.", warm: "We make every holiday special, together.", playful: "We decorate early and take the lights down late." },
  { id: "making", label: "Build and make things", classic: "We build with our own hands.", warm: "We fix, build and make things together.", playful: "We built at least one thing that fell over, so we built it again." },
  { id: "reading", label: "Read together", classic: "We read together and share what we learn.", warm: "We read together before bed.", playful: "We have more books than shelves." },
  { id: "movies", label: "Movie nights", classic: "We gather each week to rest and share stories.", warm: "We never skip movie night.", playful: "We have a family movie night with a very strict popcorn policy." },
  { id: "pets", label: "Care for our animals", classic: "We care for every creature in our keeping.", warm: "We love our pets like family, because they are.", playful: "We are owned by our pets, and we're fine with it." },
];

export const HARD_TIMES = [
  { id: "together", label: "Stick together", classic: "When storms come, we stand together.", warm: "When things get hard, we stick together.", playful: "When things get hard, we huddle up like penguins." },
  { id: "keepgoing", label: "Keep going", classic: "When the road is hard, we keep walking.", warm: "When life is hard, we keep going, one step at a time.", playful: "When things get hard, we keep going, with snack breaks." },
  { id: "laugh", label: "Find something to laugh about", classic: "In hard times, we keep our good humor.", warm: "When things get hard, we still find a reason to laugh.", playful: "When things get hard, someone tells a terrible joke, and it helps." },
  { id: "pray", label: "Pray", classic: "In times of trouble, we pray and hold one another close.", warm: "When things get hard, we pray for each other.", playful: "When things get hard, we pray, and then we make tea." },
  { id: "talk", label: "Talk it out", classic: "We speak openly and settle our troubles together.", warm: "When things get hard, we talk it out.", playful: "When things get hard, we call a family meeting. With snacks." },
  { id: "help", label: "Help each other", classic: "We carry one another's burdens.", warm: "When one of us struggles, the rest of us help.", playful: "When things get hard, we show up with soup and a blanket." },
  { id: "breathe", label: "Take a breath", classic: "In trouble, we keep calm and think clearly.", warm: "When things get hard, we take a breath and slow down.", playful: "When things get hard, we take a deep breath and a short nap." },
  { id: "fix", label: "Fix it together", classic: "We meet every problem with resolve and good sense.", warm: "When something breaks, we fix it together.", playful: "When things break, we find duct tape and optimism." },
];

export const LEGACY = [
  { id: "kind", label: "Kind", adj: "kind" }, { id: "brave", label: "Brave", adj: "brave" },
  { id: "generous", label: "Generous", adj: "generous" }, { id: "loving", label: "Loving", adj: "loving" },
  { id: "honest", label: "Honest", adj: "honest" }, { id: "faithful", label: "Faithful", adj: "faithful" },
  { id: "joyful", label: "Joyful", adj: "joyful" }, { id: "wise", label: "Wise", adj: "wise" },
  { id: "hardworking", label: "Hard-working", adj: "hard-working" }, { id: "adventurous", label: "Adventurous", adj: "adventurous" },
  { id: "fun", label: "Fun", adj: "fun" }, { id: "close", label: "Close-knit", adj: "close-knit" },
];

const LEGACY_TEMPLATES = {
  classic: ["Let it be said of the {Family}: they were {adj}.", "May those who come after us say that we were {adj}."],
  warm: ["We hope our great-grandchildren will say we were {adj}.", "One day, we hope people will say: they were {adj}, and they loved each other."],
  playful: ["In a hundred years, people will say we were {adj}. And loud.", "Our great-great-grandkids will say we were {adj}, and that we had excellent snacks."],
};

const OPENINGS = {
  classic: ["We, the {Family}, hold these things to be true:", "This is the creed of the {Family}:", "Here is what the {Family} stands for:"],
  warm: ["This is who we are:", "In the {Family}:", "Here is what we believe, together:"],
  playful: ["The official rules of the {Family} (no take-backs):", "Hear ye, hear ye! The creed of the {Family}:", "The {Family} code:"],
};
const OPENINGS_NO_NAME = {
  classic: ["We hold these things to be true:", "This is our family creed:", "Here is what our family stands for:"],
  warm: ["This is who we are:", "In our family:", "Here is what we believe, together:"],
  playful: ["The official family rules (no take-backs):", "Hear ye, hear ye! Our family creed:", "Our family code:"],
};
const CLOSINGS = {
  classic: ["This is the {Family} way.", "So it is, and so it shall be.", "Bound by love, we go forward together."],
  warm: ["Wherever we go, we go together.", "This is our family, and this is our promise.", "Home is wherever we are together."],
  playful: ["Signed, sealed and stuck to the fridge.", "That's the {Family} way. No refunds.", "Family meeting adjourned. Snacks are in the kitchen."],
};
const CLOSINGS_NO_NAME = {
  classic: ["This is our way.", "So it is, and so it shall be.", "Bound by love, we go forward together."],
  warm: CLOSINGS.warm,
  playful: ["Signed, sealed and stuck to the fridge.", "That's our way. No refunds.", "Family meeting adjourned. Snacks are in the kitchen."],
};
const OCCASION_LINES = {
  wedding: { classic: "From this day forward, two families become one.", warm: "Today our two families become one.", playful: "We said yes, and now everyone is stuck with us." },
  baby: { classic: "We welcome our newest member into a house full of love.", warm: "We welcome our new baby into a family full of love.", playful: "We welcome our newest member, who is already in charge." },
  reunion: { classic: "However far we wander, we gather again.", warm: "Wherever life takes us, we come home to each other.", playful: "We travel from everywhere to eat too much together." },
  home: { classic: "We bless this house and all who enter it.", warm: "This new home is ours to fill with love.", playful: "New house, same family, more boxes." },
  memorial: { classic: "We carry the love of those who came before us.", warm: "We remember the ones we have lost, and we live the way they taught us.", playful: "We remember the ones we have lost, and we live the way they taught us." },
};

// Curated Latin mottos with honest translations, keyed by the value they suit.
export const LATIN_MOTTOS = {
  togetherness: [["Cor Unum", "One heart"], ["Familia Supra Omnia", "Family above all"], ["Simul Fortiores", "Stronger together"]],
  love: [["Amor Vincit Omnia", "Love conquers all"], ["Ubi Amor, Ibi Domus", "Where there is love, there is home"]],
  courage: [["Fortes Fortuna Iuvat", "Fortune favors the brave"]],
  adventure: [["Audentes Fortuna Iuvat", "Fortune favors the bold"], ["Ad Astra", "To the stars"]],
  work: [["Labor Omnia Vincit", "Work conquers all"], ["Nihil Sine Labore", "Nothing without work"]],
  perseverance: [["Per Aspera ad Astra", "Through hardships to the stars"]],
  hope: [["Dum Spiramus, Speramus", "While we breathe, we hope"]],
  patience: [["Festina Lente", "Make haste slowly"]],
  learning: [["Sapere Aude", "Dare to be wise"]],
  wisdom: [["Sapere Aude", "Dare to be wise"]],
  service: [["Non Nobis Solum", "Not for ourselves alone"]],
  excellence: [["Semper ad Meliora", "Always toward better things"]],
  joy: [["Carpe Diem", "Seize the day"]],
  peace: [["Pax et Bonum", "Peace and goodness"]],
  gratitude: [["Gratias Agimus", "We give thanks"]],
  faith: [["In Deo Spes Nostra", "Our hope is in God"]],
  curiosity: [["Quaerite et Invenietis", "Seek and you will find"]],
  honesty: [["Veritas Vincit", "Truth prevails"]],
  strength: [["Semper Fortes", "Always strong"]],
  loyalty: [["Fideles ad Finem", "Faithful to the end"]],
  tradition: [["Memores Maiorum", "Mindful of our ancestors"]],
  humor: [["Ridere et Amare", "To laugh and to love"]],
  nature: [["Natura Duce", "With nature as our guide"]],
  freedom: [["Libertate Floremus", "In freedom we flourish"]],
  music: [["Cantando Vivimus", "We live by singing"]],
  health: [["Mens Sana in Corpore Sano", "A sound mind in a sound body"]],
  simplicity: [["Simplex Munditiis", "Simple and elegant"]],
  hospitality: [["Domus Omnibus Patet", "Our home is open to all"]],
  generosity: [["Date et Dabitur", "Give, and it will be given"]],
  fairness: [["Fiat Iustitia", "Let justice be done"]],
};

const MAX_NAME = 40;

// "the Rivera family" from whatever was typed ("Rivera", "The Riveras", "rivera family").
export function cleanName(raw) {
  let s = String(raw || "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  s = s.replace(/^the\s+/i, "").replace(/\s+(family|fam|household|clan|crew)$/i, "").trim();
  if (s && s === s.toLowerCase()) s = s.replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return s;
}

export function familyPhrase(name) {
  const n = cleanName(name);
  return n ? `${n} family` : "";
}

function fill(t, fam) {
  return t.replace(/\{Family\}/g, fam);
}

// Count everyone's answers. members: [{ answers: { values: [], animal, color, activity, hard, legacy } }]
export function tally(members) {
  const c = { values: {}, animal: {}, color: {}, activity: {}, hard: {}, legacy: {} };
  let n = 0;
  for (const m of members || []) {
    const a = m && m.answers;
    if (!a) continue;
    n++;
    for (const v of a.values || []) if (VALUE_BY_ID[v]) c.values[v] = (c.values[v] || 0) + 1;
    for (const k of ["animal", "color", "activity", "hard"]) if (a[k]) c[k][a[k]] = (c[k][a[k]] || 0) + 1;
    for (const l of [].concat(a.legacy || [])) c.legacy[l] = (c.legacy[l] || 0) + 1;
  }
  const sort = (o) => Object.entries(o).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  return { n, values: sort(c.values), animal: sort(c.animal), color: sort(c.color), activity: sort(c.activity), hard: sort(c.hard), legacy: sort(c.legacy) };
}

// Order tied entries by seed, so different seeds give different (equally valid) creeds.
function ranked(pairs, rng) {
  const jitter = new Map(pairs.map(([k]) => [k, rng.next()]));
  return pairs.slice().sort((a, b) => b[1] - a[1] || jitter.get(a[0]) - jitter.get(b[0])).map(([k]) => k);
}

export function topValues(t, rng, max = 4) {
  return ranked(t.values, rng).slice(0, max);
}

// All the ways a line can be said, for the "say it another way" button.
export function variants(kind, key, tone, name) {
  const fam = familyPhrase(name);
  const T = ["classic", "warm", "playful"];
  const others = T.filter((x) => x !== tone);
  switch (kind) {
    case "open": return (fam ? OPENINGS : OPENINGS_NO_NAME)[tone].map((s) => fill(s, fam));
    case "close": return (fam ? CLOSINGS : CLOSINGS_NO_NAME)[tone].map((s) => fill(s, fam));
    case "value": { const v = VALUE_BY_ID[key]; return v ? [...v.creed[tone], ...others.flatMap((o) => v.creed[o])] : []; }
    case "activity": { const a = ACTIVITIES.find((x) => x.id === key); return a ? [a[tone], ...others.map((o) => a[o])] : []; }
    case "hard": { const h = HARD_TIMES.find((x) => x.id === key); return h ? [h[tone], ...others.map((o) => h[o])] : []; }
    case "occasion": { const o = OCCASION_LINES[key]; return o ? [o[tone], ...others.map((x) => o[x])] : []; }
    case "legacy": {
      const adj = key;
      return [...LEGACY_TEMPLATES[tone], ...others.flatMap((o) => LEGACY_TEMPLATES[o])].map((s) => fill(s, fam || "our family").replace(/the our family/g, "our family").replace("{adj}", adj));
    }
  }
  return [];
}

// Build the creed. family: { name, tone, occasion }. Returns { title, lines: [{ kind, key, text, alt }] }.
export function buildCreed(t, family, seed) {
  const rng = makeRng("creed:" + seed);
  const tone = TONES.some((x) => x.id === family.tone) ? family.tone : "warm";
  const name = cleanName(family.name);
  const lines = [];
  const add = (kind, key) => {
    const vs = variants(kind, key, tone, name);
    if (!vs.length) return;
    // Pick among the variants written for this tone; keep the index so the editor can cycle.
    const own = kind === "value" ? 3 : kind === "open" || kind === "close" || kind === "legacy" ? (kind === "legacy" ? 2 : 3) : 1;
    const alt = rng.int(Math.min(own, vs.length));
    lines.push({ kind, key, alt, text: vs[alt] });
  };
  add("open", "");
  const vals = topValues(t, rng, t.n >= 4 ? 5 : 4);
  for (const v of vals) add("value", v);
  const act = ranked(t.activity, rng)[0];
  if (act) add("activity", act);
  const hard = ranked(t.hard, rng)[0];
  if (hard) add("hard", hard);
  if (family.occasion && OCCASION_LINES[family.occasion]) add("occasion", family.occasion);
  const leg = ranked(t.legacy, rng).slice(0, 2).map((id) => LEGACY.find((l) => l.id === id)?.adj).filter(Boolean);
  if (leg.length) add("legacy", leg.length === 2 ? `${leg[0]} and ${leg[1]}` : leg[0]);
  add("close", "");
  // Never print the same sentence twice.
  const seen = new Set();
  const out = lines.filter((l) => !seen.has(l.text) && seen.add(l.text));
  return { title: name ? `The ${name} Family Creed` : "Our Family Creed", tone, lines: out };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const latinTitle = (s) => s.split(" ").map(cap).join(" ");
const titleCase = (s) => s.split(" ").map((w, i) => (i && ["and", "of", "the", "at", "in", "to"].includes(w.toLowerCase()) ? w.toLowerCase() : cap(w))).join(" ");

// Motto options, best first. Each: { text, lang: "la"|"en", translation, kind }.
export function mottoOptions(t, seed, max = 8) {
  const rng = makeRng("motto:" + seed);
  const vals = topValues(t, rng, 4).map((id) => VALUE_BY_ID[id]);
  const out = [];
  const push = (m) => { if (m.text && !out.some((o) => o.text.toLowerCase() === m.text.toLowerCase())) out.push(m); };
  if (vals.length >= 2) {
    const [a, b] = vals;
    push({ text: `${latinTitle(a.latin.abl)} et ${latinTitle(b.latin.abl)}`, lang: "la", translation: `By ${a.latin.gloss} and ${b.latin.gloss}`, kind: "latin-pair" });
  }
  // Two short imperatives fit a ribbon; a third only when it stays short.
  if (vals.length >= 2) {
    const three = vals.slice(0, 3).map((v) => v.imperative + ".").join(" ");
    push({ text: three.length <= 30 && vals.length >= 3 ? three : vals.slice(0, 2).map((v) => v.imperative + ".").join(" "), lang: "en", translation: "", kind: "imperatives" });
  }
  for (const v of vals.slice(0, 3)) {
    const cur = LATIN_MOTTOS[v.id];
    if (cur) { const [la, en] = rng.pick(cur); push({ text: la, lang: "la", translation: en, kind: "latin" }); }
  }
  for (const v of vals.slice(0, 3)) push({ text: titleCase(rng.pick(v.mottos)), lang: "en", translation: "", kind: "english" });
  if (vals.length >= 2) push({ text: `${vals[0].label} and ${vals[1].label.toLowerCase()}`.replace(/^./, (c) => c.toUpperCase()), lang: "en", translation: "", kind: "pair" });
  if (vals.length >= 3) {
    const [a, b, c] = vals;
    push({ text: [a, b, c].map((v) => latinTitle(v.latin.nom)).join(", "), lang: "la", translation: [a, b, c].map((v) => v.latin.gloss).join(", ").replace(/^./, (x) => x.toUpperCase()), kind: "latin-triple" });
  }
  if (!out.length) push({ text: "Together Always", lang: "en", translation: "", kind: "fallback" });
  return out.slice(0, max);
}

// Fill in sensible answers for a family that skips questions (for "just me" gifts).
export function emptyAnswers() {
  return { values: [], animal: "", color: "", activity: "", hard: "", legacy: [] };
}

export function isAnswered(a) {
  return !!(a && a.values && a.values.length >= 1);
}

export { VALUES, ANIMAL_CHOICES, COLOR_CHOICES };
