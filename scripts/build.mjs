// Build the static site into dist/: copy assets, render every page, write sitemap, robots,
// IndexNow key, a content manifest (for change detection) and the list of share cards to draw.
//   FCG_BASE_URL=https://owner.github.io/family-creed-generator node scripts/build.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { VALUES, VALUE_BY_ID, GROUPS, ANIMAL_CHOICES } from "../src/assets/js/engine/values.js";
import { LATIN_MOTTOS, buildCreed, mottoOptions, TONES } from "../src/assets/js/engine/creed.js";
import { designCrest } from "../src/assets/js/engine/design.js";
import { crestSvg, blazon, esc, SHIELDS, DIVISIONS, LINES, LAYOUTS } from "../src/assets/js/engine/crest.js";
import { chargeSvg } from "../src/assets/js/engine/draw-charge.js";
import { CHARGES } from "../src/assets/js/engine/charges.js";
import { TINCTURES, METALS } from "../src/assets/js/engine/tinctures.js";
import { posterSvg } from "../src/assets/js/engine/poster.js";
import { explain, CHARGE_MEANINGS, ORDINARY_MEANINGS } from "../src/assets/js/engine/meanings.js";
import { VALUE_PAGES } from "../src/content/value-pages.js";
import { EXAMPLES } from "../src/content/examples.js";
import { HOW_TO, GIFT, ABOUT, HERALDRY_INTRO } from "../src/content/guides.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, process.env.FCG_OUT || "dist");
const BASE_URL = (process.env.FCG_BASE_URL || "http://127.0.0.1:4321/family-creed-generator").replace(/\/$/, "");
const BASE = new URL(BASE_URL + "/").pathname;
const TODAY = process.env.FCG_TODAY || new Date().toISOString().slice(0, 10);
const CONTENT_DATE = "2026-10-25"; // bump when page copy changes
const CFG = {
  base: BASE, site: BASE_URL,
  shop: process.env.FCG_SHOP_URL || "", support: process.env.FCG_SUPPORT_URL || "", goatcounter: process.env.FCG_GOATCOUNTER || "",
  repo: process.env.FCG_REPO || "theguysaccount/family-creed-generator",
};
const SITE = "Family Creed Generator";
const L = (p = "") => BASE + p.replace(/^\//, "");
const ABS = (p = "") => BASE_URL + "/" + p.replace(/^\//, "");

// ---------- helpers ----------

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}
const hashOf = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
const fileHash = (p) => hashOf(fs.readFileSync(p));
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

const pages = [];
const ogJobs = [];

const LOGO = `<svg viewBox="0 0 600 700" aria-hidden="true"><path d="M0,0 H600 V300 C600,520 430,640 300,700 C170,640 0,520 0,300 Z" fill="#1F4F9A" stroke="#1d1b18" stroke-width="34"/><path d="M-20,520 L300,170 L620,520 L620,640 L300,290 L-20,640 Z" fill="#E3B23C" stroke="#1d1b18" stroke-width="22" clip-path="url(#lg)"/><clipPath id="lg"><path d="M0,0 H600 V300 C600,520 430,640 300,700 C170,640 0,520 0,300 Z"/></clipPath><path d="M300,40 L326,108 L398,108 L340,150 L362,218 L300,176 L238,218 L260,150 L202,108 L274,108 Z" fill="#F3F0E8" stroke="#1d1b18" stroke-width="12"/></svg>`;

function layout(p) {
  const url = ABS(p.path);
  const og = p.og ? ABS(p.og) : ABS("og/default.jpg");
  const css = L("assets/css/site.css") + "?v=" + fileHash(path.join(SRC, "assets/css/site.css"));
  const scripts = (p.scripts || []).map((s) => `<script type="module" src="${L(s)}?v=${fileHash(path.join(SRC, s))}"></script>`).join("");
  const gc = CFG.goatcounter
    ? `<script>if(navigator.doNotTrack!=="1"&&!navigator.globalPrivacyControl){var s=document.createElement("script");s.async=1;s.src="https://gc.zgo.at/count.js";s.dataset.goatcounter=${json(CFG.goatcounter)};document.head.appendChild(s);}</script>`
    : "";
  const schema = [].concat(p.schema || []).filter(Boolean);
  const nav = [["make/", "Make yours"], ["examples/", "Examples"], ["mottos/", "Mottos"], ["values/", "Values"], ["heraldry/", "Heraldry"]];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
${p.noindex ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:type" content="${p.ogType || "website"}">
<meta property="og:site_name" content="${SITE}">
<meta property="og:title" content="${esc(p.ogTitle || p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.ogAlt || "A heraldic family crest with a motto ribbon")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8e2b22">
<link rel="icon" href="${L("favicon.svg")}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${L("apple-touch-icon.png")}">
<link rel="manifest" href="${L("site.webmanifest")}">
<link rel="preload" href="${L("assets/fonts/Cinzel-normal-latin.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${css}">
<script>window.FCG=${json({ base: CFG.base, site: CFG.site, shop: CFG.shop, support: CFG.support, goatcounter: CFG.goatcounter })};</script>
${gc}
${schema.map((s) => `<script type="application/ld+json">${json(s)}</script>`).join("\n")}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head"><div class="wrap"><a class="brand" href="${L()}">${LOGO}<span>${SITE}</span></a>
<nav class="site-nav" aria-label="Main">${nav.map(([h, t]) => `<a href="${L(h)}"${p.path === h ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav></div></header>
<main id="main">
${p.body}
</main>
<footer class="site-foot"><div class="wrap">
<nav aria-label="Footer"><a href="${L("how-to-write-a-family-creed/")}">How to write a family creed</a><a href="${L("family-crest-gift/")}">Crest as a gift</a><a href="${L("latin-mottos/")}">Latin mottos</a><a href="${L("about/")}">About and privacy</a><a href="https://github.com/${CFG.repo}">Source code</a>${CFG.support ? `<a href="${esc(CFG.support)}" rel="noopener">Support this free tool</a>` : ""}</nav>
<p>Free and private: your answers never leave your device. Crests made here are family emblems you design, not historical coats of arms. Code and content are public domain (CC0); fonts are under the SIL Open Font License.</p>
</div></footer>
${scripts}
</body>
</html>
`;
}

function article(p) {
  return {
    "@context": "https://schema.org", "@type": "Article", headline: p.h1 || p.title, description: p.desc,
    datePublished: p.published || CONTENT_DATE, dateModified: p.updated || CONTENT_DATE,
    author: { "@type": "Organization", name: SITE, url: ABS() }, publisher: { "@type": "Organization", name: SITE, url: ABS(), logo: { "@type": "ImageObject", url: ABS("apple-touch-icon.png") } },
    mainEntityOfPage: ABS(p.path), image: p.og ? ABS(p.og) : ABS("og/default.jpg"), inLanguage: "en",
  };
}

function crumbs(list) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: list.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: ABS(p) })),
  };
}

