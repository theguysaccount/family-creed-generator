// End-to-end self-test in headless Chrome against the built site (dist/):
//  1. every sitemap page loads with no console errors and no sideways scroll on a phone;
//  2. a three-person session runs start to finish, including a relative answering by link;
//  3. the PDF, PNG and crest exports render, and the share link opens the same design;
//  4. sample crests and a sample poster are saved to selftest-out/ for a human to glance at.
// Exits non-zero on any failure, so the deploy workflow stops and the live site stays as it was.
//   node scripts/selftest.mjs
import fs from "node:fs";
import path from "node:path";
import { launch } from "./lib/chrome.mjs";
import { createServer } from "./serve.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(ROOT, process.env.FCG_OUT || "dist");
const OUTDIR = path.join(ROOT, "selftest-out");
// The base path the site was built for ("/family-creed-generator/" on github.io, "/" on a custom domain).
const BASE_PATH = JSON.parse(fs.readFileSync(path.join(DIST, "make", "index.html"), "utf8").match(/window\.FCG=(\{.*?\});/)[1]).base;
const failures = [];
const check = (ok, msg) => { if (!ok) { failures.push(msg); console.log("  FAIL", msg); } else console.log("  ok  ", msg); };

const server = createServer(BASE_PATH);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const local = (u) => { const x = new URL(u); return ORIGIN + BASE_PATH + x.pathname.slice(BASE_PATH.length) + x.search + x.hash; };
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

