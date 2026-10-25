// Lay out a printable poster: family name, crest, motto translation, creed, credit line.
// Units are 1/100 inch, so a Letter page is 850 x 1100.
import { crestSvg, crestBox, esc } from "./crest.js";

export const SIZES = {
  letter: { label: "Letter, 8.5 × 11 in", w: 8.5, h: 11 },
  a4: { label: "A4, 210 × 297 mm", w: 8.27, h: 11.69 },
  "8x10": { label: "8 × 10 in", w: 8, h: 10 },
  "11x14": { label: "11 × 14 in", w: 11, h: 14 },
  "5x7": { label: "5 × 7 in card", w: 5, h: 7 },
  "16x20": { label: "16 × 20 in", w: 16, h: 20, dpi: 200 },
};

export const STYLES = {
  heirloom: { label: "Heirloom", bg: "#F3EAD3", ink: "#2A1F14", soft: "#6B5A45", accent: "#8E2B22", rule: "#A88A4A", border: "double" },
  modern: { label: "Modern", bg: "#FFFFFF", ink: "#15181E", soft: "#5B6270", accent: "#1F4F9A", rule: "#BFC5CE", border: "thin" },
  midnight: { label: "Midnight", bg: "#13203A", ink: "#F2E8CF", soft: "#CDBF9C", accent: "#E3B23C", rule: "#B8954A", border: "double" },
  sage: { label: "Sage", bg: "#E8EEE4", ink: "#1E2A21", soft: "#56685A", accent: "#2F6B3F", rule: "#93A88F", border: "thin" },
};

export const SERIF = "'EB Garamond', Garamond, 'Times New Roman', serif";
export const DISPLAY = "Cinzel, 'Trajan Pro', 'Times New Roman', serif";