function crumbHtml(list) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${list.map(([n, p], i) => (i < list.length - 1 ? `<a href="${L(p)}">${esc(n)}</a> › ` : `<span>${esc(n)}</span>`)).join("")}</nav>`;
}

// A synthetic tally: values in order of importance plus one answer for each other question.
function exampleTally(e) {
  return {
    n: 4,
    values: e.values.map((v, i) => [v, 6 - i]),
    animal: e.animal ? [[e.animal, 3]] : [], color: e.color ? [[e.color, 3]] : [],
    activity: e.activity ? [[e.activity, 3]] : [], hard: e.hard ? [[e.hard, 3]] : [],
    legacy: (e.legacy || []).map((l, i) => [l, 3 - i]),
  };
}

function exampleDesign(e) {
  const t = exampleTally(e);
  const motto = mottoOptions(t, e.slug)[0];
  const spec = designCrest(t, { seed: e.slug, tone: e.tone, occasion: e.occasion, motto: motto.text });
  const creed = buildCreed(t, { name: e.name || "", tone: e.tone, occasion: e.occasion }, e.slug);
  return { t, motto, mottos: mottoOptions(t, e.slug), spec, creed, design: { name: e.name || "", year: e.year || "", creed, motto, spec } };
}

const VALUE_ANIMAL = { courage: "lion", strength: "bear", loyalty: "wolf", freedom: "eagle", wisdom: "owl", curiosity: "fox", peace: "dove", work: "bee", joy: "dolphin", patience: "turtle" };

function valueDesign(v) {
  const related = VALUES.filter((x) => x.group === v.group && x.id !== v.id).slice(0, 2).map((x) => x.id);
  const e = { slug: "value-" + v.id, values: [v.id, ...related], animal: VALUE_ANIMAL[v.id] || ANIMAL_CHOICES.find((a) => a.value === v.id)?.id || "", color: v.tincture, tone: "classic", occasion: "none" };
  return exampleDesign(e);
}

const published = EXAMPLES.filter((e) => e.publish <= TODAY).sort((a, b) => (a.publish < b.publish ? 1 : a.publish > b.publish ? -1 : 0));

function ogCard(file, title, sub, svg) {
  ogJobs.push({ file, title, sub, svg });
  return file;
}

// ---------- pages ----------

function homePage() {
  const hero = exampleDesign(EXAMPLES.find((e) => e.slug === "family-reunion"));
  const heroSvg = crestSvg(hero.spec, { id: "hero", title: "A sample family crest" });
  const cards = published.slice(0, 4).map((e) => {
    const d = exampleDesign(e);
    return `<a class="card example-card" href="${L(`examples/${e.slug}/`)}">${crestSvg(d.spec, { id: "h" + e.slug.replace(/[^a-z]/g, ""), title: e.title })}<h3>${esc(e.title)}</h3><p class="small muted">${esc(d.motto.text)}</p></a>`;
  }).join("");
  const faq = [
    ["Is it really free?", "Yes. There is no account, no paywall and no watermark. You can print as many copies as you like."],
    ["Is this my family's historical coat of arms?", "No, and nobody can honestly sell you one by surname: historical arms belonged to individuals, not to everyone with a last name. This is better: a crest your family designs together, drawn with real heraldic shields, colors and symbols, with its proper heraldic description."],
    ["Do you see our answers?", "No. Everything happens in your browser and stays on your device. There are no uploads."],
    ["Can relatives far away join?", "Yes. Send them an invite link. They answer on their own phone and send a link back, which adds their answers to your session."],
    ["What can I print?", "A print-ready PDF or PNG poster at Letter, A4, 5 × 7, 8 × 10, 11 × 14 or 16 × 20 inches, a transparent crest for shirts and mugs, and a vector SVG for engraving."],
    ["Can we change the words?", "Every line. Rewrite it, say it another way with one tap, switch between classic, warm and playful tones, or write your own motto in any language."],
  ];
  const body = `
<section class="hero"><div class="wrap">
  <div>
    <h1>Your family's creed and crest, made together</h1>
    <p class="lead">Pass one phone around the table. Everyone privately picks what matters most. In about ten minutes you have a family creed, a motto and a heraldic crest to vote on, then print and frame.</p>
    <div class="cta"><a class="btn big" href="${L("make/")}">Start your family's session</a><a class="btn secondary" href="${L("examples/")}">See examples</a></div>
    <p class="small muted">Free · No sign-up · Nothing leaves your device · Prints at 300 dpi</p>
  </div>
  <div class="hero-art">${heroSvg}</div>
