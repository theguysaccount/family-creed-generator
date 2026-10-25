// Dev tool: render a grid of crests from hand-written specs and screenshot it.
//   node scripts/crest-gallery.mjs out.png
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { crestSvg, blazon } from "../src/assets/js/engine/crest.js";

const out = path.resolve(process.argv[2] || "gallery.png");
const specs = JSON.parse(process.argv[3] || "null") || [
  { shield: "heater", layout: "center", t: ["azure", "or", "argent", "or", "argent"], main: "lion", second: "star", frame: "laurel", frameT: "or", crest: true, ribbonText: "FIDE ET AMORE" },
  { shield: "french", layout: "party", division: "pale", line: "straight", t: ["or", "gules", "argent", "or", "argent"], main: "stag", second: "rose", ribbonText: "STRONGER TOGETHER" },
  { shield: "spanish", layout: "impaled", t: ["argent", "azure", "or", "or", "or"], main: "wolf", second: "rose", frame: "oak", frameT: "vert" },
  { shield: "heater", layout: "quarterly", t: ["or", "vert", "argent", "or", "or"], main: "owl", second: "book", crest: true },
  { shield: "swiss", layout: "chief", line: "embattled", t: ["gules", "or", "argent", "or", "azure"], main: "bear", second: "star", ribbonText: "SEMPER FORTES" },
  { shield: "heater", layout: "chevron", line: "engrailed", t: ["vert", "or", "or", "argent", "argent"], main: "fox", second: "acorn" },
  { shield: "oval", layout: "fess", line: "wavy", t: ["azure", "or", "argent", "or", "or"], main: "dolphin", second: "shell", frame: "laurel", frameT: "or" },
  { shield: "heater", layout: "bend", line: "indented", t: ["purpure", "or", "or", "argent", "argent"], main: "eagle", second: "feather" },
  { shield: "french", layout: "cross", t: ["azure", "or", "argent", "gules", "or"], main: "dove", second: "star" },
  { shield: "heater", layout: "saltire", t: ["gules", "or", "argent", "sable", "or"], main: "bee", second: "rose" },
  { shield: "spanish", layout: "canton", t: ["sable", "or", "argent", "or", "gules"], main: "horse", second: "key" },
  { shield: "heater", layout: "bordure", bordureCharged: true, t: ["azure", "or", "or", "argent", "azure"], main: "turtle", second: "star", crest: true, ribbonText: "FESTINA LENTE" },
  { shield: "heater", layout: "party", division: "bend", line: "wavy", t: ["argent", "vert", "or", "or", "or"], main: "tree", second: "leaf" },
  { shield: "heater", layout: "party", division: "chevron", line: "embattled", t: ["or", "azure", "or", "or", "or"], main: "tower", second: "key" },
  { shield: "heater", layout: "party", division: "gyronny", t: ["argent", "gules", "or", "or", "or"], main: "dog", second: "heart" },
  { shield: "heater", layout: "party", division: "barry", line: "wavy", t: ["argent", "azure", "or", "or", "or"], main: "anchor", second: "shell" },
  { shield: "heater", layout: "party", division: "quarterly", t: ["or", "gules", "or", "or", "or"], main: "cat", second: "heart" },
  { shield: "swiss", layout: "party", division: "chequy", t: ["argent", "azure", "or", "or", "or"], main: "rings", second: "heart", ribbonText: "AMOR VINCIT OMNIA" },
];
const cols = 6, cw = 300, chH = 380;
let body = "";
for (const s of specs) {
  body += `<figure>${crestSvg(s, { width: cw - 20, height: chH - 60 })}<figcaption>${blazon(s)}</figcaption></figure>`;
}
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:10px;background:#efe8d8;font:11px/1.25 sans-serif;display:grid;grid-template-columns:repeat(${cols},${cw}px)}
figure{margin:0 0 6px;text-align:center}figcaption{padding:0 8px;height:44px;overflow:hidden}</style>${body}`;
const tmp = path.join(os.tmpdir(), "gallery-" + process.pid + ".html");
fs.writeFileSync(tmp, html);
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const rows = Math.ceil(specs.length / cols);
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--screenshot=${out}`, `--window-size=${cols * cw + 20},${rows * chH + 20}`, "file://" + tmp], { stdio: "ignore" });
console.log("wrote", out);
