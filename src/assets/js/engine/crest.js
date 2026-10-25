// Draw a coat of arms from a crest spec, and describe it in blazon.
//
// Spec (all keys required unless noted):
// {
//   shield: "heater" | "french" | "spanish" | "swiss" | "oval",
//   layout: one of LAYOUTS,
//   division: "pale" | "fess" | "bend" | "bendSinister" | "chevron" | "quarterly" | "saltire" | "gyronny" | "paly" | "barry" | "bendy" | "chequy"  (party layouts)
//   line: "straight" | "wavy" | "indented" | "embattled" | "engrailed" | "invected" | "dancetty",
//   t: [fieldTincture, secondTincture, ordinaryTincture, mainChargeTincture, secondaryTincture],
//   main: chargeId, second: chargeId,
//   frame: "laurel" | "oak" | "none", frameT: tincture, crest: true | false (a charge on a wreath above),
//   ribbon: true | false, ribbonText: string, finish: "shaded" | "flat"
// }
import { CHARGES } from "./charges.js";
import { TINCTURES, OUTLINE, contrasts, isMetal } from "./tinctures.js";
import { chargeSvg } from "./draw-charge.js";
import { fmt, polar, circle, ellipse, poly } from "./geom.js";

export const SW = 600, SH = 700; // shield box

export const SHIELDS = {
  heater: { label: "Heater", d: "M0,0 H600 V300 C600,520 430,640 300,700 C170,640 0,520 0,300 Z", fy: 310, low: 0 },
  french: { label: "French", d: "M0,0 H600 V540 C600,610 560,640 490,640 H384 C338,640 312,662 300,700 C288,662 262,640 216,640 H110 C40,640 0,610 0,540 Z", fy: 320, low: 22 },
  spanish: { label: "Rounded", d: "M0,0 H600 V400 C600,566 466,700 300,700 C134,700 0,566 0,400 Z", fy: 330, low: 26 },
  swiss: { label: "Arched", d: "M0,44 C110,4 190,4 300,44 C410,4 490,4 600,44 V300 C600,520 430,640 300,700 C170,640 0,520 0,300 Z", fy: 326, low: 0 },
  oval: { label: "Oval", d: "M0,350 C0,157 134,0 300,0 C466,0 600,157 600,350 C600,543 466,700 300,700 C134,700 0,543 0,350 Z", fy: 350, low: 14 },
};

export const LINES = {
  straight: { label: "Straight", word: "" },
  wavy: { label: "Wavy", word: "wavy", period: 120, amp: 16 },
  indented: { label: "Indented", word: "indented", period: 56, amp: 26 },
  embattled: { label: "Embattled", word: "embattled", period: 88, amp: 30 },
  engrailed: { label: "Engrailed", word: "engrailed", period: 64, amp: 16 },
  invected: { label: "Invected", word: "invected", period: 64, amp: 16 },
  dancetty: { label: "Dancetty", word: "dancetty", period: 150, amp: 56 },
};

export const DIVISIONS = {
  pale: { label: "Per pale", lines: true }, fess: { label: "Per fess", lines: true },
  bend: { label: "Per bend", lines: true }, bendSinister: { label: "Per bend sinister", lines: true },
  chevron: { label: "Per chevron", lines: true }, quarterly: { label: "Quarterly" },
  saltire: { label: "Per saltire" }, gyronny: { label: "Gyronny" }, paly: { label: "Paly" },
  barry: { label: "Barry", wavy: true }, bendy: { label: "Bendy" }, chequy: { label: "Chequy" },
};

// Layouts: how the field, ordinary and charges are arranged.
export const LAYOUTS = {
  center: { label: "One great charge", ordinary: null },
  party: { label: "Divided field, counterchanged", ordinary: null, party: true },
  impaled: { label: "Two halves joined", ordinary: null, party: true },
  quarterly: { label: "Quarters", ordinary: null, party: true },
  chief: { label: "With a chief", ordinary: "chief", lines: true },
  chevron: { label: "With a chevron", ordinary: "chevron", lines: true },
  fess: { label: "With a fess", ordinary: "fess", lines: true },
  bend: { label: "With a bend", ordinary: "bend", lines: true },
  cross: { label: "With a cross", ordinary: "cross" },
  saltire: { label: "With a saltire", ordinary: "saltire" },
  canton: { label: "With a canton", ordinary: "canton" },
  bordure: { label: "Within a bordure", ordinary: "bordure" },
};