</div></section>
<section class="wrap">
  <h2>How it works</h2>
  <ol class="steps">
    <li class="card"><h3>Everyone answers six questions</h3><p>Values, an animal, a color, what you love doing together, what you do when things get hard. Each person answers alone, so the youngest voice counts as much as the loudest.</p></li>
    <li class="card"><h3>Vote on three designs</h3><p>The answers become three creeds, mottos and crests. The family votes; one organizer has the final edit.</p></li>
    <li class="card"><h3>Edit, print and frame</h3><p>Change any word, color or symbol. Download a print-ready PDF, a poster image, or the crest alone for shirts and mugs.</p></li>
  </ol>
</section>
<section class="wrap">
  <h2>Families made these</h2>
  <p>Examples built with the same tool from typical answers. <a href="${L("examples/")}">See all examples</a>.</p>
  <div class="grid-cards">${cards}</div>
</section>
<section class="wrap narrow">
  <h2>Made for the moments families gather</h2>
  <ul>
    <li><b>Holiday gifts:</b> make it at the table, give the framed print later. <a href="${L("family-crest-gift/")}">Gift guide</a>.</li>
    <li><b>Weddings:</b> two families, one shield. <a href="${L("make/?occasion=wedding")}">Start a wedding crest</a>.</li>
    <li><b>New babies, new homes and reunions:</b> each adds its own line to the creed.</li>
    <li><b>Grandparents:</b> hand down what the family stands for, in writing.</li>
  </ul>
  <h2>Questions</h2>
  <dl class="faq">${faq.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
  <p><a class="btn big" href="${L("make/")}">Make your family's crest</a></p>
</section>`;
  const og = ogCard("og/home.jpg", "Your family's creed and crest", "Made together, in ten minutes. Free.", heroSvg);
  pages.push({
    path: "", title: "Family Crest & Creed Generator: make your family motto and crest together, free",
    ogTitle: "Family Creed Generator: your family's creed and crest, made together",
    desc: "Make a family creed, motto and heraldic crest together on one phone. Everyone answers privately, you vote on three designs, then print. Free, no sign-up.",
    body, og, updated: CONTENT_DATE,
    schema: [
      { "@context": "https://schema.org", "@type": "WebSite", name: SITE, url: ABS() },
      { "@context": "https://schema.org", "@type": "WebApplication", name: SITE, url: ABS("make/"), applicationCategory: "DesignApplication", operatingSystem: "Any (web browser)", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description: "A guided family session that turns everyone's values into a family creed, motto and printable heraldic crest." },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  });
}

function appPages() {
  pages.push({
    path: "make/", title: "Make your family crest and creed: free, private, together",
    desc: "Start a family session: everyone answers six questions on one phone, then vote on three crest and creed designs and print the winner. No sign-up.",
    body: `<div id="app"><div class="wrap narrow app"><h1>Make your family's crest and creed</h1><p>Loading the session… This needs JavaScript turned on.</p><noscript><p class="notice">This tool runs in your browser and needs JavaScript. Nothing you type is uploaded.</p></noscript></div></div>`,
    scripts: ["assets/js/app/make.js"], updated: CONTENT_DATE,
  });
  pages.push({
    path: "c/", title: "A family crest and creed", noindex: true, sitemap: false,
    desc: "A family crest, motto and creed made with the free Family Creed Generator.",
    body: `<div id="app"><div class="wrap narrow app"><h1>A family crest</h1><p>Loading…</p></div></div>`,
    scripts: ["assets/js/app/view.js"],
  });
}

