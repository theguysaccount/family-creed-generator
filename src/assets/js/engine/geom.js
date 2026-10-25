// Small SVG path helpers shared by the charge library and the crest renderer.

export const fmt = (n) => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? "0" : String(v);
};

export const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

export const pt = ([x, y]) => `${fmt(x)},${fmt(y)}`;

export function poly(points, close = true) {
  return "M" + points.map(pt).join(" L") + (close ? " Z" : "");
}

export function circle(cx, cy, r) {
  return `M${fmt(cx - r)},${fmt(cy)} A${fmt(r)},${fmt(r)} 0 1,0 ${fmt(cx + r)},${fmt(cy)} A${fmt(r)},${fmt(r)} 0 1,0 ${fmt(cx - r)},${fmt(cy)} Z`;
}

export function ellipse(cx, cy, rx, ry) {
  return `M${fmt(cx - rx)},${fmt(cy)} A${fmt(rx)},${fmt(ry)} 0 1,0 ${fmt(cx + rx)},${fmt(cy)} A${fmt(rx)},${fmt(ry)} 0 1,0 ${fmt(cx - rx)},${fmt(cy)} Z`;
}

// An ellipse from four cubic curves, so it can go through transformPath.
export function ellipseC(cx, cy, rx, ry) {
  const k = 0.5523, ox = rx * k, oy = ry * k;
  const f = fmt;
  return `M${f(cx - rx)},${f(cy)} C${f(cx - rx)},${f(cy - oy)} ${f(cx - ox)},${f(cy - ry)} ${f(cx)},${f(cy - ry)} ` +
    `C${f(cx + ox)},${f(cy - ry)} ${f(cx + rx)},${f(cy - oy)} ${f(cx + rx)},${f(cy)} ` +
    `C${f(cx + rx)},${f(cy + oy)} ${f(cx + ox)},${f(cy + ry)} ${f(cx)},${f(cy + ry)} ` +
    `C${f(cx - ox)},${f(cy + ry)} ${f(cx - rx)},${f(cy + oy)} ${f(cx - rx)},${f(cy)} Z`;
}

export function rect(x, y, w, h, r = 0) {
  if (!r) return `M${fmt(x)},${fmt(y)} H${fmt(x + w)} V${fmt(y + h)} H${fmt(x)} Z`;
  r = Math.min(r, w / 2, h / 2);
  return `M${fmt(x + r)},${fmt(y)} H${fmt(x + w - r)} Q${fmt(x + w)},${fmt(y)} ${fmt(x + w)},${fmt(y + r)} V${fmt(y + h - r)} Q${fmt(x + w)},${fmt(y + h)} ${fmt(x + w - r)},${fmt(y + h)} H${fmt(x + r)} Q${fmt(x)},${fmt(y + h)} ${fmt(x)},${fmt(y + h - r)} V${fmt(y + r)} Q${fmt(x)},${fmt(y)} ${fmt(x + r)},${fmt(y)} Z`;
}

// A regular star: n points, outer radius R, inner radius r, first point at `rot` degrees.
export function star(cx, cy, n, R, r, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) pts.push(polar(cx, cy, i % 2 ? r : R, rot + (i * 180) / n));
  return poly(pts);
}

// Parse an absolute-command path into [{c, p: [[x,y],...]}]. Supports M L H V C S Q T A Z.
export function parse(d) {
  const toks = d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const out = [];
  let i = 0, cmd = "";
  const num = () => parseFloat(toks[i++]);
  const counts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
    const C = cmd.toUpperCase();
    if (cmd !== C) throw new Error("relative path commands are not supported: " + cmd);
    if (C === "Z") { out.push({ c: "Z", v: [] }); continue; }
    const v = [];
    for (let k = 0; k < counts[C]; k++) v.push(num());
    out.push({ c: C, v });
    if (C === "M") cmd = "L";
  }
  return out;
}

function serialize(segs) {
  return segs.map((s) => s.c + s.v.map(fmt).join(" ")).join(" ");
}

// Mirror a path horizontally about x = cx.
export function mirror(d, cx = 100) {
  const segs = parse(d).map((s) => {
    const v = s.v.slice();
    switch (s.c) {
      case "H": v[0] = 2 * cx - v[0]; break;
      case "V": break;
      case "A": v[2] = -v[2]; v[4] = 1 - v[4]; v[5] = 2 * cx - v[5]; break;
      default: for (let k = 0; k < v.length; k += 2) v[k] = 2 * cx - v[k];
    }
    return { c: s.c, v };
  });
  return serialize(segs);
}

// Complete a symmetric shape from its right half. The half starts with M at the axis,
// runs down the right side using M/L/C/Q only, and ends back on the axis.
export function sym(half, cx = 100) {
  const segs = parse(half).filter((s) => s.c !== "Z");
  if (segs[0].c !== "M") throw new Error("half must start with M");
  const pts = [[segs[0].v[0], segs[0].v[1]]];
  for (const s of segs.slice(1)) {
    if (!["L", "C", "Q"].includes(s.c)) throw new Error("sym supports L, C and Q only, got " + s.c);
    pts.push([s.v[s.v.length - 2], s.v[s.v.length - 1]]);
  }
  const mx = (x) => 2 * cx - x;
  const back = [];
  for (let k = segs.length - 1; k >= 1; k--) {
    const s = segs[k];
    const prev = pts[k - 1];
    if (s.c === "L") back.push({ c: "L", v: [mx(prev[0]), prev[1]] });
    else if (s.c === "Q") back.push({ c: "Q", v: [mx(s.v[0]), s.v[1], mx(prev[0]), prev[1]] });
    else back.push({ c: "C", v: [mx(s.v[2]), s.v[3], mx(s.v[0]), s.v[1], mx(prev[0]), prev[1]] });
  }
  return serialize([...segs, ...back, { c: "Z", v: [] }]);
}

// Apply a 2D affine transform [a b c d e f] to an absolute path (M L C Q only, plus Z).
export function transformPath(d, [a, b, c, dd, e, f]) {
  const T = (x, y) => [a * x + c * y + e, b * x + dd * y + f];
  const segs = parse(d).map((s) => {
    if (s.c === "Z") return s;
    if (!["M", "L", "C", "Q"].includes(s.c)) throw new Error("transformPath supports M L C Q, got " + s.c);
    const v = [];
    for (let k = 0; k < s.v.length; k += 2) v.push(...T(s.v[k], s.v[k + 1]));
    return { c: s.c, v };
  });
  return serialize(segs);
}

export const rotation = (deg, cx, cy) => {
  const r = (deg * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  return [co, si, -si, co, cx - co * cx + si * cy, cy - si * cx - co * cy];
};