// Rough advance widths (in em) when no real font metrics are available (Node tests, build).
export function approxMeasure(text, font, size) {
  const caps = /Cinzel/.test(font);
  let w = 0;
  for (const ch of text) {
    if (ch === " ") w += 0.25;
    else if (caps) w += /[MW]/i.test(ch) ? 0.95 : /[IJ1.,'’:;!]/.test(ch) ? 0.36 : 0.74;
    else if (/[A-Z]/.test(ch)) w += /[MW]/.test(ch) ? 0.86 : 0.66;
    else if (/[mw]/.test(ch)) w += 0.72;
    else if (/[ijlt.,'’:;!|]/.test(ch)) w += 0.27;
    else w += 0.47;
  }
  return w * size;
}

export function wrap(text, maxWidth, font, size, measure = approxMeasure) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const tryLine = cur ? cur + " " + w : w;
    if (!cur || measure(tryLine, font, size) <= maxWidth) cur = tryLine;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// design: { name, year, creed: { lines: [{ kind, text }] }, motto: { text, translation, lang }, spec }
// opts: { size, style, credit, creditText, fontsCss, measure, id }
export function posterSvg(design, opts = {}) {
  const size = SIZES[opts.size] || SIZES.letter;
  const st = STYLES[opts.style] || STYLES.heirloom;
  const measure = opts.measure || approxMeasure;
  const W = Math.round(size.w * 100), H = Math.round(size.h * 100);
  const S = Math.min(W, H) / 850; // scale relative to Letter width
  const id = opts.id || "p";
  const m = Math.round(56 * S);
  const inner = W - 2 * m - Math.round(70 * S);
  const name = String(design.name || "").trim();
  const title = (name ? `The ${name} Family` : "Our Family").toUpperCase();
  const year = String(design.year || "").trim();
  const lines = (design.creed?.lines || []).filter((l) => String(l.text || "").trim());
  const motto = design.motto || {};
  const spec = { ...design.spec, ribbonText: design.spec?.ribbon === false ? "" : String(motto.text || "").toUpperCase() };

  // Title: shrink to fit one line.
  // Letter-spacing is not part of a measured width, so add it per character.
  const spaced = (t, size, ls) => measure(t, DISPLAY, size) + ls * size * [...t].length;
  let tSize = 50 * S;
  while (spaced(title, tSize, 0.1) > inner && tSize > 22 * S) tSize -= 1;
  const sub = year ? `EST. ${year}` : "";
  const subSize = 17 * S;

  const showTrans = motto.lang === "la" && motto.translation;
  const showMottoText = spec.ribbon === false && motto.text;

  let fs = 24 * S, layout;
  for (let tries = 0; tries < 30; tries++) {
    const lh = fs * 1.32, gap = fs * 0.42;
    const blocks = lines.map((l) => ({ kind: l.kind, rows: wrap(l.text, inner, SERIF, fs, measure) }));
    const creedH = blocks.reduce((h, b) => h + b.rows.length * lh + gap, 0) - gap;
    const top = m + 52 * S;
    const headerH = tSize + (sub ? subSize + 22 * S : 0) + 22 * S;
    const transH = showTrans ? fs * 1.15 + 10 * S : 0;
    const mottoH = showMottoText ? fs * 1.5 + 10 * S : 0;
    const dividerH = 46 * S;
    const footerH = opts.credit === false ? 34 * S : 46 * S;
    const crestH = H - top - headerH - transH - mottoH - dividerH - creedH - footerH - m - 34 * S;
    if (crestH >= H * 0.36 || fs <= 13 * S) { layout = { lh, gap, blocks, creedH, top, headerH, transH, mottoH, dividerH, footerH, crestH }; break; }
    fs -= 0.75 * S;
  }
  const L = layout;
  const box = crestBox(spec);
  let cH = Math.max(120 * S, L.crestH), cW = (cH * box.w) / box.h;
  if (cW > W - 2 * m - 40 * S) { cW = W - 2 * m - 40 * S; cH = (cW * box.h) / box.w; }
  const cx = W / 2;

  let y = L.top;
  let out = "";
  // Header
  out += `<text x="${cx}" y="${y + tSize * 0.8}" font-family="${DISPLAY}" font-weight="700" font-size="${tSize.toFixed(1)}" letter-spacing="${(tSize * 0.1).toFixed(1)}" fill="${st.ink}" text-anchor="middle">${esc(title)}</text>`;
  y += tSize + 6 * S;
  if (sub) {
    const sw = spaced(sub, subSize, 0.25);
    const yy = y + subSize * 0.75;
    out += `<text x="${cx}" y="${yy}" font-family="${DISPLAY}" font-weight="500" font-size="${subSize.toFixed(1)}" letter-spacing="${(subSize * 0.25).toFixed(1)}" fill="${st.soft}" text-anchor="middle">${esc(sub)}</text>`;
    const ry = yy - subSize * 0.32;
    out += `<path d="M${cx - sw / 2 - 90 * S},${ry} H${cx - sw / 2 - 14 * S} M${cx + sw / 2 + 14 * S},${ry} H${cx + sw / 2 + 90 * S}" stroke="${st.rule}" stroke-width="${1.6 * S}"/>`;
    y += subSize + 22 * S;
  }
  y += 22 * S;
  // Crest
  const crest = crestSvg(spec, { id: id + "c", ribbonFont: DISPLAY });
  out += crest.replace("<svg ", `<svg x="${(cx - cW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${cW.toFixed(1)}" height="${cH.toFixed(1)}" `);
  y += cH + 10 * S;
  if (showTrans) {
    out += `<text x="${cx}" y="${y + fs * 0.85}" font-family="${SERIF}" font-style="italic" font-size="${fs.toFixed(1)}" fill="${st.soft}" text-anchor="middle">“${esc(motto.translation)}”</text>`;
    y += L.transH;
  }
  if (showMottoText) {
    out += `<text x="${cx}" y="${y + fs * 1.1}" font-family="${DISPLAY}" font-weight="700" font-size="${(fs * 1.15).toFixed(1)}" letter-spacing="${(fs * 0.08).toFixed(1)}" fill="${st.accent}" text-anchor="middle">${esc(String(motto.text).toUpperCase())}</text>`;
    y += L.mottoH;
  }
  // Divider: a small diamond between two rules.
  const dy = y + L.dividerH / 2;
  out += `<path d="M${cx - 120 * S},${dy} H${cx - 16 * S} M${cx + 16 * S},${dy} H${cx + 120 * S}" stroke="${st.rule}" stroke-width="${1.6 * S}"/>`;
  out += `<path d="M${cx},${dy - 8 * S} L${cx + 8 * S},${dy} L${cx},${dy + 8 * S} L${cx - 8 * S},${dy} Z" fill="${st.accent}"/>`;
  y += L.dividerH;
  // Creed
  for (const b of L.blocks) {
    const italic = b.kind === "open" || b.kind === "close";
    const fill = b.kind === "close" ? st.accent : st.ink;
    for (const r of b.rows) {
      y += L.lh;
      out += `<text x="${cx}" y="${(y - L.lh * 0.28).toFixed(1)}" font-family="${SERIF}"${italic ? ' font-style="italic"' : ""} font-size="${fs.toFixed(1)}" fill="${fill}" text-anchor="middle">${esc(r)}</text>`;
    }
    y += L.gap;
  }
  // Footer credit
  if (opts.credit !== false) {
    const credit = opts.creditText || "Made with Family Creed Generator";
    out += `<text x="${cx}" y="${H - m - 26 * S}" font-family="${SERIF}" font-size="${(12.5 * S).toFixed(1)}" fill="${st.soft}" text-anchor="middle" letter-spacing="${(0.4 * S).toFixed(2)}">${esc(credit)}</text>`;
  }

  // Background and border
  let bg = `<rect width="${W}" height="${H}" fill="${st.bg}"/>`;
  const b1 = m * 0.55;
  if (st.border === "double") {
    bg += `<rect x="${b1}" y="${b1}" width="${W - 2 * b1}" height="${H - 2 * b1}" fill="none" stroke="${st.rule}" stroke-width="${3.2 * S}"/>`;
    bg += `<rect x="${b1 + 9 * S}" y="${b1 + 9 * S}" width="${W - 2 * b1 - 18 * S}" height="${H - 2 * b1 - 18 * S}" fill="none" stroke="${st.rule}" stroke-width="${1.1 * S}"/>`;
    for (const [x, yy] of [[b1, b1], [W - b1, b1], [b1, H - b1], [W - b1, H - b1]]) {
      bg += `<path d="M${x},${yy - 11 * S} L${x + 11 * S},${yy} L${x},${yy + 11 * S} L${x - 11 * S},${yy} Z" fill="${st.rule}"/>`;
    }
  } else {
    bg += `<rect x="${b1}" y="${b1}" width="${W - 2 * b1}" height="${H - 2 * b1}" fill="none" stroke="${st.rule}" stroke-width="${1.4 * S}"/>`;
  }
  const style = opts.fontsCss ? `<style>${opts.fontsCss}</style>` : "";
  const label = esc(`${title}${year ? ", est. " + year : ""}: family crest and creed`);
  // fluid: no fixed size, so CSS can scale it (previews); otherwise pixel or 1/100-inch size.
  const dims = opts.fluid ? "" : ` width="${opts.width || W}" height="${opts.height || H}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${dims} role="img" aria-label="${label}"><defs>${style}</defs>${bg}${out}</svg>`;
}

export function pixelSize(sizeKey) {
  const s = SIZES[sizeKey] || SIZES.letter;
  const dpi = s.dpi || 300;
  return { w: Math.round(s.w * dpi), h: Math.round(s.h * dpi), dpi, wPt: s.w * 72, hPt: s.h * 72 };
}