function valuesPages() {
  const list = GROUPS.map((g) => `<h2>${esc(g.label)}</h2><ul class="tag-list">${VALUES.filter((v) => v.group === g.id).map((v) => `<li><a href="${L(`values/${v.id}/`)}">${esc(v.label)}</a></li>`).join("")}</ul>
  <table class="plain">${VALUES.filter((v) => v.group === g.id).map((v) => `<tr><th><a href="${L(`values/${v.id}/`)}">${esc(v.label)}</a></th><td>${esc(v.short)}</td><td><i>${esc(v.mottos[0])}</i></td></tr>`).join("")}</table>`).join("");
  pages.push({
    path: "values/", title: "List of family values: 36 values with mottos, creed lines and symbols",
    h1: "A list of 36 family values",
    desc: "36 family values in four groups, each with family motto ideas, Latin mottos, creed lines in three tones, heraldic symbols and questions to talk about together.",
    body: `<div class="wrap narrow article">${crumbHtml([["Home", ""], ["Family values", "values/"]])}<h1>A list of 36 family values</h1>
<p class="lead">These are the values families choose most when they write a creed together. Each one has its own page with motto ideas in English and Latin, ready-to-use creed lines in classic, warm and playful tones, the heraldic colors and symbols that go with it, and questions to talk about at the table.</p>
${list}
<p style="margin-top:28px"><a class="btn big" href="${L("make/")}">Find your family's top values</a></p></div>`,
    schema: [article({ path: "values/", title: "A list of 36 family values", desc: "36 family values with mottos and symbols." }), crumbs([["Home", ""], ["Family values", "values/"]])],
    updated: CONTENT_DATE,
  });

  for (const v of VALUES) {
    const vp = VALUE_PAGES[v.id];
    const d = valueDesign(v);
    const others = VALUES.filter((x) => x.id !== v.id);
    const sib = VALUES.filter((x) => x.group === v.group && x.id !== v.id);
    const pairs = [...sib.slice(0, 4), ...others.filter((x) => x.group !== v.group).slice(v.label.length % 5, (v.label.length % 5) + 3)];
    const mottoList = [...v.mottos, `${v.imperative}. ${sib[0].imperative}.`, `${v.imperative}. ${sib[1].imperative}. ${sib[2].imperative}.`, `${v.label} and ${sib[3].label.toLowerCase()}`];
    const latin = [...(LATIN_MOTTOS[v.id] || []).map(([la, en]) => [la, en]),
      ...pairs.map((x) => [`${tt(v.latin.abl)} et ${tt(x.latin.abl)}`, `By ${v.latin.gloss} and ${x.latin.gloss}`])];
    const T = TINCTURES[v.tincture];
    const animal = ANIMAL_CHOICES.find((a) => a.value === v.id);
    const sym = [...v.charges, ...(animal && !v.charges.includes(animal.id) ? [animal.id] : [])].map((c) => `<figure><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="99" fill="${METALS.includes(v.tincture) ? "#F3EAD3" : "#1F4F9A"}"/>${chargeSvg(c, METALS.includes(v.tincture) ? "azure" : "or", 100, 100, 150, 4)}</svg><figcaption><b>${esc(cap(CHARGES[c].plain))}</b>${esc(CHARGE_MEANINGS[c] || "")}</figcaption></figure>`).join("");
    const title = `${v.label}: family mottos, Latin phrases and creed lines`;
    const og = ogCard(`og/values-${v.id}.jpg`, `${v.label}`, "Family mottos, Latin phrases, creed lines and symbols", crestSvg(d.spec, { id: "og" + v.id }));
    const body = `<div class="wrap article">${crumbHtml([["Home", ""], ["Family values", "values/"], [v.label, `values/${v.id}/`]])}
<div class="split"><div>
<h1>${esc(v.label)} as a family value</h1>
<p class="lead">${esc(vp.intro)}</p>
<h2>Family mottos about ${esc(v.label.toLowerCase())}</h2>
<ul class="mottos">${mottoList.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
<h2>Latin mottos with ${esc(v.label.toLowerCase())}</h2>
<p>In Latin, ${esc(v.label.toLowerCase())} is <i>${esc(v.latin.nom)}</i>${v.latin.nom !== v.latin.abl ? `; “by” or “with ${esc(v.latin.gloss)}” is <i>${esc(v.latin.abl)}</i>` : ""}. Paired with another value it makes a classic two-word motto.</p>
<dl class="latin">${latin.map(([la, en]) => `<dt>${esc(la)}</dt><dd>${esc(en)}</dd>`).join("")}</dl>
<h2>Creed lines about ${esc(v.label.toLowerCase())}</h2>
${TONES.map((t) => `<h3>${esc(t.label)} <span class="hint">(${esc(t.hint.toLowerCase())})</span></h3><div class="creed-sample">${v.creed[t.id].map((l) => `<p>${esc(l)}</p>`).join("")}</div>`).join("")}
<h2>A sample creed built around ${esc(v.label.toLowerCase())}</h2>
<p>This is what the generator writes for a family whose answers put ${esc(v.label.toLowerCase())} first, in the classic tone. Your family's own answers will change the lines, and you can edit every one.</p>
<div class="creed-sample">${d.creed.lines.map((l) => `<p${l.kind === "open" || l.kind === "close" ? ' style="font-style:italic"' : ""}>${esc(l.text)}</p>`).join("")}</div>
<h2>${esc(v.label)} in heraldry</h2>
<p><span class="swatch" style="background:${T.hex}"></span><b>${esc(T.name)}</b> (${esc(T.plain)}) is the color most often tied to ${esc(v.label.toLowerCase())}: traditionally ${esc(T.meaning)}. Symbols that suit it:</p>
<div class="sym-grid">${sym}</div>
<h2>Talk about it at the table</h2>
<ol>${vp.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
<h2>Related values</h2>
<ul class="tag-list">${sib.map((x) => `<li><a href="${L(`values/${x.id}/`)}">${esc(x.label)}</a></li>`).join("")}</ul>
</div>
<aside class="card stack">${crestSvg(d.spec, { id: "v" + v.id, title: `A sample crest for ${v.label}` })}
<p class="small muted center">A sample crest for a family that puts ${esc(v.label.toLowerCase())} first. <i>${esc(blazon(d.spec))}</i></p>
<a class="btn" href="${L(`make/?v=${v.id}`)}">Start a creed with ${esc(v.label.toLowerCase())}</a></aside>
</div></div>`;
    pages.push({
      path: `values/${v.id}/`, title, h1: `${v.label} as a family value`,
      desc: `${v.label} as a family value: ${v.mottos.length + 3} family motto ideas, Latin mottos with translations, creed lines in three tones, heraldic colors and symbols, and questions to talk about.`.slice(0, 300),
      body, og, ogType: "article", updated: CONTENT_DATE,
      schema: [article({ path: `values/${v.id}/`, title, desc: `${v.label} as a family value.`, og, h1: `${v.label} as a family value` }), crumbs([["Home", ""], ["Family values", "values/"], [v.label, `values/${v.id}/`]])],
    });
  }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const tt = (s) => s.split(" ").map(cap).join(" ");

function mottoPages() {
  let total = 0;
  const groups = GROUPS.map((g) => {
    const vs = VALUES.filter((v) => v.group === g.id);
    return `<h2>${esc(g.label)}</h2>` + vs.map((v) => {
      const sib = vs.filter((x) => x.id !== v.id);
      const items = [...v.mottos, `${v.imperative}. ${sib[0].imperative}.`];
      const lat = (LATIN_MOTTOS[v.id] || [])[0];
      total += items.length + (lat ? 1 : 0);
      return `<h3><a href="${L(`values/${v.id}/`)}">${esc(v.label)}</a></h3><ul class="mottos">${items.map((m) => `<li>${esc(m)}</li>`).join("")}${lat ? `<li><i>${esc(lat[0])}</i>: “${esc(lat[1])}”</li>` : ""}</ul>`;
    }).join("");
  }).join("");
  pages.push({
    path: "mottos/", title: `Family motto ideas: ${Math.floor(total / 10) * 10}+ mottos by value, in English and Latin`, h1: "Family motto ideas",
    desc: `${Math.floor(total / 10) * 10}+ family motto ideas grouped by value, from “Stronger together” to “Amor vincit omnia”, with tips for choosing one your family will actually say.`,
    body: `<div class="wrap narrow article">${crumbHtml([["Home", ""], ["Family mottos", "mottos/"]])}<h1>Family motto ideas</h1>
<p class="lead">A family motto is a few words that sum up what your family stands for. Here are ${total} ideas, grouped by the value they express, in plain English and in Latin. Every one of them was written for this site and is free to use.</p>
<h2>How to choose a family motto</h2>
<ul><li><b>Keep it short.</b> Two to six words fits on a ribbon, a mug or a doormat. If you have to take a breath halfway through, it is a creed line, not a motto.</li>
<li><b>Say it out loud.</b> The right motto is one your kids will quote back to you, sometimes sarcastically. That means it is working.</li>
<li><b>Start from your values.</b> Pick the one or two values your whole family agrees on, then choose a motto from that value below.</li>
<li><b>English or Latin?</b> Latin looks traditional on a crest; English is easier to live by. Many families put the Latin on the crest and the translation underneath. See <a href="${L("latin-mottos/")}">Latin family mottos with translations</a>.</li></ul>
${groups}
<p style="margin-top:28px"><a class="btn big" href="${L("make/")}">Find the motto that fits your family</a></p></div>`,
    schema: [article({ path: "mottos/", title: "Family motto ideas", desc: "Family motto ideas by value." }), crumbs([["Home", ""], ["Family mottos", "mottos/"]])],
    updated: CONTENT_DATE, og: ogCard("og/mottos.jpg", "Family motto ideas", "Over 200 mottos by value, in English and Latin", crestSvg({ ...exampleDesign(EXAMPLES[2]).spec, ribbonText: "STRONGER TOGETHER" }, { id: "ogm" })),
  });

  const curated = Object.entries(LATIN_MOTTOS).flatMap(([vid, list]) => list.map(([la, en]) => ({ la, en, v: VALUE_BY_ID[vid] })));
  const seen = new Set();
  const uniq = curated.filter((x) => !seen.has(x.la) && seen.add(x.la));
  const pairRows = [];
  for (let i = 0; i < VALUES.length; i += 3) {
    const a = VALUES[i], b = VALUES[(i + 7) % VALUES.length];
    pairRows.push([`${tt(a.latin.abl)} et ${tt(b.latin.abl)}`, `By ${a.latin.gloss} and ${b.latin.gloss}`]);
  }
  pages.push({
    path: "latin-mottos/", title: "Latin family mottos with translations (and how to make your own)", h1: "Latin family mottos, with translations",
    desc: `${uniq.length} classic Latin family mottos with translations, plus the Latin word for 36 family values so you can build your own “X et Y” motto correctly.`,
    body: `<div class="wrap narrow article">${crumbHtml([["Home", ""], ["Family mottos", "mottos/"], ["Latin mottos", "latin-mottos/"]])}<h1>Latin family mottos, with translations</h1>
<p class="lead">Latin has been the language of mottos for as long as there have been coats of arms. These are well-known Latin phrases that suit a family, each with an honest translation, followed by a table that lets you build your own two-word motto with correct grammar.</p>
<h2>Classic Latin mottos for families</h2>
<dl class="latin">${uniq.map((x) => `<dt>${esc(x.la)}</dt><dd>${esc(x.en)}. For families who value <a href="${L(`values/${x.v.id}/`)}">${esc(x.v.label.toLowerCase())}</a>.</dd>`).join("")}</dl>
<h2>Make your own: the “X et Y” motto</h2>
<p>The simplest classic pattern is two nouns joined by <i>et</i> (“and”) in the ablative case, which means “by” or “with”: <i>Fide et Amore</i>, “by faith and love”. Pick two values from the table and use the right-hand column. Do not use the left-hand column for this pattern; <i>Fides et Amor</i> is correct Latin too, but it means simply “faith and love”.</p>
<table class="plain"><tr><th>Value</th><th>Latin</th><th>“By/with …” form</th><th>Meaning</th></tr>
${VALUES.map((v) => `<tr><td><a href="${L(`values/${v.id}/`)}">${esc(v.label)}</a></td><td>${esc(tt(v.latin.nom))}</td><td><b>${esc(tt(v.latin.abl))}</b></td><td>${esc(v.latin.gloss)}</td></tr>`).join("")}</table>
<h2>Examples built from the table</h2>
<dl class="latin">${pairRows.map(([la, en]) => `<dt>${esc(la)}</dt><dd>${esc(en)}</dd>`).join("")}</dl>
<h2>A few cautions</h2>
<ul><li>Online translators often get Latin endings wrong. The forms above are checked; mixing cases, like <i>Amor et Fide</i>, is a common mistake.</li>
<li>Some famous Latin phrases are the mottos of countries, schools or military units. They are free to use, but a motto built from your own values says more about your family.</li>
<li>If you plan to carve it in stone, ask a Latin teacher to look at it too.</li></ul>
<p style="margin-top:28px"><a class="btn big" href="${L("make/")}">Get a Latin motto from your family's values</a></p></div>`,
    schema: [article({ path: "latin-mottos/", title: "Latin family mottos, with translations", desc: "Latin family mottos with translations." }), crumbs([["Home", ""], ["Family mottos", "mottos/"], ["Latin mottos", "latin-mottos/"]])],
    updated: CONTENT_DATE, og: ogCard("og/latin-mottos.jpg", "Latin family mottos", "With honest translations, and how to make your own", crestSvg({ ...exampleDesign(EXAMPLES[1]).spec, ribbonText: "AMORE ET FIDE" }, { id: "ogl" })),
  });
}

function heraldryPage() {
  const shieldDemo = (spec, id, cap0) => `<figure class="shield-demo">${crestSvg({ shield: "heater", frame: "none", crest: false, ribbon: false, finish: "flat", main: "", second: "", t: ["argent", "azure", "gules", "or", "or"], ...spec }, { id })}<figcaption>${cap0}</figcaption></figure>`;
  const tinctureRows = Object.entries(TINCTURES).map(([k, T]) => `<tr><td><span class="swatch" style="background:${T.hex}"></span>${esc(T.name)}</td><td>${esc(T.plain)}</td><td>${T.kind === "metal" ? "metal" : "color"}</td><td>${esc(T.meaning)}</td></tr>`).join("");
  const divisions = Object.entries(DIVISIONS).map(([k, D]) => shieldDemo({ layout: "party", division: k, line: "straight", t: ["argent", "azure", "or", "or", "or"] }, "hd" + k, `<b>${esc(D.label)}</b>`)).join("");
  const lines = Object.entries(LINES).map(([k, Ln]) => shieldDemo({ layout: "party", division: "fess", line: k, t: ["or", "gules", "or", "or", "or"] }, "hl" + k, `<b>${esc(Ln.label)}</b>`)).join("");
  const ords = ["chief", "chevron", "fess", "bend", "cross", "saltire", "canton", "bordure"].map((k) => shieldDemo({ layout: k, line: "straight", t: ["azure", "or", "or", "or", "or"] }, "ho" + k, `<b>${esc(cap(k))}</b><br>${esc(ORDINARY_MEANINGS[k].replace(/^the [a-z]+,?( [^,]+,)? ?/i, ""))}`)).join("");
  const charges = Object.values(CHARGES).map((c) => `<figure><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="99" fill="#F3EAD3"/>${chargeSvg(c.id, c.kind === "animal" ? "gules" : "azure", 100, 100, 150, 4)}</svg><figcaption><b>${esc(cap(c.plain))}</b><i class="small">${esc(c.name)}</i><br>${esc(CHARGE_MEANINGS[c.id] || "")}</figcaption></figure>`).join("");
  const ex = [
    { shield: "heater", layout: "chevron", line: "straight", t: ["azure", "or", "or", "argent", "argent"], main: "lion", second: "star", frame: "none", crest: false, ribbon: false },
    { shield: "heater", layout: "party", division: "pale", line: "straight", t: ["or", "gules", "or", "or", "or"], main: "eagle", second: "star", frame: "none", crest: false, ribbon: false },
    { shield: "heater", layout: "chief", line: "embattled", t: ["vert", "or", "argent", "or", "vert"], main: "stag", second: "rose", frame: "none", crest: false, ribbon: false },
  ];
  const exHtml = ex.map((s, i) => `<figure class="shield-demo">${crestSvg(s, { id: "hx" + i })}<figcaption><i>${esc(blazon(s))}</i></figcaption></figure>`).join("");
  pages.push({
    path: "heraldry/", title: "Heraldry symbols and colors and their meanings: a family guide", h1: "Heraldry for families",
    desc: "What the colors, divisions, bands and animals on a coat of arms mean, how to read a blazon, and how to design a family crest without copying anyone's arms.",
    body: `<div class="wrap article">${crumbHtml([["Home", ""], ["Heraldry", "heraldry/"]])}<div class="narrow">
<h1>Heraldry for families: colors, symbols and what they mean</h1>${HERALDRY_INTRO}
<h2>The tinctures (colors)</h2>
<p>Heraldry uses a short list of colors, called tinctures. Two are metals, gold and silver, and the rest are colors. The meanings below are the traditional associations from W. Cecil Wade's <i>The Symbolism of Heraldry</i> (1898).</p>
<table class="plain"><tr><th>Name</th><th>Plain English</th><th>Kind</th><th>Traditional meaning</th></tr>${tinctureRows}</table>
<h2>The rule of tincture</h2>
<p>Never put a metal on a metal or a color on a color: gold on blue, yes; red on blue, no. The rule exists because heraldry had to be read across a battlefield, and it still makes designs readable from across a room. The Family Creed Generator follows it automatically and warns you if your edits break it.</p>
</div>
<h2>Dividing the field</h2>
<p class="narrow">A shield can be split into two or more colors. When a symbol sits across the split and swaps colors on each side, it is called counterchanged.</p>
<div class="sym-grid">${divisions}</div>
<h2>Lines of partition</h2>
<p class="narrow">Dividing lines do not have to be straight. Wavy lines suggest water; embattled ones, a castle wall.</p>
<div class="sym-grid">${lines}</div>
<h2>The ordinaries</h2>
<p class="narrow">Ordinaries are the bold geometric bands that make a coat of arms recognizable at a glance.</p>
<div class="sym-grid">${ords}</div>
<h2>Charges: animals and symbols</h2>
<p class="narrow">Charges are the pictures placed on the shield. Every one below was drawn for this site and is free to use. The italic name is its heraldic term.</p>
<div class="sym-grid">${charges}</div>
<div class="narrow">
<h2>How to read a blazon</h2>
<p>A blazon is a coat of arms described in words, precisely enough that an artist could draw it without seeing it. It always runs in the same order: the field first, then the main band or charge, then anything else. Colors come after the thing they color, and are capitalized.</p>
<div class="sym-grid">${exHtml}</div>
<p>Every design made with the Family Creed Generator comes with its own blazon, written automatically from the design.</p>
<h2>Crest, coat of arms, shield: which is which?</h2>
<p>Strictly, the <b>shield</b> (escutcheon) is the main design, the <b>crest</b> is the small figure on top of a helmet or wreath above it, and the <b>coat of arms</b> or achievement is the whole thing together, often with a motto scroll. In everyday English, “family crest” means the whole design, and that is how this site uses it too.</p>
<h2>Is there a coat of arms for my surname?</h2>
<p>Usually not in the way it is sold. Historically, a coat of arms belonged to one person and passed to their heirs, not to everyone who shares a last name, so a “Smith family crest” bought by surname is someone else's design. Making your own is the honest alternative, and in most countries you are free to use a design you created. In Scotland, arms are regulated by the Court of the Lord Lyon.</p>
<p style="margin-top:28px"><a class="btn big" href="${L("make/")}">Design your family's crest</a></p>
</div></div>`,
    schema: [article({ path: "heraldry/", title: "Heraldry for families", desc: "Heraldry colors and symbols." }), crumbs([["Home", ""], ["Heraldry", "heraldry/"]])],
    updated: CONTENT_DATE, og: ogCard("og/heraldry.jpg", "Heraldry for families", "What the colors, bands and animals mean", crestSvg(ex[2], { id: "ogh" })),
  });
}

function examplePages() {
  const cards = published.map((e) => {
    const d = exampleDesign(e);
    return `<a class="card example-card" href="${L(`examples/${e.slug}/`)}">${crestSvg(d.spec, { id: "x" + e.slug.replace(/[^a-z]/g, ""), title: e.title })}<h3>${esc(e.title)}</h3><p class="small muted">${esc(d.motto.text)}${d.motto.translation ? ` · ${esc(d.motto.translation)}` : ""}</p></a>`;
  }).join("");
  pages.push({
    path: "examples/", title: "Family creed examples: crests, mottos and creeds for every kind of family", h1: "Family creed examples",
    desc: `${published.length} family creed examples with crests and mottos: new parents, weddings, blended families, grandparents, reunions and more. A new example every week.`,
    body: `<div class="wrap article">${crumbHtml([["Home", ""], ["Examples", "examples/"]])}<h1>Family creed examples</h1>
<p class="lead narrow">Each example below was built with the same tool families use, from the values a family like that typically picks. Use them for ideas, or start your own and let your family's answers decide. A new example is added every week.</p>
<div class="grid-cards">${cards}</div></div>`,
    schema: [article({ path: "examples/", title: "Family creed examples", desc: "Family creed examples." }), crumbs([["Home", ""], ["Examples", "examples/"]])],
    updated: published[0]?.publish || CONTENT_DATE,
  });
  published.forEach((e, idx) => {
    const d = exampleDesign(e);
    const poster = posterSvg(d.design, { size: "letter", style: e.tone === "playful" ? "modern" : "heirloom", credit: false, id: "ep" });
    const qs = e.values.slice(0, 2).flatMap((v) => VALUE_PAGES[v].questions.slice(0, 2));
    const rel = published.filter((x) => x.slug !== e.slug).slice(0, 3);
    const og = ogCard(`og/examples-${e.slug}.jpg`, e.title.replace(/^A family creed for /i, "For ").replace(/^An? /, (m) => m), "A family creed, motto and crest", crestSvg(d.spec, { id: "oge" }));
    pages.push({
      path: `examples/${e.slug}/`, title: `${e.title}: example creed, motto and crest`, h1: e.title,
      desc: `${e.title}, with a printable crest, the motto “${d.motto.text}”${d.motto.translation ? ` (${d.motto.translation})` : ""} and the values ${e.values.slice(0, 3).map((v) => VALUE_BY_ID[v].label.toLowerCase()).join(", ")}.`,
      body: `<div class="wrap article">${crumbHtml([["Home", ""], ["Examples", "examples/"], [e.title, `examples/${e.slug}/`]])}
<div class="split"><div>
<h1>${esc(e.title)}</h1>
<p class="lead">${esc(e.intro)}</p>
<h2>The creed</h2>
<div class="creed-sample">${d.creed.lines.map((l) => `<p${l.kind === "open" || l.kind === "close" ? ' style="font-style:italic"' : ""}>${esc(l.text)}</p>`).join("")}</div>
<h2>Motto options</h2>
<ul>${d.mottos.slice(0, 6).map((m) => `<li>${esc(m.text)}${m.translation ? ` <span class="muted">(“${esc(m.translation)}”)</span>` : ""}</li>`).join("")}</ul>
<h2>What the crest means</h2>
<p class="blazon">${esc(blazon(d.spec))}</p>
<ul class="meaning-list">${explain(d.spec, d.motto).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<h2>Values in this creed</h2>
<ul class="tag-list">${e.values.map((v) => `<li><a href="${L(`values/${v}/`)}">${esc(VALUE_BY_ID[v].label)}</a></li>`).join("")}</ul>
<h2>Talk about it together</h2>
<ol>${qs.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
<h2>More examples</h2>
<ul>${rel.map((x) => `<li><a href="${L(`examples/${x.slug}/`)}">${esc(x.title)}</a></li>`).join("")}</ul>
</div>
<aside class="card stack"><div class="preview-box">${poster}</div>
<p class="small muted center">Every family that answers gets its own words and design.</p>
<a class="btn" href="${L(`make/?v=${e.values.slice(0, 3).join(",")}${e.occasion && e.occasion !== "none" ? `&occasion=${e.occasion}` : ""}`)}">Make one for your family</a></aside>
</div></div>`,
      og, ogType: "article", published: e.publish, updated: e.publish,
      schema: [article({ path: `examples/${e.slug}/`, title: e.title, desc: e.intro.slice(0, 150), og, published: e.publish, updated: e.publish, h1: e.title }), crumbs([["Home", ""], ["Examples", "examples/"], [e.title, `examples/${e.slug}/`]])],
    });
  });
}

function guidePages() {
  const sample = exampleDesign(EXAMPLES.find((e) => e.slug === "family-reunion"));
  const aside = `<aside class="card stack"><div class="preview-box">${posterSvg(sample.design, { size: "letter", style: "heirloom", credit: false, id: "gp" })}</div><a class="btn" href="${L("make/")}">Write yours together</a></aside>`;
  pages.push({
    path: "how-to-write-a-family-creed/", title: "How to write a family creed (with examples): a step-by-step guide", h1: "How to write a family creed",
    desc: "What a family creed is, how it differs from a motto or mission statement, and seven steps to write one together with kids, with examples.",
    body: `<div class="wrap article">${crumbHtml([["Home", ""], ["How to write a family creed", "how-to-write-a-family-creed/"]])}<div class="split"><div><h1>How to write a family creed</h1>${HOW_TO(L)}</div>${aside}</div></div>`,
    schema: [article({ path: "how-to-write-a-family-creed/", title: "How to write a family creed", desc: "A step-by-step guide." }), crumbs([["Home", ""], ["How to write a family creed", "how-to-write-a-family-creed/"]])],
    updated: CONTENT_DATE, og: "og/default.jpg",
  });
  pages.push({
    path: "family-crest-gift/", title: "A family crest as a holiday gift: how to make, print and frame it", h1: "A family crest as a gift",
    desc: "How to make a family crest and creed as a holiday, wedding or new-baby gift: three ways to give it, print sizes, framing and holiday timing.",
    body: `<div class="wrap article">${crumbHtml([["Home", ""], ["Family crest as a gift", "family-crest-gift/"]])}<div class="split"><div><h1>A family crest as a gift</h1>${GIFT(L)}</div>${aside.replace('id="gp', 'id="gq')}</div></div>`,
    schema: [article({ path: "family-crest-gift/", title: "A family crest as a gift", desc: "Gift guide." }), crumbs([["Home", ""], ["Family crest as a gift", "family-crest-gift/"]])],
    updated: CONTENT_DATE, og: "og/default.jpg",
  });
  pages.push({
    path: "about/", title: "About Family Creed Generator: how it works, privacy and credits", h1: "About",
    desc: "How the Family Creed Generator works, why your answers never leave your device, honest notes about heraldry, and credits.",
    body: `<div class="wrap narrow article">${crumbHtml([["Home", ""], ["About", "about/"]])}<h1>About Family Creed Generator</h1>${ABOUT(L, CFG)}</div>`,
    schema: [crumbs([["Home", ""], ["About", "about/"]])], updated: CONTENT_DATE,
  });
}

// ---------- write ----------

function writeAll() {
  fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(path.join(SRC, "assets"), path.join(OUT, "assets"));
  homePage(); appPages(); valuesPages(); mottoPages(); heraldryPage(); examplePages(); guidePages();
  const def = exampleDesign(EXAMPLES[0]);
  ogCard("og/default.jpg", "Family Creed Generator", "Your family's creed and crest, made together", crestSvg(def.spec, { id: "ogd" }));

  const manifest = {};
  const titles = new Set();
  for (const p of pages) {
    if (titles.has(p.title)) throw new Error("duplicate title: " + p.title);
    titles.add(p.title);
    const html = layout(p);
    const file = path.join(OUT, p.path, "index.html");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
    if (p.sitemap !== false && !p.noindex) manifest[ABS(p.path)] = hashOf(p.body + p.title + p.desc);
  }
  fs.writeFileSync(path.join(OUT, "404.html"), layout({ path: "404.html", title: "Page not found · Family Creed Generator", desc: "This page does not exist.", noindex: true,
    body: `<div class="wrap narrow article"><h1>That page isn't here</h1><p>It may have moved. Try the <a href="${L()}">home page</a>, or <a href="${L("make/")}">make your family's crest</a>.</p></div>` }));

  const lastmod = Object.fromEntries(pages.map((p) => [ABS(p.path), p.updated || CONTENT_DATE]));
  const urls = Object.keys(manifest);
  fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc><lastmod>${lastmod[u]}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: ${L("c/")}\n\nSitemap: ${ABS("sitemap.xml")}\n`);
  const key = fs.readFileSync(path.join(SRC, "indexnow-key.txt"), "utf8").trim();
  fs.writeFileSync(path.join(OUT, `${key}.txt`), key);
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ built: TODAY, pages: manifest }, null, 1));
  fs.writeFileSync(path.join(OUT, "favicon.svg"), LOGO.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg"'));
  fs.writeFileSync(path.join(OUT, "site.webmanifest"), JSON.stringify({ name: SITE, short_name: "Family Creed", start_url: L("make/"), display: "standalone", background_color: "#faf6ec", theme_color: "#8e2b22", icons: [{ src: L("apple-touch-icon.png"), sizes: "180x180", type: "image/png" }, { src: L("favicon.svg"), sizes: "any", type: "image/svg+xml" }] }));
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
  fs.writeFileSync(path.join(OUT, "og-jobs.json"), JSON.stringify({ logo: LOGO, jobs: ogJobs }));
  console.log(`built ${pages.length} pages, ${ogJobs.length} share cards, ${published.length}/${EXAMPLES.length} examples published (today ${TODAY}) → ${path.relative(ROOT, OUT)}/ for ${BASE_URL}`);
}

writeAll();
