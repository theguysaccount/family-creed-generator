// Build the site into a temporary folder and check what search engines and visitors get.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { EXAMPLES } from "../src/content/examples.js";
import { VALUES } from "../src/assets/js/engine/values.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "fcg-build-"));
const BASE = "https://example.github.io/family-creed-generator";
let pages = [];

before(() => {
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    cwd: ROOT, stdio: "pipe",
    env: { ...process.env, FCG_OUT: path.relative(ROOT, OUT), FCG_BASE_URL: BASE, FCG_TODAY: "2026-11-10" },
  });
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  pages = walk(OUT).filter((f) => f.endsWith("index.html")).map((f) => ({ file: f, html: fs.readFileSync(f, "utf8") }));
});

test("one page per value, guide and published example", () => {
  const published = EXAMPLES.filter((e) => e.publish <= "2026-11-10").length;
  assert.ok(published < EXAMPLES.length, "some examples are still in the backlog");
  const expected = 1 + 2 + 1 + VALUES.length + 2 + 1 + 1 + published + 3;
  assert.equal(pages.length, expected);
  for (const e of EXAMPLES) assert.equal(fs.existsSync(path.join(OUT, "examples", e.slug, "index.html")), e.publish <= "2026-11-10", e.slug);
});

test("every page has a unique title, description, canonical URL and share card", () => {
  const titles = new Set(), descs = new Set();
  for (const { file, html } of pages) {
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(title && title.length <= 110, `${file}: title ${title}`);
    assert.ok(desc && desc.length >= 50 && desc.length <= 320, `${file}: description ${desc?.length}`);
    assert.ok(canon && canon.startsWith(BASE + "/"), `${file}: canonical ${canon}`);
    assert.ok(!titles.has(title), "duplicate title " + title);
    assert.ok(!descs.has(desc), "duplicate description " + desc);
    titles.add(title);
    descs.add(desc);
    assert.match(html, /<meta property="og:image" content="https:\/\/[^"]+\.jpg">/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<meta name="viewport"/);
    for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) JSON.parse(m[1]);
  }
});

test("internal links and assets resolve", () => {
  for (const { file, html } of pages) {
    for (const m of html.matchAll(/(?:href|src)="(\/family-creed-generator\/[^"#?]*)/g)) {
      let rel = m[1].replace("/family-creed-generator/", "");
      let target = path.join(OUT, rel);
      if (rel === "" || rel.endsWith("/")) target = path.join(target, "index.html");
      if ((rel.startsWith("og/") && rel.endsWith(".jpg")) || rel === "apple-touch-icon.png") continue; // drawn by scripts/og.mjs
      assert.ok(fs.existsSync(target), `${path.relative(OUT, file)} links to missing ${m[1]}`);
    }
  }
});

test("sitemap, robots and IndexNow key", () => {
  const sm = fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf8");
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length >= 50);
  assert.ok(!locs.some((u) => u.endsWith("/c/")), "share view is not in the sitemap");
  assert.ok(locs.every((u) => u.startsWith(BASE + "/")));
  const robots = fs.readFileSync(path.join(OUT, "robots.txt"), "utf8");
  assert.match(robots, new RegExp(`Sitemap: ${BASE}/sitemap.xml`));
  const key = fs.readFileSync(path.join(ROOT, "src/indexnow-key.txt"), "utf8").trim();
  assert.match(key, /^[a-f0-9]{32}$/);
  assert.equal(fs.readFileSync(path.join(OUT, key + ".txt"), "utf8"), key);
  const manifest = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest.pages).sort(), locs.slice().sort());
});

test("the share view is not indexed and the app pages load their scripts", () => {
  const view = pages.find((p) => p.file.endsWith(path.join("c", "index.html"))).html;
  assert.match(view, /<meta name="robots" content="noindex">/);
  assert.match(view, /assets\/js\/app\/view\.js\?v=/);
  const make = pages.find((p) => p.file.endsWith(path.join("make", "index.html"))).html;
  assert.match(make, /assets\/js\/app\/make\.js\?v=/);
  assert.match(make, /window\.FCG=\{"base":"\/family-creed-generator\/"/);
});

test("value pages carry real content, not boilerplate", () => {
  const texts = VALUES.map((v) => fs.readFileSync(path.join(OUT, "values", v.id, "index.html"), "utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  texts.forEach((t, i) => assert.ok(t.split(" ").length >= 500, `${VALUES[i].id} page too thin: ${t.split(" ").length} words`));
  // The lead paragraphs differ page to page.
  const leads = VALUES.map((v) => fs.readFileSync(path.join(OUT, "values", v.id, "index.html"), "utf8").match(/<p class="lead">([^<]+)/)[1]);
  assert.equal(new Set(leads).size, VALUES.length);
});
