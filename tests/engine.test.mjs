import { test } from "node:test";
import assert from "node:assert/strict";
import { VALUES, VALUE_BY_ID, ANIMAL_CHOICES, COLOR_CHOICES } from "../src/assets/js/engine/values.js";
import { tally, buildCreed, mottoOptions, variants, cleanName, LATIN_MOTTOS, ACTIVITIES, HARD_TIMES, LEGACY, TONES, OCCASIONS } from "../src/assets/js/engine/creed.js";
import { designCrest, designOptions } from "../src/assets/js/engine/design.js";
import { crestSvg, blazon, tinctureChecks, LAYOUTS, SHIELDS, DIVISIONS, LINES } from "../src/assets/js/engine/crest.js";
import { CHARGES, ANIMALS } from "../src/assets/js/engine/charges.js";
import { chargeSvg } from "../src/assets/js/engine/draw-charge.js";
import { TINCTURES } from "../src/assets/js/engine/tinctures.js";
import { posterSvg, wrap, SIZES, STYLES } from "../src/assets/js/engine/poster.js";
import { explain, CHARGE_MEANINGS } from "../src/assets/js/engine/meanings.js";
import { makeRng } from "../src/assets/js/engine/rng.js";

const ids = VALUES.map((v) => v.id);

function randomMembers(seed, n = 1 + (seed % 6)) {
  const rng = makeRng("m" + seed);
  return Array.from({ length: n }, () => ({
    answers: {
      values: rng.shuffle(ids).slice(0, 1 + rng.int(5)),
      animal: rng.chance(0.85) ? rng.pick(ANIMAL_CHOICES).id : "",
      color: rng.chance(0.85) ? rng.pick(COLOR_CHOICES).id : "",
      activity: rng.chance(0.8) ? rng.pick(ACTIVITIES).id : "",
      hard: rng.chance(0.8) ? rng.pick(HARD_TIMES).id : "",
      legacy: rng.shuffle(LEGACY.map((l) => l.id)).slice(0, rng.int(3)),
    },
  }));
}

