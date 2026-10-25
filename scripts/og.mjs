// Draw the 1200 x 630 share cards listed in dist/og-jobs.json (written by build.mjs) and the
// 180 x 180 apple-touch-icon, with headless Chrome. Fonts are inlined so text renders exactly.
//   node scripts/og.mjs
import fs from "node:fs";
import path from "node:path";
import { launch } from "./lib/chrome.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(ROOT, process.env.FCG_OUT || "dist");
const { jobs, logo } = JSON.parse(fs.readFileSync(path.join(DIST, "og-jobs.json"), "utf8"));
const font = (fam, file, style = "normal") => `@font-face{font-family:'${fam}';font-style:${style};font-weight:400 900;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, "src/assets/fonts", file)).toString("base64")}) format('woff2');}`;
const fonts = font("Cinzel", "Cinzel-normal-latin.woff2") + font("EB Garamond", "EBGaramond-normal-latin.woff2") + font("EB Garamond", "EBGaramond-italic-latin.woff2", "italic");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const card = (j) => `<!doctype html><meta charset="utf-8"><style>${fonts}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:#F3EAD3;display:grid;grid-template-columns:470px 1fr;align-items:center;font-family:'EB Garamond',serif;color:#2A1F14}
.art{height:630px;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#fffaf0 0,#F3EAD3 70%)}
.art svg{height:560px;width:auto}
.txt{padding:0 64px 0 24px}
.kicker{font:700 22px Cinzel,serif;letter-spacing:.14em;color:#8E2B22;text-transform:uppercase;display:flex;gap:12px;align-items:center}
.kicker svg{width:34px;height:40px}
h1{font:700 ${j.title.length > 34 ? 50 : 62}px/1.12 Cinzel,serif;margin:22px 0 18px;letter-spacing:.01em}
p{font:italic 34px/1.3 'EB Garamond',serif;margin:0;color:#6B5A45}
.rule{height:3px;width:120px;background:#A88A4A;margin-top:30px}
</style><div class="art">${j.svg}</div><div class="txt"><div class="kicker">${logo}Family Creed Generator</div><h1>${esc(j.title)}</h1><p>${esc(j.sub)}</p><div class="rule"></div></div>`;

const chrome = await launch();
try {
  const page = await chrome.newPage({ width: 1200, height: 630 });
  const tmp = path.join(DIST, "og-tmp.html");
  for (const j of jobs) {
    fs.writeFileSync(tmp, card(j));
    await page.goto("file://" + tmp, 120);
    await page.eval(`document.fonts.ready.then(() => true)`);
    await page.screenshot(path.join(DIST, j.file), { clip: { x: 0, y: 0, width: 1200, height: 630 } });
  }
  fs.writeFileSync(tmp, `<!doctype html><style>html,body{margin:0;background:#F3EAD3;width:180px;height:180px;display:grid;place-items:center}svg{width:132px;height:154px}</style>${logo}`);
  await page.viewport(180, 180);
  await page.goto("file://" + tmp, 80);
  await page.screenshot(path.join(DIST, "apple-touch-icon.png"), { clip: { x: 0, y: 0, width: 180, height: 180 } });
  fs.rmSync(tmp);
  fs.rmSync(path.join(DIST, "og-jobs.json"));
  console.log(`drew ${jobs.length} share cards and the touch icon`);
} finally {
  await chrome.close();
}