// ---------- lines of partition ----------

const P2 = ([x, y]) => `${fmt(x)},${fmt(y)}`;

// Path commands from p0 (the current point) to p1 along a patterned line. The pattern's
// "inside" is to the left of travel in screen space (+n = (-uy, ux)).
function edge(p0, p1, type) {
  const L = LINES[type];
  if (!L || !L.period) return ` L${P2(p1)}`;
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const n = Math.max(2, Math.round(len / L.period));
  const step = len / n, A = L.amp;
  const P = (t, o) => [p0[0] + ux * t + nx * o, p0[1] + uy * t + ny * o];
  let s = "";
  for (let i = 0; i < n; i++) {
    const t0 = i * step;
    switch (type) {
      case "wavy": {
        const o = (i % 2 ? -1 : 1) * A * 2;
        s += ` Q${P2(P(t0 + step / 2, o))} ${P2(P(t0 + step, 0))}`;
        break;
      }
      case "indented":
      case "dancetty":
        s += ` L${P2(P(t0 + step / 2, A))} L${P2(P(t0 + step, 0))}`;
        break;
      case "embattled":
        s += ` L${P2(P(t0, A))} L${P2(P(t0 + step / 2, A))} L${P2(P(t0 + step / 2, 0))} L${P2(P(t0 + step, 0))}`;
        break;
      case "engrailed":
        s += ` Q${P2(P(t0 + step / 2, A * 2))} ${P2(P(t0 + step, 0))}`;
        break;
      case "invected":
        s += ` Q${P2(P(t0 + step / 2, -A * 2))} ${P2(P(t0 + step, 0))}`;
        break;
      default:
        s += ` L${P2(P(t0 + step, 0))}`;
    }
  }
  return s;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const unit = (v) => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; };
const normal = (u) => [-u[1], u[0]];

function intersect(p, r, q, s) {
  const cross = r[0] * s[1] - r[1] * s[0];
  const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / cross;
  return add(p, mul(r, t));
}

// A band of half-width h along A→B, edges patterned, inside on the band side.
function band(A, B, h, line = "straight") {
  const u = unit(sub(B, A)), n = normal(u);
  const a1 = sub(A, mul(n, h)), b1 = sub(B, mul(n, h)), b2 = add(B, mul(n, h)), a2 = add(A, mul(n, h));
  return `M${P2(a1)}${edge(a1, b1, line)} L${P2(b2)}${edge(b2, a2, line)} Z`;
}

// A chevron-shaped band through L → P → R.
function chevronBand(L, P, R, h, line = "straight") {
  const u1 = unit(sub(P, L)), u2 = unit(sub(R, P)), n1 = normal(u1), n2 = normal(u2);
  const lo = sub(L, mul(n1, h)), ro = sub(R, mul(n2, h)), li = add(L, mul(n1, h)), ri = add(R, mul(n2, h));
  const po = intersect(lo, u1, ro, u2), pi = intersect(li, u1, ri, u2);
  return `M${P2(lo)}${edge(lo, po, line)}${edge(po, ro, line)} L${P2(ri)}${edge(ri, pi, line)}${edge(pi, li, line)} Z`;
}

// ---------- field divisions: the region painted in the second tincture ----------

