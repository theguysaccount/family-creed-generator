import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeDesign, decodeDesign, sanitize } from "../src/assets/js/engine/share.js";
import { jpegPdf } from "../src/assets/js/engine/pdf.js";

const design = {
  name: "Rivera", year: "2026",
  creed: { lines: [{ kind: "open", text: "This is who we are:" }, { kind: "value", text: "We love each other out loud, every single day." }, { kind: "close", text: "Wherever we go, we go together." }] },
  motto: { text: "Amore et Fide", translation: "By love and faith", lang: "la" },
  spec: { shield: "french", layout: "chief", division: "pale", line: "embattled", t: ["gules", "or", "argent", "or", "azure"], main: "bear", second: "star", frame: "laurel", frameT: "or", crest: true, crestCharge: "bear", ribbon: true, finish: "shaded", bordureCharged: false },
  style: "midnight", size: "8x10",
};

test("share links round-trip a design", async () => {
  const token = await encodeDesign(design);
  assert.match(token, /^[zj][A-Za-z0-9_-]+$/);
  assert.ok(token.length < 1500, "link stays short: " + token.length);
  const back = await decodeDesign(token);
  assert.equal(back.name, "Rivera");
  assert.equal(back.year, "2026");
  assert.deepEqual(back.creed.lines.map((l) => l.text), design.creed.lines.map((l) => l.text));
  assert.deepEqual(back.motto, design.motto);
  assert.equal(back.spec.layout, "chief");
  assert.deepEqual(back.spec.t, design.spec.t);
  assert.equal(back.style, "midnight");
  assert.equal(back.size, "8x10");
});

test("share links never carry individual answers", async () => {
  const token = await encodeDesign({ ...design, members: [{ name: "Maya", answers: { values: ["love"] } }], mottos: [{ text: "x" }] });
  const back = await decodeDesign(token);
  assert.ok(!JSON.stringify(back).includes("Maya"));
});

test("tampered links are cleaned, not trusted", () => {
  const bad = sanitize({
    v: 1, n: "<b>x</b>".repeat(20), y: 2026, l: [["evil", "A".repeat(500)], "nope", ["value", ""]],
    m: "M".repeat(200), ml: "xx",
    s: { shield: "<svg>", layout: "nope", t: ["blue", "or"], main: "dragon", frame: "gold", finish: "neon" },
    st: "x", sz: "a0",
  });
  assert.equal(bad.name.length, 40);
  assert.equal(bad.year, "");
  assert.equal(bad.creed.lines.length, 1);
  assert.equal(bad.creed.lines[0].kind, "custom");
  assert.equal(bad.creed.lines[0].text.length, 160);
  assert.equal(bad.motto.text.length, 60);
  assert.equal(bad.motto.lang, "en");
  assert.equal(bad.spec.shield, "heater");
  assert.equal(bad.spec.layout, "center");
  assert.equal(bad.spec.t[0], "azure");
  assert.equal(bad.spec.main, "lion");
  assert.equal(bad.spec.frame, "none");
  assert.equal(bad.style, "heirloom");
  assert.equal(bad.size, "letter");
  assert.throws(() => sanitize({ v: 2 }));
  assert.throws(() => sanitize(null));
});

test("garbage tokens are rejected", async () => {
  await assert.rejects(decodeDesign("q123"));
  await assert.rejects(decodeDesign(""));
  await assert.rejects(decodeDesign("j" + "A".repeat(7000)));
});

test("the PDF writer produces a well-formed one-page PDF", () => {
  // A tiny but structurally valid JPEG (SOI ... EOI); the writer does not decode it.
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  const pdf = jpegPdf(jpeg, 10, 20, 612, 792, { title: "The (Rivera) Family\\ Crest — ünïcode" });
  const text = Buffer.from(pdf).toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/MediaBox \[0 0 612\.00 792\.00\]/);
  assert.match(text, /\/Width 10 \/Height 20/);
  assert.match(text, /\/Title \(The \\\(Rivera\\\) Family\\\\ Crest  ncode\)/);
  // Every xref offset points at the start of its object.
  const startxref = +text.match(/startxref\n(\d+)/)[1];
  assert.equal(text.slice(startxref, startxref + 4), "xref");
  const offsets = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => +m[1]);
  assert.equal(offsets.length, 6);
  offsets.forEach((o, i) => assert.equal(text.slice(o, o + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  // The image stream holds exactly the JPEG bytes.
  const len = +text.match(/\/Length (\d+) >>\nstream\n/)[1];
  assert.equal(len, jpeg.length);
});
