// Browser exports: print-ready PDF, PNG poster, transparent crest PNG, SVG.
import { posterSvg, pixelSize, SIZES, STYLES, SERIF, DISPLAY } from "../engine/poster.js";
import { crestSvg, crestBox } from "../engine/crest.js";
import { jpegPdf } from "../engine/pdf.js";
import { CFG, slug } from "./ui.js";

const FONTS = [
  { family: "Cinzel", style: "normal", file: "Cinzel-normal-latin.woff2", ext: false },
  { family: "Cinzel", style: "normal", file: "Cinzel-normal-latin-ext.woff2", ext: true },
  { family: "EB Garamond", style: "normal", file: "EBGaramond-normal-latin.woff2", ext: false },
  { family: "EB Garamond", style: "normal", file: "EBGaramond-normal-latin-ext.woff2", ext: true },
  { family: "EB Garamond", style: "italic", file: "EBGaramond-italic-latin.woff2", ext: false },
  { family: "EB Garamond", style: "italic", file: "EBGaramond-italic-latin-ext.woff2", ext: true },
];
const RANGE_LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD";
const RANGE_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1EFF, U+2C60-2C7F, U+A720-A7FF";
const fontData = new Map();

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// @font-face rules with the fonts inlined, so the SVG renders the same once it is an image.
export async function embeddedFontsCss(text = "") {
  const needExt = /[Ā-￿]/.test(text.replace(/[ -⁯€™−﻿�“”‘’]/g, ""));
  const parts = [];
  for (const f of FONTS) {
    if (f.ext && !needExt) continue;
    if (!fontData.has(f.file)) {
      const res = await fetch(CFG.base + "assets/fonts/" + f.file);
      if (!res.ok) throw new Error("font " + f.file);
      fontData.set(f.file, toB64(await res.arrayBuffer()));
    }
    parts.push(`@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:400 900;src:url(data:font/woff2;base64,${fontData.get(f.file)}) format('woff2');unicode-range:${f.ext ? RANGE_EXT : RANGE_LATIN};}`);
  }
  return parts.join("");
}

let ctx;
// Real text widths from the loaded web fonts, for line wrapping that matches the render.
export function canvasMeasure(text, font, size) {
  ctx = ctx || document.createElement("canvas").getContext("2d");
  const bold = /Cinzel/.test(font);
  ctx.font = `${bold ? 700 : 400} ${size}px ${font}`;
  return ctx.measureText(text).width;
}

export async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(`700 40px Cinzel`), document.fonts.load(`400 24px "EB Garamond"`), document.fonts.load(`italic 400 24px "EB Garamond"`),
    ]);
  } catch { /* fallback fonts still render */ }
}

async function svgToCanvas(svg, w, hgt, bg) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.width = w;
    img.height = hgt;
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = w;
    c.height = hgt;
    const g = c.getContext("2d");
    const paint = () => {
      g.clearRect(0, 0, w, hgt);
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, hgt); }
      g.drawImage(img, 0, 0, w, hgt);
    };
    paint();
    // Safari can paint an SVG image before its embedded fonts are ready; a second pass fixes it.
    await new Promise((r) => setTimeout(r, 150));
    paint();
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas, type, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), type, q));

function allText(design) {
  return [design.name, design.motto?.text, design.motto?.translation, ...(design.creed?.lines || []).map((l) => l.text)].join(" ");
}

export function creditText() {
  const host = (CFG.site || location.origin + CFG.base).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `Made with Family Creed Generator · ${host}`;
}

async function posterCanvas(design, opts) {
  const px = pixelSize(opts.size);
  await fontsReady();
  const fontsCss = await embeddedFontsCss(allText(design));
  const svg = posterSvg(design, { ...opts, fontsCss, measure: canvasMeasure, creditText: creditText(), width: px.w, height: px.h, id: "x" });
  const st = STYLES[opts.style] || STYLES.heirloom;
  return { canvas: await svgToCanvas(svg, px.w, px.h, st.bg), px };
}

export function fileBase(design, opts) {
  return `${slug(design.name)}-family-crest-${opts.size || "letter"}`;
}

export async function exportPdf(design, opts) {
  const { canvas, px } = await posterCanvas(design, opts);
  const jpg = new Uint8Array(await (await toBlob(canvas, "image/jpeg", 0.93)).arrayBuffer());
  const pdf = jpegPdf(jpg, px.w, px.h, px.wPt, px.hPt, { title: `${design.name ? "The " + design.name + " Family" : "Our Family"} Crest and Creed` });
  return new Blob([pdf], { type: "application/pdf" });
}

export async function exportPng(design, opts) {
  const { canvas } = await posterCanvas(design, opts);
  return toBlob(canvas, "image/png");
}

// The crest alone on a transparent background, 2400 px wide: for shirts, mugs and embroidery.
export async function exportCrestPng(design) {
  const spec = { ...design.spec, ribbonText: design.spec.ribbon === false ? "" : String(design.motto?.text || "").toUpperCase() };
  const box = crestBox(spec);
  const w = 2400, hgt = Math.round((w * box.h) / box.w);
  await fontsReady();
  const fontsCss = await embeddedFontsCss(spec.ribbonText);
  const svg = crestSvg(spec, { id: "e", width: w, height: hgt, ribbonFont: DISPLAY }).replace("<defs>", `<defs><style>${fontsCss}</style>`);
  return toBlob(await svgToCanvas(svg, w, hgt, null), "image/png");
}

export async function exportSvg(design, opts) {
  await fontsReady();
  const fontsCss = await embeddedFontsCss(allText(design));
  const svg = posterSvg(design, { ...opts, fontsCss, measure: canvasMeasure, creditText: creditText(), id: "s" });
  return new Blob([svg], { type: "image/svg+xml" });
}

export function download(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

export { SIZES, STYLES, SERIF };
