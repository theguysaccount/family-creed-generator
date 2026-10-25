// Check the live site: every page in the sitemap answers 200, and every internal link, script,
// stylesheet, font and image those pages use exists. Exits 1 with a list of what is broken.
//   node scripts/linkcheck.mjs https://owner.github.io/family-creed-generator [--quick]
const base = (process.argv[2] || process.env.FCG_BASE_URL || "").replace(/\/$/, "");
if (!base) throw new Error("usage: linkcheck.mjs <base url> [--quick]");
const quick = process.argv.includes("--quick");
const origin = new URL(base).origin;
const basePath = new URL(base + "/").pathname;
const problems = [];
const seen = new Map();

async function get(url, wantText = false) {
  if (seen.has(url) && !wantText) return seen.get(url);
  let res, text = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "family-creed-generator-linkcheck" } });
      if (wantText) text = await res.text(); else await res.arrayBuffer();
      if (res.status < 500) break;
    } catch (e) { res = { status: 0, statusText: e.message }; }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  const out = { status: res.status, type: res.headers?.get?.("content-type") || "", text };
  seen.set(url, out);
  return out;
}

const sm = await get(base + "/sitemap.xml", true);
if (sm.status !== 200) { console.error("sitemap missing:", sm.status); process.exit(1); }
let pages = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (quick) pages = [pages[0], ...pages.filter((p) => /\/(make|values|examples|mottos|heraldry)\//.test(p)).slice(0, 8)];
const refs = new Set([base + "/robots.txt", base + "/favicon.svg", base + "/apple-touch-icon.png"]);
for (const p of pages) {
  const r = await get(p, true);
  if (r.status !== 200 || !/text\/html/.test(r.type)) { problems.push(`${r.status} ${p}`); continue; }
  for (const m of r.text.matchAll(/(?:href|src|content)="([^"#]+)"/g)) {
    let u = m[1];
    if (u.startsWith("/")) u = origin + u;
    if (!u.startsWith(base + "/") || u.endsWith("/c/")) continue;
    refs.add(u.split("?")[0]);
  }
}
const list = [...refs];
for (let i = 0; i < list.length; i += 8) {
  await Promise.all(list.slice(i, i + 8).map(async (u) => {
    const r = await get(u);
    if (r.status !== 200) problems.push(`${r.status} ${u}`);
  }));
}
const sitemapLines = [...(await get(base + "/robots.txt", true)).text.matchAll(/Sitemap: (\S+)/g)];
if (!sitemapLines.length) problems.push("robots.txt has no Sitemap line");
console.log(`checked ${pages.length} pages and ${list.length} linked files under ${basePath}`);
if (problems.length) {
  console.error("broken:\n" + problems.map((p) => " - " + p).join("\n"));
  process.exit(1);
}
console.log("all good");