const chrome = await launch();
try {
  // 1. Pages
  console.log("pages");
  const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => local(m[1]));
  check(urls.length >= 50, `sitemap lists ${urls.length} pages`);
  const desk = await chrome.newPage({ width: 1280, height: 900 });
  const phone = await chrome.newPage({ width: 390, height: 844, mobile: true, scale: 2 });
  for (const u of urls) {
    const res = await fetch(u);
    check(res.status === 200, `200 ${u.replace(ORIGIN, "")}`);
  }
  for (const u of urls) {
    for (const [name, pg] of [["desktop", desk], ["phone", phone]]) {
      const before = pg.errors.length;
      await pg.goto(u, 150);
      const h1 = await pg.eval(`document.querySelector("h1")?.textContent || ""`);
      const overflow = await pg.eval(`document.documentElement.scrollWidth - innerWidth`);
      if (!h1 || overflow > 2 || pg.errors.length > before) {
        check(false, `${name} ${u.replace(ORIGIN, "")}: h1="${h1.slice(0, 40)}" overflow=${overflow} errors=${pg.errors.slice(before).join(" | ")}`);
      }
    }
  }
  check(true, `${urls.length} pages render on desktop and phone with an h1, no console errors and no sideways scroll`);

  // 2. The family session, on a phone
  console.log("session");
  const app = phone;
  await app.goto(ORIGIN + BASE_PATH + "make/", 300);
  await app.eval(`localStorage.clear()`);
  await app.goto(ORIGIN + BASE_PATH + "make/", 400);
  const helpers = `
    window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__btn = (re) => { const b = [...document.querySelectorAll("button")].find((b) => re.test(b.textContent)); if (!b) throw new Error("no button " + re); b.click(); };
    window.__set = (sel, v) => { const i = document.querySelector(sel); i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); };
    window.__answer = async (vals, animal, color, act, hard, legacy) => {
      for (const v of vals) document.querySelector('.chip input[value="' + v + '"]').click();
      await __sleep(30); __btn(/Next/); await __sleep(60);
      document.querySelector('input[name=animal][value="' + animal + '"]').click(); __btn(/Next/); await __sleep(60);
      document.querySelector('input[name=color][value="' + color + '"]').click(); __btn(/Next/); await __sleep(60);
      document.querySelector('input[name=activity][value="' + act + '"]').click(); __btn(/Next/); await __sleep(60);
      document.querySelector('input[name=hard][value="' + hard + '"]').click(); __btn(/Next/); await __sleep(60);
      for (const l of legacy) document.querySelector('.chip input[value="' + l + '"]').click();
      __btn(/Done/); await __sleep(100);
    };`;
  await app.eval(helpers);
  await app.eval(`(async () => {
    __set("#fam", "Okafor-Lindqvist");
    __set('input[aria-label="Name of person 1"]', "Ada");
    __set('input[aria-label="Name of person 2"]', "Sven");
    __btn(/Add a person/); await __sleep(50);
    __set('input[aria-label="Name of person 3"]', "Kemi");
    __btn(/Start the questions/); await __sleep(150);
  })()`);
  check(/Ada/.test(await app.eval(`document.querySelector("h1").textContent`)), "pass-the-phone screen names the first person");
  await app.eval(`(async () => { __btn(/Let's go/); await __sleep(100); await __answer(["love","courage","humor"], "lion", "azure", "table", "together", ["kind"]); })()`);
  check(/Thanks, Ada/.test(await app.eval(`document.querySelector("h1").textContent`)), "first person finishes and the answers are hidden");
  await app.eval(`(async () => { __btn(/Pass the phone/); await __sleep(80); __btn(/Let's go/); await __sleep(80); await __answer(["love","adventure","kindness","nature"], "bear", "vert", "outdoors", "keepgoing", ["brave","fun"]); })()`);
  await app.eval(`(async () => { __btn(/Pass the phone/); await __sleep(80); __btn(/Let's go/); await __sleep(80); await __answer(["love","humor","faith"], "lion", "azure", "games", "laugh", ["kind"]); })()`);
  await app.eval(`(async () => { __btn(/See our designs/); await __sleep(400); })()`);
  check((await app.eval(`document.querySelectorAll(".option svg").length`)) === 3, "three designs to vote on");
  const summary = await app.eval(`document.querySelector(".bars").textContent`);
  check(/Love3/.test(summary.replace(/\s+/g, "")), "results count Love three times");
  await app.screenshot(path.join(OUTDIR, "phone-results.png"));
  await app.eval(`(async () => { document.querySelectorAll('button[aria-label^="Add a vote"]')[1].click(); __sleep(50); [...document.querySelectorAll(".option .btn")][1].click(); await __sleep(600); })()`);
  check((await app.eval(`document.querySelector("h1").textContent`)) === "Make it yours", "the chosen design opens in the editor");
  await app.waitFor(`document.querySelector(".preview-box svg text")`);
  check(/OKAFOR-LINDQVIST/.test(await app.eval(`document.querySelector(".preview-box svg").textContent`)), "poster preview shows the family name");

  // Edit a line, cycle a variant, change the style
  await app.eval(`(async () => { const ta = document.querySelector(".line-ed textarea"); ta.value = "Here is what we believe:"; ta.dispatchEvent(new Event("input", { bubbles: true })); await __sleep(200); })()`);
  check(/Here is what we believe:/.test(await app.eval(`document.querySelector(".preview-box svg").textContent`)), "an edited creed line appears on the poster");
  const before = await app.eval(`document.querySelectorAll(".line-ed textarea")[1].value`);
  await app.eval(`(async () => { document.querySelectorAll(".line-ed .icon-btn")[2].click(); await __sleep(150); })()`);
  check((await app.eval(`document.querySelectorAll(".line-ed textarea")[1].value`)) !== before, "“say it another way” changes the line");
  await app.screenshot(path.join(OUTDIR, "phone-editor.png"));

  // 3. Exports and share link
  console.log("exports");
  const ex = await app.eval(`(async () => {
    const m = await import("${BASE_PATH}assets/js/app/export.js");
    const s = await import("${BASE_PATH}assets/js/engine/share.js");
    const D = JSON.parse(localStorage.getItem("fcg.session.v1")).design;
    const out = {};
    for (const size of ["letter", "a4", "5x7", "16x20"]) {
      const pdf = await m.exportPdf(D, { size, style: "heirloom", credit: true });
      const head = new TextDecoder().decode(new Uint8Array(await pdf.slice(0, 8).arrayBuffer()));
      out["pdf_" + size] = [pdf.size, head];
    }
    const png = await m.exportPng(D, { size: "8x10", style: "midnight", credit: true });
    out.png = png.size;
    const crest = await m.exportCrestPng(D);
    out.crest = crest.size;
    const svg = await m.exportSvg(D, { size: "letter", style: "modern", credit: false });
    out.svg = svg.size;
    out.svgHasFonts = (await svg.text()).includes("data:font/woff2;base64");
    out.token = await s.encodeDesign({ ...D });
    const bytes = new Uint8Array(await (await m.exportPdf(D, { size: "letter", style: "sage", credit: true })).arrayBuffer());
    let bin = ""; for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    out.pdfB64 = btoa(bin);
    const pngBytes = new Uint8Array(await png.arrayBuffer());
    let b2 = ""; for (let i = 0; i < pngBytes.length; i += 32768) b2 += String.fromCharCode.apply(null, pngBytes.subarray(i, i + 32768));
    out.pngB64 = btoa(b2);
    return out;
  })()`);
  for (const size of ["letter", "a4", "5x7", "16x20"]) check(ex["pdf_" + size][1] === "%PDF-1.4" && ex["pdf_" + size][0] > 150000, `PDF ${size}: ${ex["pdf_" + size][0]} bytes`);
  check(ex.png > 150000, `PNG poster: ${ex.png} bytes`);
  check(ex.crest > 150000, `transparent crest PNG: ${ex.crest} bytes`);
  check(ex.svg > 50000 && ex.svgHasFonts, `SVG with embedded fonts: ${ex.svg} bytes`);
  const pdf = Buffer.from(ex.pdfB64, "base64");
  fs.writeFileSync(path.join(OUTDIR, "sample-letter.pdf"), pdf);
  fs.writeFileSync(path.join(OUTDIR, "sample-8x10.png"), Buffer.from(ex.pngB64, "base64"));
  const text = pdf.toString("latin1");
  const sx = +text.match(/startxref\n(\d+)/)[1];
  check(text.slice(sx, sx + 4) === "xref" && /\/MediaBox \[0 0 612\.00 792\.00\]/.test(text), "PDF cross-reference table and Letter page box are valid");

  const view = await chrome.newPage({ width: 1280, height: 900 });
  await view.goto(ORIGIN + BASE_PATH + "c/#" + ex.token, 800);
  await view.waitFor(`document.querySelector(".preview-box svg")`);
  check(/Okafor-Lindqvist/.test(await view.eval(`document.querySelector("h1").textContent`)), "share link opens the same design");
  check(!view.errors.length, "share view has no console errors " + view.errors.join(" | "));
  await view.screenshot(path.join(OUTDIR, "desktop-share-view.png"));
  await view.goto(ORIGIN + BASE_PATH + "c/#zbroken", 500);
  check(/incomplete/.test(await view.eval(`document.querySelector("h1").textContent`)), "a broken share link shows a friendly message");

  // Relative answers by link
  console.log("remote");
  const invite = await app.eval(`(async () => {
    const s = JSON.parse(localStorage.getItem("fcg.session.v1"));
    const tok = btoa(JSON.stringify({ s: s.sid, f: s.family.name, t: s.family.tone })).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
    return tok;
  })()`);
  const rel = await chrome.newPage({ width: 390, height: 844, mobile: true, scale: 2 });
  await rel.goto(ORIGIN + BASE_PATH + "make/?remote=1#join=" + invite, 400);
  await rel.eval(helpers);
  check(/Okafor-Lindqvist/.test(await rel.eval(`document.querySelector("h1").textContent`)), "invite link greets the relative with the family name");
  await rel.eval(`(async () => { __set("#rn", "Grandma Ingrid"); document.querySelector("#rn").value = "Grandma Ingrid"; __btn(/^Start$/); await __sleep(120); await __answer(["tradition","love","gratitude"], "owl", "purpure", "stories", "pray", ["wise"]); })()`);
  const ansUrl = await rel.eval(`document.querySelector('input[aria-label="Your answers link"]').value`);
  check(/#ans=/.test(ansUrl), "the relative gets a link to send back");
  await app.goto(local(ansUrl), 600);
  await app.waitFor(`document.querySelector(".option svg")`);
  const n = await app.eval(`JSON.parse(localStorage.getItem("fcg.session.v1")).members.length`);
  check(n === 4, `organizer's session now has ${n} people`);

  // 4. Sample crests for a human to glance at
  console.log("samples");
  const sample = await chrome.newPage({ width: 1200, height: 900 });
  await sample.goto(ORIGIN + BASE_PATH + "about/", 200);
  const grid = await sample.eval(`(async () => {
    const { designCrest } = await import("${BASE_PATH}assets/js/engine/design.js");
    const { crestSvg } = await import("${BASE_PATH}assets/js/engine/crest.js");
    const { tally } = await import("${BASE_PATH}assets/js/engine/creed.js");
    const { VALUES, ANIMAL_CHOICES, COLOR_CHOICES } = await import("${BASE_PATH}assets/js/engine/values.js");
    const { makeRng } = await import("${BASE_PATH}assets/js/engine/rng.js");
    const week = Math.floor(Date.now() / 6048e5);
    const rng = makeRng("week" + week);
    let html = "";
    for (let i = 0; i < 12; i++) {
      const t = tally([{ answers: { values: rng.shuffle(VALUES.map((v) => v.id)).slice(0, 4), animal: rng.pick(ANIMAL_CHOICES).id, color: rng.pick(COLOR_CHOICES).id, activity: "", hard: "", legacy: [] } }]);
      html += crestSvg(designCrest(t, { seed: "w" + week + "-" + i, tone: ["classic", "warm", "playful"][i % 3], motto: "SAMPLE MOTTO" }), { id: "s" + i, width: 280, height: 320 });
    }
    document.body.innerHTML = '<div style="display:grid;grid-template-columns:repeat(4,280px);gap:10px;padding:10px;background:#efe8d8">' + html + "</div>";
    return document.querySelectorAll("svg").length;
  })()`);
  check(grid === 12, "12 sample crests rendered");
  await sample.screenshot(path.join(OUTDIR, "sample-crests.png"), { clip: { x: 0, y: 0, width: 1200, height: 1360 }, fullPage: true });
  check(!desk.errors.length && !phone.errors.length && !rel.errors.length && !sample.errors.length, "no console errors anywhere " + [...desk.errors, ...phone.errors, ...rel.errors, ...sample.errors].join(" | "));
} catch (e) {
  failures.push("crashed: " + (e.stack || e));
  console.error(e);
} finally {
  await chrome.close();
  server.close();
}

fs.writeFileSync(path.join(OUTDIR, "report.txt"), failures.length ? "FAILED\n" + failures.join("\n") + "\n" : "PASSED\n");
if (failures.length) {
  console.error(`\nself-test FAILED (${failures.length}):\n - ` + failures.join("\n - "));
  process.exit(1);
}
console.log("\nself-test passed");
