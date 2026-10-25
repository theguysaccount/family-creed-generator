// IndexNow: tell Bing, Yandex, Seznam, Naver and other IndexNow engines which pages changed.
//   node scripts/indexnow.mjs --diff <live manifest URL> dist/manifest.json   prints changed URLs
//   node scripts/indexnow.mjs --file changed-urls.txt                        submits them
// The key file (<key>.txt) is published at the site root by build.mjs. A failed submission is
// reported but never fails the workflow: the site is already live.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : ""; };

if (opt("--diff")) {
  const fresh = JSON.parse(fs.readFileSync(args[args.indexOf("--diff") + 2], "utf8")).pages;
  let live = {};
  try {
    const res = await fetch(opt("--diff"), { signal: AbortSignal.timeout(20000) });
    if (res.ok) live = (await res.json()).pages || {};
  } catch { /* first deploy, or the site is down: everything counts as changed */ }
  const changed = Object.entries(fresh).filter(([u, h]) => live[u] !== h).map(([u]) => u);
  process.stdout.write(changed.join("\n") + (changed.length ? "\n" : ""));
  console.error(`${changed.length} of ${Object.keys(fresh).length} pages changed since the live deploy`);
  process.exit(0);
}

const file = opt("--file");
if (!file) throw new Error("use --diff <url> <manifest> or --file <urls.txt>");
const urls = fs.readFileSync(file, "utf8").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10000);
if (!urls.length) { console.log("IndexNow: nothing changed, nothing to submit"); process.exit(0); }
const base = (process.env.FCG_BASE_URL || "").replace(/\/$/, "");
if (!base) throw new Error("FCG_BASE_URL is required");
const key = fs.readFileSync(path.join(ROOT, "src/indexnow-key.txt"), "utf8").trim();
const host = new URL(base).host;
const body = { host, key, keyLocation: `${base}/${key}.txt`, urlList: urls.filter((u) => new URL(u).host === host) };
// A new key answers 403 until the engine has fetched the key file, so retry a few times.
for (let attempt = 0; attempt < 4; attempt++) {
  if (attempt) await new Promise((r) => setTimeout(r, 45000 * attempt));
  let res;
  try {
    res = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  } catch (e) { console.log("IndexNow: network error", e.message); continue; }
  console.log(`IndexNow: ${res.status} ${res.statusText} for ${body.urlList.length} URLs`);
  if ([200, 202].includes(res.status)) break;
  console.log((await res.text()).slice(0, 300));
  if (!(res.status === 403 || res.status === 429 || res.status >= 500)) break;
}