function divisionRegion(div, line, sh) {
  const fy = sh.fy;
  const lt = DIVISIONS[div]?.lines ? line : "straight";
  switch (div) {
    case "pale": { const a = [300, -60], b = [300, 760]; return `M${P2(a)}${edge(a, b, lt)} L660,760 L660,-60 Z`; }
    case "fess": { const a = [660, fy], b = [-60, fy]; return `M${P2(a)}${edge(a, b, lt)} L-60,760 L660,760 Z`; }
    case "bend": { const a = [660, 703], b = [-60, -64]; return `M${P2(a)}${edge(a, b, lt)} L-60,760 L660,760 Z`; }
    case "bendSinister": { const a = [660, -64], b = [-60, 703]; return `M${P2(a)}${edge(a, b, lt)} L-60,760 L660,760 Z`; }
    case "chevron": {
      const l = [-60, 640], p = [300, 250], r = [660, 640];
      return `M${P2(r)}${edge(r, p, lt)}${edge(p, l, lt)} L-60,760 L660,760 Z`;
    }
    case "quarterly": return `M300,-60 H660 V${fy} H300 Z M-60,${fy} H300 V760 H-60 Z`;
    case "saltire": return `M-60,-60 L300,${fy} L-60,760 Z M660,-60 L300,${fy} L660,760 Z`;
    case "gyronny": {
      const c = [300, fy], pts = [[300, -60], [660, -60], [660, fy], [660, 760], [300, 760], [-60, 760], [-60, fy], [-60, -60]];
      let d = "";
      for (let i = 0; i < 8; i += 2) d += `M${P2(c)} L${P2(pts[i])} L${P2(pts[i + 1])} Z `;
      return d;
    }
    case "paly": { let d = ""; for (let i = 1; i < 6; i += 2) d += `M${i * 100},-60 H${i * 100 + 100} V760 H${i * 100} Z `; return d; }
    case "barry": {
      let d = "";
      const h = SH / 6;
      for (let i = 1; i < 6; i += 2) {
        const y0 = i * h, y1 = y0 + h;
        if (line === "wavy") {
          const a = [-60, y0], b = [660, y0], c = [660, y1], e = [-60, y1];
          d += `M${P2(e)}${edge(e, c, "wavy").replace(/^ /, " ")} L660,${fmt(y0)}${edge(b, a, "wavy")} Z `;
        } else d += `M-60,${fmt(y0)} H660 V${fmt(y1)} H-60 Z `;
      }
      return d;
    }
    case "bendy": {
      let d = "";
      const w = 150;
      for (let i = -4; i < 6; i += 2) {
        const off = i * w;
        d += `M${-60 + off},-60 L${-60 + off + w},-60 L${-60 + off + w + 820},760 L${-60 + off + 820},760 Z `;
      }
      return d;
    }
    case "chequy": {
      let d = "";
      const c = 100;
      for (let r = 0; r < 7; r++) for (let k = 0; k < 6; k++) if ((r + k) % 2) d += `M${k * c},${r * c} h${c} v${c} h-${c} Z `;
      return d;
    }
  }
  return "";
}

// ---------- ordinaries ----------

function ordinaryPath(type, line, sh) {
  const fy = sh.fy;
  switch (type) {
    case "chief": { const a = [660, 196], b = [-60, 196]; return `M-60,-60 L660,-60 L${P2(a)}${edge(a, b, line)} Z`; }
    case "fess": return band([-60, fy], [660, fy], 82, line);
    case "pale": return band([300, -60], [300, 760], 82, line);
    case "bend": return band([-60, -64], [660, 703], 80, line);
    case "bendSinister": return band([660, -64], [-60, 703], 80, line);
    case "chevron": return chevronBand([-60, 590], [300, 226], [660, 590], 60, line);
    case "cross": {
      const h = 70, x0 = 300 - h, x1 = 300 + h, y0 = fy - h, y1 = fy + h;
      return `M${x0},-60 H${x1} V${y0} H660 V${y1} H${x1} V760 H${x0} V${y1} H-60 V${y0} H${x0} Z`;
    }
    case "saltire": return band([-60, -64], [660, 2 * fy + 64], 62) + " " + band([660, -64], [-60, 2 * fy + 64], 62);
    case "canton": return "M-60,-60 H214 V214 H-60 Z";
  }
  return "";
}

// ---------- layouts: charge placements ----------
// Each placement: { id, t, x, y, s, clip?: "A"|"B" }