test("every value is complete", () => {
  assert.equal(VALUES.length, 36);
  assert.equal(new Set(ids).size, 36);
  for (const v of VALUES) {
    for (const t of TONES) {
      assert.equal(v.creed[t.id].length, 3, `${v.id} ${t.id}`);
      for (const line of v.creed[t.id]) {
        assert.match(line, /^[A-Z“"].*[.!]$/, `${v.id}: ${line}`);
        assert.ok(line.length <= 120, `${v.id} line too long: ${line}`);
      }
    }
    assert.ok(v.mottos.length >= 4, v.id);
    assert.ok(v.latin.nom && v.latin.abl && v.latin.gloss, v.id);
    assert.ok(TINCTURES[v.tincture], v.id);
    for (const c of v.charges) assert.ok(CHARGES[c], `${v.id} charge ${c}`);
    for (const l of v.layouts) assert.ok(LAYOUTS[l], `${v.id} layout ${l}`);
    for (const l of v.lines) assert.ok(LINES[l], `${v.id} line ${l}`);
  }
});

test("curated Latin mottos belong to real values and have translations", () => {
  for (const [vid, list] of Object.entries(LATIN_MOTTOS)) {
    assert.ok(VALUE_BY_ID[vid], vid);
    for (const [la, en] of list) {
      assert.match(la, /^[A-Z][A-Za-z ,]+$/, la);
      assert.ok(en.length > 3, la);
    }
  }
});

test("every charge draws clean SVG in every tincture", () => {
  assert.ok(Object.keys(CHARGES).length >= 45);
  assert.equal(ANIMALS.length, 14);
  for (const id of Object.keys(CHARGES)) {
    for (const t of Object.keys(TINCTURES)) {
      const s = chargeSvg(id, t, 100, 100, 150, 3);
      assert.ok(!/NaN|undefined|Infinity/.test(s), `${id}/${t}`);
      assert.match(s, /<path d="M/, id);
    }
    assert.ok(CHARGE_MEANINGS[id], `meaning for ${id}`);
    assert.ok(CHARGES[id].plural && CHARGES[id].plain, id);
  }
});

test("animal choices are drawn charges", () => {
  for (const a of ANIMAL_CHOICES) assert.equal(CHARGES[a.id]?.kind, "animal", a.id);
});

test("2,000 random families get valid crests that follow the rule of tincture", () => {
  const layouts = new Set();
  for (let i = 0; i < 2000; i++) {
    const t = tally(randomMembers(i));
    const spec = designCrest(t, { seed: "s" + i, tone: TONES[i % 3].id, occasion: OCCASIONS[i % OCCASIONS.length].id });
    layouts.add(spec.layout);
    assert.ok(SHIELDS[spec.shield] && LAYOUTS[spec.layout] && DIVISIONS[spec.division] && LINES[spec.line], JSON.stringify(spec));
    assert.ok(CHARGES[spec.main] && CHARGES[spec.second], JSON.stringify(spec));
    assert.notEqual(spec.main, spec.second);
    for (const c of tinctureChecks(spec)) assert.ok(c.ok, `${c.what}: ${c.a} on ${c.b} in ${JSON.stringify(spec)}`);
    const svg = crestSvg(spec, { id: "t" + i });
    assert.ok(!/NaN|undefined|Infinity/.test(svg), "bad svg for " + JSON.stringify(spec));
    const b = blazon(spec);
    assert.match(b, /^[A-Z].*\.$/);
    assert.ok(!/undefined/.test(b), b);
  }
  assert.equal(layouts.size, Object.keys(LAYOUTS).length, "every layout gets used: " + [...layouts]);
});

test("the family's top animal and color drive the crest", () => {
  const members = [
    { answers: { values: ["courage", "love"], animal: "owl", color: "vert", activity: "table", hard: "talk", legacy: [] } },
    { answers: { values: ["courage", "joy"], animal: "owl", color: "vert", activity: "games", hard: "talk", legacy: [] } },
  ];
  for (let i = 0; i < 50; i++) {
    const spec = designCrest(tally(members), { seed: "x" + i });
    assert.equal(spec.main, "owl");
    assert.equal(spec.t[0], "vert");
  }
});

test("designOptions returns three different layouts", () => {
  const t = tally(randomMembers(7, 4));
  const opts = designOptions(t, { seed: "abc" }, 3);
  assert.equal(opts.length, 3);
  assert.equal(new Set(opts.map((o) => o.spec.layout)).size, 3);
});

test("blazon wording for known designs", () => {
  const base = { shield: "heater", line: "straight", frame: "none", crest: false, ribbon: false };
  assert.equal(blazon({ ...base, layout: "center", t: ["azure", "or", "argent", "or", "argent"], main: "lion", second: "star" }), "Azure, a lion's face Or.");
  assert.equal(blazon({ ...base, layout: "party", division: "pale", t: ["or", "gules", "or", "or", "or"], main: "eagle", second: "star" }), "Per pale Or and Gules, an eagle displayed counterchanged.");
  assert.equal(blazon({ ...base, layout: "chevron", line: "engrailed", t: ["vert", "or", "or", "argent", "argent"], main: "fox", second: "acorn" }), "Vert, a chevron engrailed Or between two acorns Argent in chief and a fox's mask Argent in base.");
  assert.equal(blazon({ ...base, layout: "chief", line: "embattled", t: ["gules", "or", "argent", "or", "azure"], main: "bear", second: "star" }), "Gules, a bear's head Or; on a chief embattled Argent three mullets Azure.");
  assert.equal(blazon({ ...base, layout: "bordure", bordureCharged: true, t: ["azure", "or", "or", "argent", "azure"], main: "turtle", second: "star" }), "Azure, a tortoise Argent; a bordure Or charged with eight mullets Azure.");
  assert.equal(blazon({ ...base, layout: "center", t: ["sable", "or", "or", "or", "or"], main: "hourglass", second: "star" }), "Sable, an hourglass Or.");
  assert.equal(blazon({ ...base, layout: "party", division: "pale", t: ["argent", "azure", "or", "or", "or"], main: "" }), "Per pale Argent and Azure.");
});

test("creeds are deterministic, complete and never repeat a line", () => {
  for (let i = 0; i < 300; i++) {
    const t = tally(randomMembers(i));
    const fam = { name: i % 3 ? "rivera" : "", tone: TONES[i % 3].id, occasion: OCCASIONS[i % OCCASIONS.length].id };
    const a = buildCreed(t, fam, "seed" + i), b = buildCreed(t, fam, "seed" + i);
    assert.deepEqual(a, b);
    const texts = a.lines.map((l) => l.text);
    assert.equal(new Set(texts).size, texts.length);
    assert.ok(a.lines.length >= 4 && a.lines.length <= 12, a.lines.length);
    for (const l of a.lines) assert.ok(!/[{}]|undefined|the our family/.test(l.text), l.text);
    assert.equal(a.lines[0].kind, "open");
    assert.equal(a.lines.at(-1).kind, "close");
    if (fam.name) assert.equal(a.title, "The Rivera Family Creed");
    else assert.equal(a.title, "Our Family Creed");
  }
});

test("every creed line can be said another way", () => {
  const t = tally(randomMembers(3, 5));
  const c = buildCreed(t, { name: "Lee", tone: "warm", occasion: "wedding" }, "z");
  for (const l of c.lines) {
    const vs = variants(l.kind, l.key, "warm", "Lee");
    assert.ok(vs.length >= 2, l.kind);
    assert.ok(vs.includes(l.text), `${l.kind}: ${l.text}`);
  }
});

test("motto options: Latin pairs use the checked ablative forms", () => {
  for (let i = 0; i < 200; i++) {
    const t = tally(randomMembers(i));
    const ms = mottoOptions(t, "m" + i);
    assert.ok(ms.length >= 1);
    for (const m of ms) {
      assert.ok(m.text && !/undefined/.test(m.text), JSON.stringify(m));
      if (m.kind === "latin-pair") {
        const [a, b] = m.text.split(" et ");
        const abl = new Set(VALUES.map((v) => v.latin.abl.toLowerCase()));
        assert.ok(abl.has(a.toLowerCase()) && abl.has(b.toLowerCase()), m.text);
        assert.match(m.translation, /^By .+ and .+$/);
      }
      if (m.kind === "imperatives") assert.ok(m.text.length <= 34, m.text);
    }
  }
});

test("family names are cleaned up", () => {
  assert.equal(cleanName("  the riveras family "), "Riveras");
  assert.equal(cleanName("O'Brien-Nguyen"), "O'Brien-Nguyen");
  assert.equal(cleanName("van der berg"), "Van Der Berg");
  assert.equal(cleanName("McDonald"), "McDonald");
  assert.equal(cleanName("x".repeat(80)).length, 40);
});

test("user text is escaped everywhere it is drawn", () => {
  const evil = `<script>alert(1)</script>"'&`;
  const spec = { shield: "heater", layout: "center", t: ["azure", "or", "or", "or", "or"], main: "lion", second: "star", ribbonText: evil, crest: false, frame: "none" };
  const svg = crestSvg(spec, { title: evil });
  assert.ok(!svg.includes("<script>"));
  const poster = posterSvg({ name: evil, year: evil, creed: { lines: [{ kind: "value", text: evil }] }, motto: { text: evil, translation: evil, lang: "la" }, spec }, {});
  assert.ok(!poster.includes("<script>"));
  assert.ok(poster.includes("&lt;script&gt;"));
});

test("posters fit every size and style", () => {
  const t = tally(randomMembers(11, 4));
  const creed = buildCreed(t, { name: "Montgomery-Fitzgerald", tone: "classic", occasion: "reunion" }, "p");
  const motto = mottoOptions(t, "p")[0];
  const spec = designCrest(t, { seed: "p", motto: motto.text });
  for (const size of Object.keys(SIZES)) for (const style of Object.keys(STYLES)) {
    const svg = posterSvg({ name: "Montgomery-Fitzgerald", year: "1987", creed, motto, spec }, { size, style });
    assert.ok(!/NaN|undefined/.test(svg), size + style);
    const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    assert.equal(+vb[1], Math.round(SIZES[size].w * 100));
    // Every text baseline sits inside the page.
    for (const m of svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"/g)) assert.ok(+m[1] > 0 && +m[1] < +vb[2], `${size} ${style} text at y=${m[1]}`);
  }
});

test("wrap keeps lines within width", () => {
  const rows = wrap("We gather at our table, and there is always a place for one more.", 200, "serif", 20);
  assert.ok(rows.length >= 2);
  assert.equal(rows.join(" "), "We gather at our table, and there is always a place for one more.");
});

test("explain covers the main elements of a design", () => {
  const spec = { shield: "heater", layout: "chief", line: "embattled", t: ["gules", "or", "argent", "or", "azure"], main: "bear", second: "star", frame: "laurel" };
  const ex = explain(spec, { text: "Semper Fortes", translation: "Always strong" });
  assert.ok(ex.some((x) => /Gules/.test(x)));
  assert.ok(ex.some((x) => /bear/.test(x)));
  assert.ok(ex.some((x) => /star/.test(x)));
  assert.ok(ex.some((x) => /chief/.test(x)));
  assert.ok(ex.some((x) => /Semper Fortes/.test(x)));
});
