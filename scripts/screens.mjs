// Screenshots of the key screens at desktop (1280 px) and phone (390 px) widths → docs/screens/.
//   node scripts/screens.mjs [base]    base defaults to the local dist served on a random port
import fs from "node:fs";
import path from "node:path";
import { launch } from "./lib/chrome.mjs";
import { createServer } from "./serve.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "docs", "screens");
let base = process.argv[2];
let server;
if (!base) {
  const bp = JSON.parse(fs.readFileSync(path.join(ROOT, "dist", "make", "index.html"), "utf8").match(/window\.FCG=(\{.*?\});/)[1]).base;
  server = createServer(bp);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}${bp.replace(/\/$/, "")}`;
}
base = base.replace(/\/$/, "");
fs.mkdirSync(OUT, { recursive: true });

const flow = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent)).click();
  const set = (sel, v) => { const i = document.querySelector(sel); i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); };
  const answer = async (vals, animal, color, act, hard, legacy) => {
    for (const v of vals) document.querySelector('.chip input[value="' + v + '"]').click();
    btn(/Next/); await sleep(60);
    document.querySelector('input[name=animal][value="' + animal + '"]').click(); btn(/Next/); await sleep(60);
    document.querySelector('input[name=color][value="' + color + '"]').click(); btn(/Next/); await sleep(60);
    document.querySelector('input[name=activity][value="' + act + '"]').click(); btn(/Next/); await sleep(60);
    document.querySelector('input[name=hard][value="' + hard + '"]').click(); btn(/Next/); await sleep(60);
    for (const l of legacy) document.querySelector('.chip input[value="' + l + '"]').click();
    btn(/Done/); await sleep(100);
  };
  set("#fam", "Rivera");
  set('input[aria-label="Name of person 1"]', "Maya");
  set('input[aria-label="Name of person 2"]', "Leo");
  btn(/Start the questions/); await sleep(120); btn(/Let's go/); await sleep(120);
  await answer(["love","courage","humor","togetherness"], "lion", "azure", "table", "together", ["kind"]);
  btn(/Pass the phone/); await sleep(80); btn(/Let's go/); await sleep(80);
  await answer(["love","adventure","kindness","humor"], "lion", "gules", "outdoors", "laugh", ["brave"]);
  btn(/See our designs/); await sleep(500);
})()`;

const chrome = await launch();
try {
  for (const [label, w, h, mobile] of [["desktop", 1280, 900, false], ["phone", 390, 844, true]]) {
    const page = await chrome.newPage({ width: w, height: h, mobile, scale: 1 });
    const shot = async (name, url, prep) => {
      if (url) await page.goto(base + url, 600);
      if (prep) await page.eval(prep);
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot(path.join(OUT, `${name}-${label}.png`));
      console.log("saved", `${name}-${label}.png`);
    };
    await shot("home", "/");
    await shot("value-page", "/values/courage/");
    await shot("example", "/examples/wedding/");
    await shot("heraldry", "/heraldry/", `window.scrollTo(0, document.querySelectorAll("h2")[2].offsetTop - 20)`);
    await shot("make-setup", "/make/", `localStorage.clear()`);
    await page.goto(base + "/make/", 400);
    await page.eval(`(async () => { localStorage.clear(); })()`);
    await page.goto(base + "/make/", 400);
    await page.eval(`(async () => {
      const set = (sel, v) => { const i = document.querySelector(sel); i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); };
      set("#fam", "Rivera"); set('input[aria-label="Name of person 1"]', "Maya");
      [...document.querySelectorAll("button")].find((b) => /Start the questions/.test(b.textContent)).click();
      await new Promise((r) => setTimeout(r, 120));
      [...document.querySelectorAll("button")].find((b) => /Let's go/.test(b.textContent)).click();
      await new Promise((r) => setTimeout(r, 120));
      for (const v of ["love", "courage", "humor"]) document.querySelector('.chip input[value="' + v + '"]').click();
    })()`);
    await shot("make-question", null);
    await page.eval(`localStorage.clear()`);
    await page.goto(base + "/make/", 400);
    await page.eval(flow);
    await shot("make-results", null, `window.scrollTo(0, document.querySelector(".options").offsetTop - 80)`);
    await page.eval(`[...document.querySelectorAll(".option .btn")][0].click()`);
    await new Promise((r) => setTimeout(r, 800));
    await shot("make-editor", null);
    const token = await page.eval(`(async () => { const s = await import("${new URL(base).pathname}/assets/js/engine/share.js"); return s.encodeDesign(JSON.parse(localStorage.getItem("fcg.session.v1")).design); })()`);
    await page.goto("about:blank", 50);
    await shot("share-view", "/c/#" + token);
    await page.close();
  }
} finally {
  await chrome.close();
  server?.close();
}