function placements(spec, sh) {
  const [tf, t2, to, tm, ts] = spec.t;
  const fy = sh.fy, low = sh.low;
  const M = spec.main, S = spec.second;
  switch (spec.layout) {
    case "center": return [{ id: M, t: tm, x: 300, y: fy + 18 + low * 0.4, s: 370 }];
    case "party": return [{ id: M, t: "counter", x: 300, y: fy + 18 + low * 0.4, s: 380 }];
    case "impaled": return [{ id: M, t: t2, x: 154, y: fy + 4, s: 236 }, { id: S, t: tf, x: 446, y: fy + 4, s: 236 }];
    case "quarterly": {
      const yb = fy + 150 + low * 0.5;
      return [
        { id: M, t: t2, x: 150, y: fy / 2 + 6, s: 220 }, { id: S, t: tf, x: 450, y: fy / 2 + 6, s: 200 },
        { id: S, t: tf, x: 150 + low * 0.3, y: yb, s: 180 }, { id: M, t: t2, x: 450 - low * 0.3, y: yb, s: 200 },
      ];
    }
    case "chief": return [
      { id: S, t: ts, x: 120, y: 98, s: 138 }, { id: S, t: ts, x: 300, y: 98, s: 138 }, { id: S, t: ts, x: 480, y: 98, s: 138 },
      { id: M, t: tm, x: 300, y: 430 + low * 0.5, s: 300 },
    ];
    case "chevron": return [
      { id: S, t: ts, x: 122, y: 140, s: 150 }, { id: S, t: ts, x: 478, y: 140, s: 150 },
      { id: M, t: tm, x: 300, y: 500 + low * 0.6, s: 178 },
    ];
    case "fess": return [
      { id: M, t: tm, x: 300, y: 128, s: 196 },
      { id: S, t: ts, x: 300, y: 526 + low * 0.6, s: 170 },
    ];
    case "bend": return [
      { id: M, t: tm, x: 438, y: 166, s: 214 },
      { id: S, t: ts, x: 156, y: 470 + low * 0.4, s: 184 },
    ];
    case "cross": return [
      { id: M, t: tm, x: 300, y: fy, s: 152 },
      { id: S, t: ts, x: 116, y: 116, s: 150 }, { id: S, t: ts, x: 484, y: 116, s: 150 },
      { id: S, t: ts, x: 128 + low, y: fy + 162, s: 140 }, { id: S, t: ts, x: 472 - low, y: fy + 162, s: 140 },
    ];
    case "saltire": return [
      { id: M, t: tm, x: 300, y: fy, s: 124 },
      { id: S, t: ts, x: 300, y: 92, s: 132 }, { id: S, t: ts, x: 86, y: fy, s: 118 }, { id: S, t: ts, x: 514, y: fy, s: 118 },
      { id: S, t: ts, x: 300, y: fy + 232 + low * 0.5, s: 120 },
    ];
    case "canton": return [
      { id: S, t: ts, x: 77, y: 77, s: 118 },
      { id: M, t: tm, x: 330, y: fy + 40 + low * 0.4, s: 330 },
    ];
    case "bordure": {
      const out = [{ id: M, t: tm, x: 300, y: fy + 4 + low * 0.3, s: 316 }];
      return out;
    }
  }
  return [];
}

// Small charges set around the bordure, following the shield edge.
function bordureCharges(spec, sh) {
  const n = 8;
  const pts = sampleShield(sh, n);
  return pts.map(([x, y]) => ({ id: spec.second, t: spec.t[4], x, y, s: 50 }));
}

// Points spaced along the shield outline, pulled 32 units inside.
function sampleShield(sh, n) {
  const fy = sh.fy;
  const out = [];
  // Approximate the outline with a polygon by sampling the path.
  const poly = shieldPolygon(sh);
  let total = 0;
  const segs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push([a, b, l]);
    total += l;
  }
  const cx = 300, cy = fy + 40;
  for (let k = 0; k < n; k++) {
    let target = ((k + 0.5) / n) * total;
    for (const [a, b, l] of segs) {
      if (target <= l) {
        const t = target / l;
        const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        const v = unit([cx - x, cy - y]);
        out.push([x + v[0] * 31, y + v[1] * 31]);
        break;
      }
      target -= l;
    }
  }
  return out;
}

