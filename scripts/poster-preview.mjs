// Dev tool: render a sample poster with embedded fonts and screenshot it with headless Chrome.
//   node scripts/poster-preview.mjs out.png [style] [size] [tone] [seed]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { tally, buildCreed, mottoOptions } from "../src/assets/js/engine/creed.js";
import { designCrest } from "../src/assets/js/engine/design.js";
import { posterSvg, SIZES } from "../src/assets/js/engine/poster.js";

const [out = "poster.png", style = "heirloom", size = "letter", tone = "classic", seed = "s1"] = process.argv.slice(2);
const FONTS = path.resolve("src/assets/fonts");
const font = (fam, file, styleKw = "normal") => `@font-face{font-family:'${fam}';font-style:${styleKw};font-weight:400 800;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(FONTS, file)).toString("base64")}) format('woff2');}`;
const fontsCss = font("Cinzel", "Cinzel-normal-latin.woff2") + font("EB Garamond", "EBGaramond-normal-latin.woff2") + font("EB Garamond", "EBGaramond-italic-latin.woff2", "italic");
const members = [
  { answers: { values: ["love", "courage", "humor", "work", "faith"], animal: "lion", color: "azure", activity: "table", hard: "together", legacy: ["kind"] } },
  { answers: { values: ["love", "humor", "adventure", "learning", "kindness"], animal: "bear", color: "azure", activity: "games", hard: "laugh", legacy: ["fun"] } },
  { answers: { values: ["love", "courage", "kindness", "nature", "joy"], animal: "lion", color: "vert", activity: "table", hard: "together", legacy: ["kind", "brave"] } },
];
const t = tally(members);
const creed = buildCreed(t, { name: "Rivera", tone, occasion: "gift" }, seed);
const motto = mottoOptions(t, seed)[0];
const spec = designCrest(t, { seed, tone, motto: motto.text });
const svg = posterSvg({ name: "Rivera", year: "2026", creed, motto, spec }, { size, style, fontsCss, creditText: "Made with Family Creed Generator · theguysaccount.github.io/family-creed-generator" });
const sz = SIZES[size];
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0}</style>${svg.replace(/width="\d+" height="\d+" role/, `width="${sz.w * 100}" height="${sz.h * 100}" role`)}`;
const tmp = path.join(os.tmpdir(), "poster-" + process.pid + ".html");
fs.writeFileSync(tmp, html);
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=3000", `--screenshot=${path.resolve(out)}`, `--window-size=${Math.round(sz.w * 100)},${Math.round(sz.h * 100)}`, "file://" + tmp], { stdio: "ignore" });
console.log("wrote", out, spec.layout, spec.main, spec.second);
