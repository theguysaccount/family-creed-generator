// Dev tool: draw every charge on a contact sheet and screenshot it with headless Chrome.
//   node scripts/contact-sheet.mjs [out.png] [ids,comma,separated]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { CHARGES } from "../src/assets/js/engine/charges.js";
import { chargeSvg } from "../src/assets/js/engine/draw-charge.js";

const out = path.resolve(process.argv[2] || "contact.png");
const ids = process.argv[3] ? process.argv[3].split(",") : Object.keys(CHARGES);
const combos = [["or", "azure"], ["argent", "gules"], ["sable", "or"], ["gules", "argent"]];
const cell = 220, cols = 6;
const rows = Math.ceil(ids.length / cols);
let body = "";
ids.forEach((id, i) => {
  const [t, field] = combos[i % combos.length];
  body += `<figure><svg viewBox="0 0 200 200" width="${cell - 20}" height="${cell - 20}"><rect width="200" height="200" fill="var(--${field})"/>${chargeSvg(id, t, 100, 100, 176, 2.6)}</svg><figcaption>${id}</figcaption></figure>`;
});
const html = `<!doctype html><meta charset="utf-8"><style>
:root{--or:#E3B23C;--azure:#1F4F9A;--argent:#F3F0E8;--gules:#B8262E;--sable:#202020}
body{margin:0;padding:10px;background:#ddd;font:14px sans-serif;display:grid;grid-template-columns:repeat(${cols},${cell}px)}
figure{margin:0;text-align:center}figcaption{margin-top:2px}</style>${body}`;
const tmp = path.join(os.tmpdir(), "contact-" + process.pid + ".html");
fs.writeFileSync(tmp, html);
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--screenshot=${out}`, `--window-size=${cols * cell + 20},${rows * (cell + 22) + 20}`, "file://" + tmp], { stdio: "ignore" });
console.log("wrote", out);