function shieldPolygon(sh) {
  // Sample cubic/line commands of the shield path into points.
  const toks = sh.d.match(/[MHVLCZ]|-?\d*\.?\d+/g);
  const pts = [];
  let i = 0, cur = [0, 0], cmd = "";
  while (i < toks.length) {
    if (/[A-Z]/.test(toks[i])) cmd = toks[i++];
    if (cmd === "Z") continue;
    const n = () => parseFloat(toks[i++]);
    if (cmd === "M" || cmd === "L") { cur = [n(), n()]; pts.push(cur); }
    else if (cmd === "H") { cur = [n(), cur[1]]; pts.push(cur); }
    else if (cmd === "V") { cur = [cur[0], n()]; pts.push(cur); }
    else if (cmd === "C") {
      const c1 = [n(), n()], c2 = [n(), n()], e = [n(), n()];
      for (let k = 1; k <= 12; k++) {
        const t = k / 12, u = 1 - t;
        pts.push([u * u * u * cur[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * e[0], u * u * u * cur[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * e[1]]);
      }
      cur = e;
    }
  }
  return pts;
}

// ---------- rendering ----------

let uid = 0;

function frameSvg(kind, t, ow) {
  if (!kind || kind === "none") return "";
  const col = TINCTURES[t].hex;
  let s = "";
  // Two branches curving up from below the shield to its upper sides.
  for (const side of [-1, 1]) {
    const p0 = [500 + side * 40, 965], p1 = [500 + side * 330, 960], p2 = [500 + side * 420, 650], p3 = [500 + side * 350, 260];
    const stem = `M${P2(p0)} C${P2(p1)} ${P2(p2)} ${P2(p3)}`;
    s += `<path d="${stem}" fill="none" stroke="${OUTLINE}" stroke-width="${fmt(10 + 2 * ow)}" stroke-linecap="round"/>`;
    s += `<path d="${stem}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round"/>`;
    const n = 13;
    let leaves = "";
    for (let k = 0; k < n; k++) {
      const tt = 0.06 + (k / (n - 1)) * 0.92;
      const u = 1 - tt;
      const x = u * u * u * p0[0] + 3 * u * u * tt * p1[0] + 3 * u * tt * tt * p2[0] + tt * tt * tt * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * tt * p1[1] + 3 * u * tt * tt * p2[1] + tt * tt * tt * p3[1];
      const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * tt * (p2[0] - p1[0]) + 3 * tt * tt * (p3[0] - p2[0]);
      const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * tt * (p2[1] - p1[1]) + 3 * tt * tt * (p3[1] - p2[1]);
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const sz = 1 - k / (n * 2.2);
      for (const io of [-1, 1]) {
        const ang = a + io * 42;
        const [cx, cy] = polar(x, y, 30 * sz, ang);
        leaves += leafPath(kind, cx, cy, 64 * sz, ang);
      }
    }
    s += `<g stroke="${OUTLINE}" stroke-width="${fmt(2 * ow)}" stroke-linejoin="round" fill="none">${leaves}</g>`;
    s += `<g fill="${col}">${leaves}</g>`;
  }
  return s;
}

function leafPath(kind, cx, cy, len, deg) {
  const r = (deg * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  const T = (x, y) => `${fmt(cx + x * co - y * si)},${fmt(cy + x * si + y * co)}`;
  const h = len / 2;
  if (kind === "oak") {
    const w = len * 0.24;
    return `<path d="M${T(-h, 0)} Q${T(-h * 0.6, -w * 1.2)} ${T(-h * 0.3, -w * 0.5)} Q${T(-h * 0.05, -w * 1.5)} ${T(h * 0.2, -w * 0.55)} Q${T(h * 0.55, -w * 1.3)} ${T(h, 0)} Q${T(h * 0.55, w * 1.3)} ${T(h * 0.2, w * 0.55)} Q${T(-h * 0.05, w * 1.5)} ${T(-h * 0.3, w * 0.5)} Q${T(-h * 0.6, w * 1.2)} ${T(-h, 0)} Z"/>`;
  }
  const w = len * 0.2;
  return `<path d="M${T(-h, 0)} Q${T(0, -w * 1.6)} ${T(h, 0)} Q${T(0, w * 1.6)} ${T(-h, 0)} Z"/>`;
}

function torseSvg(tA, tB, ow) {
  // A twisted wreath of six alternating segments, sitting on the shield's top edge.
  const x0 = 330, x1 = 670, y = 128, h = 40, n = 6, w = (x1 - x0) / n;
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w, b = a + w;
    const d = `M${fmt(a)},${y + h / 2} Q${fmt(a + w * 0.15)},${y - h / 2} ${fmt(a + w * 0.55)},${y - h / 2} L${fmt(b + w * 0.05)},${y - h / 2} Q${fmt(b - w * 0.3)},${y + h / 2} ${fmt(b - w * 0.45)},${y + h / 2} Z`;
    s += `<path d="${d}" fill="${TINCTURES[i % 2 ? tB : tA].hex}" stroke="${OUTLINE}" stroke-width="${fmt(ow)}" stroke-linejoin="round"/>`;
  }
  return s;
}

function ribbonSvg(text, id, ow, fontFamily = "Cinzel, 'Times New Roman', serif") {
  // Long mottos get a longer ribbon, then smaller letters.
  const len = Math.max(1, [...text].length);
  const ex = Math.max(0, Math.min(80, (len - 16) * 7));
  const x0 = 150 - ex, x1 = 850 + ex;
  const band = `M${x0},955 Q500,1035 ${x1},955 L${x1},1045 Q500,1125 ${x0},1045 Z`;
  const endL = `M${x0},975 L${x0 - 66},995 L${x0 - 38},1032 L${x0 - 66},1072 L${x0 + 22},1072 Z`;
  const endR = `M${x1},975 L${x1 + 66},995 L${x1 + 38},1032 L${x1 + 66},1072 L${x1 - 22},1072 Z`;
  const foldL = `M${x0},1045 L${x0 + 22},1072 L${x0 + 22},1040 Z`, foldR = `M${x1},1045 L${x1 - 22},1072 L${x1 - 22},1040 Z`;
  const parch = "#F5EBD2", parchDark = "#D9C8A0";
  // The text path is about (x1 - x0) units long; Cinzel capitals average ~0.8 em with the tracking below.
  const fs = Math.max(26, Math.min(56, (x1 - x0 - 70) / (len * 0.8)));
  const st = (d, f) => `<path d="${d}" fill="${f}" stroke="${OUTLINE}" stroke-width="${fmt(ow)}" stroke-linejoin="round"/>`;
  return st(endL, parchDark) + st(endR, parchDark) + st(foldL, "#B9A67C") + st(foldR, "#B9A67C") + st(band, parch) +
    `<path id="${id}-mt" d="M${x0},1012 Q500,1092 ${x1},1012" fill="none"/>` +
    `<text font-family="${fontFamily}" font-weight="700" font-size="${fmt(fs)}" fill="#3A2A1A" letter-spacing="${fmt(fs * 0.06)}" text-anchor="middle" dominant-baseline="middle"><textPath href="#${id}-mt" startOffset="50%">${esc(text)}</textPath></text>`;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Render the full achievement (shield, optional frame, crest and motto ribbon) as an SVG string.
// opts: { id, width, height, title }
export function crestSvg(spec, opts = {}) {
  const id = opts.id || "c" + (++uid).toString(36);
  const sh = SHIELDS[spec.shield] || SHIELDS.heater;
  const ow = 4.5;
  const [tf, t2, to] = spec.t;
  const hex = (t) => TINCTURES[t].hex;
  const layout = LAYOUTS[spec.layout] || LAYOUTS.center;
  const ord = layout.ordinary;
  const party = layout.party;
  const div = party ? (spec.layout === "impaled" ? "pale" : spec.layout === "quarterly" ? "quarterly" : spec.division) : null;
  const line = spec.line || "straight";

  let field = `<rect x="-60" y="-60" width="720" height="820" fill="${hex(tf)}"/>`;
  let regionB = "";
  if (div) {
    regionB = divisionRegion(div, layout.party && spec.layout === "party" ? line : "straight", sh);
    field += `<path d="${regionB}" fill="${hex(t2)}" stroke="${OUTLINE}" stroke-width="${fmt(2 * ow)}" stroke-linejoin="round"/>`;
    field += `<path d="${regionB}" fill="${hex(t2)}"/>`;
  }

  let ordinary = "";
  if (ord === "bordure") {
    ordinary = `<path d="${sh.d}" fill="none" stroke="${OUTLINE}" stroke-width="${fmt(124 + 2 * ow)}"/><path d="${sh.d}" fill="none" stroke="${hex(to)}" stroke-width="124"/>`;
  } else if (ord) {
    const d = ordinaryPath(ord, LAYOUTS[spec.layout].lines ? line : "straight", sh);
    ordinary = `<path d="${d}" fill="none" stroke="${OUTLINE}" stroke-width="${fmt(2 * ow)}" stroke-linejoin="round"/><path d="${d}" fill="${hex(to)}"/>`;
  }

  let charges = "";
  const defs = [];
  if (div) {
    defs.push(`<clipPath id="${id}-B"><path d="${regionB}"/></clipPath>`);
    defs.push(`<clipPath id="${id}-A"><path d="M-60,-60 H660 V760 H-60 Z ${regionB}" clip-rule="evenodd"/></clipPath>`);
  }
  for (const p of placements(spec, sh)) {
    if (!CHARGES[p.id]) continue; // a field-only illustration
    if (p.t === "counter") {
      charges += `<g clip-path="url(#${id}-A)">${chargeSvg(p.id, t2, p.x, p.y, p.s, ow)}</g>`;
      charges += `<g clip-path="url(#${id}-B)">${chargeSvg(p.id, tf, p.x, p.y, p.s, ow)}</g>`;
    } else charges += chargeSvg(p.id, p.t, p.x, p.y, p.s, ow);
  }
  if (ord === "bordure" && spec.bordureCharged && CHARGES[spec.second]) {
    for (const p of bordureCharges(spec, sh)) charges += chargeSvg(p.id, spec.t[4], p.x, p.y, p.s, ow * 0.8);
  }

  const shade = spec.finish === "flat" ? "" :
    `<rect x="0" y="0" width="600" height="700" fill="url(#${id}-shade)"/><rect x="0" y="0" width="600" height="700" fill="url(#${id}-glow)"/>`;
  defs.push(`<clipPath id="${id}-shield"><path d="${sh.d}"/></clipPath>`);
  defs.push(`<linearGradient id="${id}-shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>`);
  defs.push(`<radialGradient id="${id}-glow" cx=".35" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);

  const showCrest = !!spec.crest;
  let crestPart = "";
  if (showCrest && CHARGES[spec.crestCharge || spec.second]) {
    const metal = isMetal(tf) ? tf : isMetal(t2) ? t2 : "or";
    const colour = isMetal(tf) ? (t2 && !isMetal(t2) ? t2 : "azure") : tf;
    crestPart = chargeSvg(spec.crestCharge || spec.second, spec.crestT || metal, 500, 70, 136, ow) + torseSvg(metal, colour, ow);
  }

  // Fixed positions: crest 0-150, shield 170-870, ribbon 955-1125. The viewBox crops what is unused.
  const shieldG =
    `<g transform="translate(200,170)">` +
    `<path d="${sh.d}" fill="${OUTLINE}" stroke="${OUTLINE}" stroke-width="${fmt(ow * 4)}" stroke-linejoin="round"/>` +
    `<g clip-path="url(#${id}-shield)">${field}${ordinary}${charges}${shade}</g>` +
    `<path d="${sh.d}" fill="none" stroke="${OUTLINE}" stroke-width="${fmt(ow * 2.2)}" stroke-linejoin="round"/>` +
    `</g>`;
  const frame = frameSvg(spec.frame, spec.frameT || "or", ow);
  const showRibbon = spec.ribbon !== false && !!spec.ribbonText;
  const ribbon = showRibbon ? ribbonSvg(spec.ribbonText, id, ow, opts.ribbonFont) : "";
  const vbTop = showCrest ? 0 : 136;
  const vbBottom = showRibbon ? 1136 : spec.frame && spec.frame !== "none" ? 1000 : 900;
  const title = opts.title ? `<title>${esc(opts.title)}</title>` : "";
  const desc = `<desc>${esc(blazon(spec))}</desc>`;
  const w = opts.width ? ` width="${opts.width}"` : "", h = opts.height ? ` height="${opts.height}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${vbTop} 1000 ${vbBottom - vbTop}"${w}${h} role="img">${title}${desc}` +
    `<defs>${defs.join("")}</defs>${frame}${crestPart}${shieldG}${ribbon}</svg>`;
}

// The crest's own viewBox, for laying it out inside a poster.
export function crestBox(spec) {
  const showRibbon = spec.ribbon !== false && !!spec.ribbonText;
  const top = spec.crest ? 0 : 136;
  const bottom = showRibbon ? 1136 : spec.frame && spec.frame !== "none" ? 1000 : 900;
  return { x: 0, y: top, w: 1000, h: bottom - top };
}

// ---------- blazon ----------

const T = (t) => TINCTURES[t].name;
const art = (name) => (/^(hour|[aeiou])/i.test(name) ? "an " : "a ") + name;
const NUM = ["", "a", "two", "three", "four", "five", "six", "seven", "eight"];
const count = (n, id) => (n === 1 ? art(CHARGES[id].name) : `${NUM[n]} ${CHARGES[id].plural}`);

export function blazon(spec) {
  const [tf, t2, to, tm, ts] = spec.t;
  const L = LINES[spec.line || "straight"];
  const lw = L.word ? " " + L.word : "";
  const M = spec.main, S = spec.second;
  let field = T(tf);
  const layout = spec.layout;
  let text;
  if (!CHARGES[M]) return fieldOnlyBlazon(spec, lw);
  switch (layout) {
    case "center": text = `${field}, ${count(1, M)} ${T(tm)}`; break;
    case "party": {
      const div = DIVISIONS[spec.division];
      let fl;
      if (["quarterly", "gyronny", "chequy"].includes(spec.division)) fl = `${div.label} ${T(tf)} and ${T(t2)}`;
      else if (["paly", "barry", "bendy"].includes(spec.division)) fl = `${div.label}${spec.division === "barry" && spec.line === "wavy" ? " wavy" : ""} of six ${T(tf)} and ${T(t2)}`;
      else fl = `${div.label}${DIVISIONS[spec.division].lines ? lw : ""} ${T(tf)} and ${T(t2)}`;
      text = `${fl}, ${count(1, M)} counterchanged`;
      break;
    }
    case "impaled": text = `Per pale ${T(tf)} and ${T(t2)}, dexter ${count(1, M)} ${T(t2)}, sinister ${count(1, S)} ${T(tf)}`; break;
    case "quarterly": text = `Quarterly ${T(tf)} and ${T(t2)}; first and fourth, ${count(1, M)} ${T(t2)}; second and third, ${count(1, S)} ${T(tf)}`; break;
    case "chief": text = `${field}, ${count(1, M)} ${T(tm)}; on a chief${lw} ${T(to)} ${count(3, S)} ${T(ts)}`; break;
    case "chevron": text = `${field}, a chevron${lw} ${T(to)} between ${count(2, S)} ${T(ts)} in chief and ${count(1, M)} ${T(tm)} in base`; break;
    case "fess": text = `${field}, a fess${lw} ${T(to)} between ${count(1, M)} ${T(tm)} in chief and ${count(1, S)} ${T(ts)} in base`; break;
    case "bend": text = `${field}, a bend${lw} ${T(to)} between ${count(1, M)} ${T(tm)} and ${count(1, S)} ${T(ts)}`; break;
    case "cross": text = `${field}, on a cross ${T(to)} ${count(1, M)} ${T(tm)}, between ${count(4, S)} ${T(ts)}`; break;
    case "saltire": text = `${field}, on a saltire ${T(to)} ${count(1, M)} ${T(tm)}, between ${count(4, S)} ${T(ts)}`; break;
    case "canton": text = `${field}, ${count(1, M)} ${T(tm)}; on a canton ${T(to)} ${count(1, S)} ${T(ts)}`; break;
    case "bordure": text = spec.bordureCharged
      ? `${field}, ${count(1, M)} ${T(tm)}; a bordure ${T(to)} charged with ${count(8, S)} ${T(ts)}`
      : `${field}, ${count(1, M)} ${T(tm)}, within a bordure ${T(to)}`; break;
    default: text = field;
  }
  return text.replace(/^./, (c) => c.toUpperCase()) + ".";
}

// Describe a design that has no charges (used for illustrations of fields and ordinaries).
function fieldOnlyBlazon(spec, lw) {
  const [tf, t2, to] = spec.t;
  const layout = LAYOUTS[spec.layout] || LAYOUTS.center;
  let text;
  if (layout.party) {
    const div = spec.layout === "impaled" ? "pale" : spec.layout === "quarterly" ? "quarterly" : spec.division;
    const D = DIVISIONS[div];
    if (["quarterly", "gyronny", "chequy"].includes(div)) text = `${D.label} ${T(tf)} and ${T(t2)}`;
    else if (["paly", "barry", "bendy"].includes(div)) text = `${D.label} of six ${T(tf)} and ${T(t2)}`;
    else text = `${D.label}${D.lines && spec.layout === "party" ? lw : ""} ${T(tf)} and ${T(t2)}`;
  } else if (layout.ordinary) {
    text = `${T(tf)}, ${layout.ordinary === "bordure" ? "a bordure" : "a " + layout.ordinary}${layout.lines ? lw : ""} ${T(to)}`;
  } else text = T(tf);
  return text + ".";
}

// The tincture each charge in a spec sits on, for checking the rule of tincture.
export function tinctureChecks(spec) {
  const [tf, t2, to, tm, ts] = spec.t;
  const out = [];
  const push = (a, b, what) => out.push({ a, b, what, ok: contrasts(a, b) });
  switch (spec.layout) {
    case "center": push(tm, tf, "main on field"); break;
    case "party": case "impaled": case "quarterly": push(tf, t2, "field halves"); break;
    case "chief": case "canton": push(to, tf, "ordinary on field"); push(tm, tf, "main on field"); push(ts, to, "secondary on ordinary"); break;
    case "chevron": case "fess": case "bend": push(to, tf, "ordinary on field"); push(tm, tf, "main on field"); push(ts, tf, "secondary on field"); break;
    case "cross": case "saltire": push(to, tf, "ordinary on field"); push(tm, to, "main on ordinary"); push(ts, tf, "secondary on field"); break;
    case "bordure": push(to, tf, "bordure on field"); push(tm, tf, "main on field"); if (spec.bordureCharged) push(ts, to, "secondary on bordure"); break;
  }
  return out;
}
