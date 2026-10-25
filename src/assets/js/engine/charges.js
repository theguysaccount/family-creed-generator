// The charge library: original heraldic symbols drawn for this project (CC0).
// Every charge lives in a 200 x 200 box. A charge is a list of parts:
//   { d }                 filled with the charge's tincture, outlined; parts on one layer merge
//   { d, line: w }        a thick tincture stroke of width w, outlined (stems, antlers, rings)
//   { d, dark: true }     filled with the detail colour (eyes, doors)
//   { d, detail: true }   a thin detail stroke (veins, feathers)
// `layer` orders the parts (default 0); `evenodd` cuts holes.
import { circle, ellipse, ellipseC, rect, star, poly, polar, sym, mirror, transformPath, rotation, fmt } from "./geom.js";

export const CHARGES = {};

function def(id, meta, parts) {
  CHARGES[id] = { id, ...meta, parts };
}

// ---------- helpers for procedural parts ----------

// Cubic bezier point and tangent.
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI };
}

// A pointed leaf (vesica) centred at (cx, cy), long axis at `deg`.
function leafShape(cx, cy, len, wid, deg) {
  const half = `M${fmt(cx - len / 2)},${fmt(cy)} Q${fmt(cx)},${fmt(cy - wid)} ${fmt(cx + len / 2)},${fmt(cy)} Q${fmt(cx)},${fmt(cy + wid)} ${fmt(cx - len / 2)},${fmt(cy)} Z`;
  return transformPath(half, rotation(deg, cx, cy));
}

// ---------- objects ----------

{
  const pts = [];
  for (let i = 0; i < 5; i++) pts.push(polar(100, 108, 94, -90 + i * 72));
  def("star", { name: "mullet", plural: "mullets", plain: "star", kind: "object" }, [
    { d: star(100, 108, 5, 94, 38) },
    ...pts.map(([x, y]) => ({ d: `M100,108 L${fmt(x)},${fmt(y)}`, detail: true, w: 0.6 })),
  ]);
}

def("crescent", { name: "crescent", plural: "crescents", plain: "crescent moon", kind: "object" }, [
  { d: "M37.95,53.5 A80,80 0 1,0 162.05,53.5 A66,66 0 1,1 37.95,53.5 Z" },
]);

const HEART = sym("M100,52 C106,36 120,26 136,26 C164,26 184,48 184,78 C184,122 140,152 100,182");
def("heart", { name: "heart", plural: "hearts", plain: "heart", kind: "object" }, [{ d: HEART }]);

{
  const pts = [];
  for (let i = 0; i < 32; i++) {
    const a = -90 + i * 11.25;
    pts.push(polar(100, 100, i % 2 ? 56 : i % 4 === 0 ? 97 : 80, a));
  }
  def("sun", { name: "sun in splendour", plural: "suns in splendour", plain: "sun", kind: "object" }, [
    { d: poly(pts) },
    { d: circle(100, 100, 50), layer: 1 },
    { d: "M78,92 Q84,86 90,92 M110,92 Q116,86 122,92", detail: true, layer: 1 },
    { d: "M100,96 L97,110 L102,111", detail: true, layer: 1 },
    { d: "M84,122 Q100,132 116,122", detail: true, layer: 1 },
  ]);
}

{
  const petals = (r0, R, rot) => {
    let d = "";
    for (let i = 0; i < 5; i++) {
      const a = rot + i * 72;
      const p0 = polar(100, 100, r0, a - 34), c1 = polar(100, 100, R, a - 30), c2 = polar(100, 100, R, a + 30), p1 = polar(100, 100, r0, a + 34);
      d += (i ? ` L${fmt(p0[0])},${fmt(p0[1])}` : `M${fmt(p0[0])},${fmt(p0[1])}`) + ` C${fmt(c1[0])},${fmt(c1[1])} ${fmt(c2[0])},${fmt(c2[1])} ${fmt(p1[0])},${fmt(p1[1])}`;
    }
    return d + " Z";
  };
  const barbs = [];
  for (let i = 0; i < 5; i++) {
    const a = -90 + 36 + i * 72;
    barbs.push({ d: poly([polar(100, 100, 44, a - 11), polar(100, 100, 97, a), polar(100, 100, 44, a + 11)]) });
  }
  const seeds = [];
  for (let i = 0; i < 5; i++) {
    const [x, y] = polar(100, 100, 8, -90 + i * 72);
    seeds.push({ d: circle(x, y, 2.6), dark: true, layer: 3 });
  }
  def("rose", { name: "rose", plural: "roses", plain: "rose", kind: "object" }, [
    ...barbs,
    { d: petals(50, 104, -90), layer: 1 },
    { d: petals(28, 62, -54), layer: 2 },
    { d: circle(100, 100, 15), layer: 3 },
    ...seeds,
  ]);
}

{
  const side = "M108,120 C112,98 128,72 156,64 C180,58 198,74 194,96 C192,110 180,116 170,110 C178,106 182,98 178,90 C172,80 156,84 146,96 C136,108 132,122 132,132 Z";
  def("fleur", { name: "fleur-de-lis", plural: "fleurs-de-lis", plain: "fleur-de-lis", kind: "object" }, [
    { d: sym("M100,6 C114,26 132,48 132,74 C132,96 118,108 108,118 L100,126") },
    { d: side },
    { d: mirror(side) },
    { d: sym("M100,128 L124,128 C134,138 142,150 140,162 C138,172 128,176 122,170 C128,164 126,154 118,150 C112,160 108,172 100,186") },
    { d: "M100,30 C104,58 104,88 100,110", detail: true, w: 0.7 },
    { d: rect(56, 113, 88, 19, 5), layer: 1 },
  ]);
}

def("tree", { name: "oak tree eradicated", plural: "oak trees eradicated", plain: "oak tree", kind: "object" }, [
  { d: sym("M100,100 L111,100 C111,128 113,152 119,172 L100,172") },
  { d: "M110,166 C122,178 138,182 156,188", line: 7 },
  { d: "M90,166 C78,178 62,182 44,188", line: 7 },
  { d: "M100,170 C100,180 102,188 106,194", line: 6 },
  ...[[100, 50, 38], [66, 64, 30], [134, 64, 30], [54, 96, 26], [146, 96, 26], [80, 108, 30], [120, 108, 30], [100, 84, 34]]
    .map(([x, y, r]) => ({ d: circle(x, y, r), layer: 1 })),
  { d: "M70,66 Q77,58 85,63 M116,56 Q124,49 132,56 M90,94 Q100,87 110,94 M58,98 Q65,91 73,96 M128,98 Q135,91 143,96 M96,40 Q103,33 111,39", detail: true, layer: 1, w: 0.8 },
]);

def("key", { name: "key", plural: "keys", plain: "key", kind: "object" }, [
  { d: circle(100, 46, 32) + " " + circle(100, 46, 15), evenodd: true },
  { d: rect(92, 74, 16, 108, 3) },
  { d: "M108,142 H144 V156 H132 V166 H144 V182 H108 Z" },
  { d: rect(83, 76, 34, 11, 4), layer: 1 },
]);

def("anchor", { name: "anchor", plural: "anchors", plain: "anchor", kind: "object" }, [
  { d: "M40,116 Q100,228 160,116", line: 13 },
  { d: rect(93, 36, 14, 138, 4) },
  { d: rect(60, 44, 80, 13, 6.5), layer: 1 },
  { d: circle(100, 24, 12), line: 7, layer: 1 },
  { d: poly([[27.8, 93], [56.9, 113.8], [42.8, 121.3], [28.7, 128.8]]), layer: 2 },
  { d: poly([[172.2, 93], [143.1, 113.8], [157.2, 121.3], [171.3, 128.8]]), layer: 2 },
]);

{
  const left = "M100,58 C80,46 52,44 24,48 L24,150 C52,146 80,148 100,160 Z";
  const lines = [70, 88, 106, 124].map((y) => `M36,${y} C56,${y - 4} 74,${y - 2} 90,${y + 4}`).join(" ");
  def("book", { name: "book open", plural: "books open", plain: "open book", kind: "object" }, [
    { d: "M100,64 C78,52 46,50 12,56 L12,162 C46,156 78,158 100,170 C122,158 154,156 188,162 L188,56 C154,50 122,52 100,64 Z" },
    { d: left, layer: 1 },
    { d: mirror(left), layer: 1 },
    { d: lines + " " + mirror(lines), detail: true, layer: 1, w: 0.7 },
  ]);
}

def("tower", { name: "tower", plural: "towers", plain: "tower", kind: "object" }, [
  { d: rect(58, 70, 84, 116) },
  { d: "M58,98 H142 M58,126 H142 M58,154 H142 M80,70 V98 M120,70 V98 M100,98 V126 M70,126 V154 M130,126 V154 M84,154 V186 M116,154 V186", detail: true, w: 0.6 },
  { d: "M46,30 H64 V44 H76 V30 H94 V44 H106 V30 H124 V44 H136 V30 H154 V72 H46 Z", layer: 1 },
  { d: "M86,186 V156 Q86,140 100,140 Q114,140 114,156 V186 Z", dark: true, layer: 2 },
  { d: "M94,114 V102 Q94,94 100,94 Q106,94 106,102 V114 Z", dark: true, layer: 2 },
]);

def("mountain", { name: "mountain", plural: "mountains", plain: "mountain", kind: "object" }, [
  { d: "M4,184 L52,92 L70,114 L106,28 L140,88 L152,74 L196,184 Z" },
  { d: "M90,66 L98,74 L106,62 L114,72 L122,66 M44,108 L52,112 L58,106 M146,90 L152,94 L158,88", detail: true, w: 0.8 },
]);

{
  const parts = [];
  const stalks = [[100, 124, 100, 36], [98, 124, 70, 46], [102, 124, 130, 46], [96, 126, 44, 70], [104, 126, 156, 70]];
  for (const [x0, y0, x1, y1] of stalks) parts.push({ d: `M${x0},${y0} L${x1},${y1}`, line: 4 });
  for (const [x0, y0, x1, y1] of stalks) {
    const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    for (let k = 0; k < 5; k++) {
      const t = 0.62 + k * 0.095;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (const s of [-1, 1]) {
        const [ox, oy] = polar(0, 0, 6.5, ang + 90 * s);
        parts.push({ d: leafShape(x + ox, y + oy, 20, 5.5, ang - 28 * s), layer: 1 });
      }
    }
    parts.push({ d: leafShape(x1, y1, 18, 5, ang), layer: 1 });
  }
  for (const [x1] of [[84], [100], [116], [70], [130]]) parts.push({ d: `M100,128 L${x1},190`, line: 4.5, layer: 2 });
  parts.push({ d: rect(82, 118, 36, 14, 5), layer: 3 });
  def("wheat", { name: "garb", plural: "garbs", plain: "sheaf of wheat", kind: "object" }, parts);
}

def("lamp", { name: "lamp", plural: "lamps", plain: "oil lamp", kind: "object" }, [
  { d: "M154,124 C178,110 190,134 172,146 C166,150 158,148 154,144", line: 8 },
  { d: "M30,112 C46,110 60,116 72,122 C84,110 128,108 150,118 C158,122 162,128 160,136 C150,150 70,152 56,138 C48,130 38,120 30,112 Z" },
  { d: "M88,146 L112,146 L118,162 L82,162 Z" },
  { d: rect(72, 160, 56, 9, 4) },
  { d: ellipse(106, 113, 22, 7), layer: 1 },
  { d: circle(106, 103, 6), layer: 1 },
  { d: "M30,52 C40,70 46,86 42,100 C40,107 35,110 30,110 C25,110 20,107 18,100 C14,86 20,70 30,52 Z" },
  { d: "M30,78 C34,88 36,96 33,102 C31,105 29,105 27,102 C24,96 26,88 30,78 Z", detail: true, w: 0.8 },
  { d: "M70,136 C96,142 128,140 150,130", detail: true, w: 0.7 },
]);

{
  // A fan of lobes along an ellipse above the hinge, ribs from the hinge, small ears below.
  const n = 11, cx = 100, cy = 184, rx = 94, ry = 150;
  const at = (deg, grow = 0) => {
    const a = (deg * Math.PI) / 180;
    return [cx + (rx + grow) * Math.cos(a), cy + (ry + grow) * Math.sin(a)];
  };
  const ang = (k) => -164 + (148 * k) / n;
  let d = `M${fmt(cx)},${fmt(cy)} L${at(ang(0)).map(fmt).join(",")}`;
  for (let k = 0; k < n; k++) {
    const m = at((ang(k) + ang(k + 1)) / 2, 16), e = at(ang(k + 1));
    d += ` Q${fmt(m[0])},${fmt(m[1])} ${fmt(e[0])},${fmt(e[1])}`;
  }
  d += " Z";
  let ribs = "";
  for (let k = 1; k < n; k++) {
    const e = at(ang(k), -6);
    ribs += `M100,176 L${fmt(e[0])},${fmt(e[1])} `;
  }
  def("shell", { name: "escallop", plural: "escallops", plain: "scallop shell", kind: "object" }, [
    { d: poly([[100, 184], [72, 194], [74, 176], [90, 170]]) },
    { d: poly([[100, 184], [128, 194], [126, 176], [110, 170]]) },
    { d, layer: 1 },
    { d: ribs, detail: true, layer: 1, w: 0.8 },
  ]);
}

def("cross", { name: "cross formy", plural: "crosses formy", plain: "cross", kind: "object" }, [
  { d: "M90,90 L66,10 Q100,24 134,10 L110,90 L190,66 Q176,100 190,134 L110,110 L134,190 Q100,176 66,190 L90,110 L10,134 Q24,100 10,66 Z" },
]);

def("sword", { name: "sword erect", plural: "swords erect", plain: "sword", kind: "object" }, [
  { d: sym("M100,4 L112,30 L112,134 L100,134") },
  { d: "M100,32 L100,126", detail: true, w: 0.8 },
  { d: rect(52, 132, 96, 12, 6), layer: 1 },
  { d: rect(93, 144, 14, 32, 3), layer: 1 },
  { d: circle(100, 184, 10), layer: 1 },
  { d: "M93,153 L107,149 M93,161 L107,157 M93,169 L107,165", detail: true, layer: 1, w: 0.7 },
]);

def("flame", { name: "flame", plural: "flames", plain: "flame", kind: "object" }, [
  { d: sym("M100,4 C104,28 118,44 128,60 C132,50 134,42 142,34 C154,60 164,90 162,120 C160,158 132,186 100,190") },
  { d: "M100,84 C112,104 128,124 124,148 C121,166 110,174 100,176 C90,174 79,166 76,148 C72,124 88,104 100,84 Z", detail: true },
]);

def("hammer", { name: "hammer", plural: "hammers", plain: "hammer", kind: "object" }, [
  { d: sym("M100,66 L108,66 L110,178 C110,186 106,192 100,192") },
  { d: "M100,82 L101,172", detail: true, w: 0.6 },
  { d: "M34,34 L42,24 H158 L166,34 V62 L158,72 H42 L34,62 Z", layer: 1 },
  { d: "M58,24 V72 M142,24 V72", detail: true, layer: 1, w: 0.7 },
]);

def("leaf", { name: "oak leaf", plural: "oak leaves", plain: "oak leaf", kind: "object" }, [
  { d: "M100,164 L100,196", line: 5 },
  { d: sym("M100,8 C110,18 118,30 116,40 C126,36 140,40 146,52 C142,60 134,62 128,62 C140,70 154,84 152,98 C146,104 136,104 130,100 C140,112 150,126 144,140 C134,142 126,138 120,132 C122,146 118,158 108,164 L100,170"), layer: 1 },
  { d: "M100,24 L100,168 M100,58 L130,52 M100,94 L138,96 M100,128 L132,134 M100,58 L70,52 M100,94 L62,96 M100,128 L68,134", detail: true, layer: 1, w: 0.8 },
]);

def("acorn", { name: "acorn", plural: "acorns", plain: "acorn", kind: "object" }, [
  { d: sym("M100,70 L130,70 C138,104 132,146 112,170 C108,176 104,182 100,188") },
  { d: "M100,36 C100,24 104,16 112,8", line: 7, layer: 1 },
  { d: sym("M100,32 C126,32 150,44 154,62 C156,76 146,86 130,88 C120,90 108,90 100,90"), layer: 1 },
  { d: "M60,60 L82,88 M76,44 L106,88 M100,36 L128,82 M124,40 L146,70 M140,52 L116,88 M118,40 L92,88 M94,36 L68,82 M72,44 L56,66", detail: true, layer: 1, w: 0.7 },
  { d: "M118,100 C124,118 124,136 116,152", detail: true, layer: 1, w: 0.7 },
]);

{
  const pan = "M2,122 L42,122 C40,140 30,148 22,148 C14,148 4,140 2,122 Z";
  def("scales", { name: "pair of scales", plural: "pairs of scales", plain: "scales", kind: "object" }, [
    { d: rect(95, 30, 10, 146, 3) },
    { d: "M64,188 L136,188 L124,172 L76,172 Z" },
    { d: "M22,50 C60,40 140,40 178,50", line: 8, layer: 1 },
    { d: circle(100, 26, 9), layer: 1 },
    { d: "M22,52 L6,124 M22,52 L38,124 M178,52 L162,124 M178,52 L194,124", detail: true, layer: 1, w: 1.1 },
    { d: pan, layer: 2 },
    { d: mirror(pan), layer: 2 },
  ]);
}

{
  const parts = [];
  const cx = 100, cy = 104, r = 66;
  for (const side of [-1, 1]) {
    // From the bottom up to the top on each side.
    const a0 = side < 0 ? 110 : 70, a1 = side < 0 ? 260 : -80;
    const arc = `M${polar(cx, cy, r, a0).map(fmt).join(",")} A${r},${r} 0 0,${side < 0 ? 1 : 0} ${polar(cx, cy, r, a1).map(fmt).join(",")}`;
    parts.push({ d: arc, line: 3.5 });
    const steps = 9;
    for (let k = 0; k < steps; k++) {
      const a = a0 + ((a1 - a0) * (k + 0.5)) / steps;
      for (const io of [-1, 1]) {
        const [x, y] = polar(cx, cy, r + io * 11, a + side * 4);
        parts.push({ d: leafShape(x, y, 26, 7.5, a + 90 + io * side * -32), layer: 1 });
      }
    }
  }
  def("chaplet", { name: "chaplet of laurel", plural: "chaplets of laurel", plain: "laurel wreath", kind: "object" }, parts);
}

{
  const pts = [];
  for (let i = 0; i < 16; i++) pts.push(polar(100, 100, i % 4 === 0 ? 96 : i % 2 === 0 ? 60 : 15, -90 + i * 22.5));
  let ridges = "";
  for (let i = 0; i < 16; i += 2) ridges += `M100,100 L${polar(100, 100, i % 4 === 0 ? 96 : 60, -90 + i * 22.5).map(fmt).join(",")} `;
  def("compass", { name: "compass star", plural: "compass stars", plain: "compass rose", kind: "object" }, [
    { d: circle(100, 100, 62), line: 5 },
    { d: poly(pts), layer: 1 },
    { d: ridges, detail: true, layer: 1, w: 0.7 },
    { d: circle(100, 100, 7), dark: true, layer: 1 },
  ]);
}

def("feather", { name: "feather", plural: "feathers", plain: "feather", kind: "object" }, [
  { d: "M66,166 C54,118 96,56 162,8 C162,62 140,124 80,172 Z" },
  { d: "M78,120 L62,124 M98,86 L84,84 M120,58 L110,52 M100,130 L114,136 M122,98 L138,100 M142,66 L154,64", detail: true, w: 0.8 },
  { d: "M44,194 C70,148 110,76 162,8", line: 4, layer: 1 },
]);

def("palette", { name: "palette", plural: "palettes", plain: "painter's palette", kind: "object" }, [
  { d: "M100,22 C150,20 190,52 188,98 C186,134 156,150 136,140 C122,134 112,142 116,158 C120,176 104,186 84,182 C40,174 12,138 14,98 C16,54 54,24 100,22 Z " + circle(140, 106, 12), evenodd: true },
  ...[[58, 68], [92, 50], [128, 52], [158, 76], [44, 106], [64, 140]].map(([x, y]) => ({ d: circle(x, y, 11.5), layer: 1 })),
]);

{
  const leaf = transformPath(HEART, [0.44, 0, 0, 0.44, 100 - 0.44 * 100, 98 - 0.44 * 182]);
  def("clover", { name: "trefoil slipped", plural: "trefoils slipped", plain: "clover", kind: "object" }, [
    { d: "M100,100 C104,132 118,162 136,190", line: 7 },
    { d: leaf, layer: 1 },
    { d: transformPath(leaf, rotation(120, 100, 98)), layer: 1 },
    { d: transformPath(leaf, rotation(-120, 100, 98)), layer: 1 },
  ]);
}

def("apple", { name: "apple", plural: "apples", plain: "apple", kind: "object" }, [
  { d: sym("M100,56 C118,40 166,40 174,90 C182,140 146,186 120,184 C110,183 106,178 100,178") },
  { d: "M138,70 C150,80 154,94 152,108", detail: true, w: 0.8 },
  { d: "M100,58 C100,44 102,32 108,20", line: 6, layer: 1 },
  { d: "M106,34 C116,16 140,12 154,18 C148,36 126,44 106,34 Z", layer: 1 },
  { d: "M110,32 C124,26 138,22 150,19", detail: true, layer: 1, w: 0.7 },
]);

def("pine", { name: "pine tree", plural: "pine trees", plain: "pine tree", kind: "object" }, [
  { d: rect(90, 160, 20, 32, 2) },
  { d: sym("M100,6 L130,48 L117,48 L150,92 L133,92 L170,140 L150,140 L184,170 L100,170"), layer: 1 },
]);

{
  const arm = "M118,166 C150,150 172,110 154,74 C142,52 140,36 150,22";
  let strings = "";
  for (const x of [80, 90, 100, 110, 120]) strings += `M${x},54 L${x},160 `;
  def("lyre", { name: "lyre", plural: "lyres", plain: "lyre", kind: "object" }, [
    { d: arm, line: 12 },
    { d: mirror(arm), line: 12 },
    { d: strings, detail: true, w: 1.1 },
    { d: rect(56, 158, 88, 24, 7), layer: 1 },
    { d: circle(150, 20, 8.5), layer: 1 },
    { d: circle(50, 20, 8.5), layer: 1 },
    { d: "M52,50 L148,50", line: 8, layer: 2 },
  ]);
}

def("house", { name: "house", plural: "houses", plain: "house", kind: "object" }, [
  { d: rect(128, 30, 20, 42) },
  { d: "M100,16 L184,88 L164,88 L164,184 L36,184 L36,88 L16,88 Z", layer: 1 },
  { d: "M88,184 V146 Q88,134 100,134 Q112,134 112,146 V184 Z", dark: true, layer: 2 },
  { d: rect(50, 106, 28, 26, 2), dark: true, layer: 2 },
  { d: rect(122, 106, 28, 26, 2), dark: true, layer: 2 },
  { d: transformPath(HEART, [0.15, 0, 0, 0.15, 85, 50]), dark: true, layer: 2 },
]);

def("hourglass", { name: "hourglass", plural: "hourglasses", plain: "hourglass", kind: "object" }, [
  { d: "M48,30 L48,170", line: 6 },
  { d: "M152,30 L152,170", line: 6 },
  { d: sym("M100,30 L136,30 C136,70 110,88 106,100 C110,112 136,130 136,170 L100,170") },
  { d: "M78,62 L122,62 C118,76 108,88 100,96 C92,88 82,76 78,62 Z", dark: true },
  { d: sym("M100,128 C112,140 124,152 128,166 L100,166"), dark: true },
  { d: "M100,96 L100,140", detail: true, w: 0.8 },
  { d: rect(36, 14, 128, 16, 5), layer: 1 },
  { d: rect(36, 170, 128, 16, 5), layer: 1 },
]);

{
  const p0 = [34, 192], p1 = [70, 150], p2 = [112, 88], p3 = [166, 12];
  const parts = [{ d: `M${p0} C${p1} ${p2} ${p3}`, line: 5 }];
  const ts = [0.2, 0.3, 0.42, 0.52, 0.64, 0.74, 0.86];
  ts.forEach((t, k) => {
    const b = bez(p0, p1, p2, p3, t), s = k % 2 ? 1 : -1;
    const [ox, oy] = polar(0, 0, 21, b.a + 90 * s);
    parts.push({ d: leafShape(b.x + ox, b.y + oy, 48, 11, b.a + 38 * s), layer: 1 });
  });
  const tip = bez(p0, p1, p2, p3, 1);
  parts.push({ d: leafShape(tip.x + 4, tip.y - 6, 40, 10, tip.a), layer: 1 });
  for (const [t, s] of [[0.36, 1], [0.58, -1], [0.8, 1]]) {
    const b = bez(p0, p1, p2, p3, t);
    const [ox, oy] = polar(0, 0, 15, b.a + 90 * s);
    parts.push({ d: ellipse(b.x + ox, b.y + oy, 8.5, 11), layer: 2 });
  }
  def("olive", { name: "olive branch", plural: "olive branches", plain: "olive branch", kind: "object" }, parts);
}

{
  const p1 = polar(72, 100, 44, -72), p2 = polar(72, 100, 44, -28);
  def("rings", { name: "pair of annulets interlaced", plural: "pairs of annulets interlaced", plain: "two joined rings", kind: "object", single: true }, [
    { d: circle(72, 100, 44), line: 13 },
    { d: circle(128, 100, 44), line: 13, layer: 1 },
    { d: `M${fmt(p1[0])},${fmt(p1[1])} A44,44 0 0,1 ${fmt(p2[0])},${fmt(p2[1])}`, line: 13, layer: 2 },
  ]);
}

// ---------- animals ----------

{
  // Lion's face: a swirling mane of locks around a broad face.
  let mane = "";
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = -90 + (i * 360) / N;
    const b1 = polar(100, 104, 66, a - 180 / N), b2 = polar(100, 104, 66, a + 180 / N);
    const c1 = polar(100, 104, 100, a - 9), tip = polar(100, 104, 98, a + 5), c2 = polar(100, 104, 84, a + 13);
    mane += (i ? ` L${fmt(b1[0])},${fmt(b1[1])}` : `M${fmt(b1[0])},${fmt(b1[1])}`) +
      ` Q${fmt(c1[0])},${fmt(c1[1])} ${fmt(tip[0])},${fmt(tip[1])} Q${fmt(c2[0])},${fmt(c2[1])} ${fmt(b2[0])},${fmt(b2[1])}`;
  }
  mane += " Z";
  let strands = "";
  for (let i = 0; i < N; i++) {
    const a = -90 + (i * 360) / N;
    const s0 = polar(100, 104, 70, a - 4), s1 = polar(100, 104, 86, a + 2);
    strands += `M${fmt(s0[0])},${fmt(s0[1])} L${fmt(s1[0])},${fmt(s1[1])} `;
  }
  const eye = "M110,98 Q123,88 136,96 Q123,104 110,98 Z";
  def("lion", { name: "lion's face", plural: "lions' faces", plain: "lion", kind: "animal" }, [
    { d: mane },
    { d: strands, detail: true, w: 0.7 },
    { d: circle(60, 60, 15), layer: 1 },
    { d: circle(140, 60, 15), layer: 1 },
    { d: "M54,62 Q60,52 68,58 M146,62 Q140,52 132,58", detail: true, layer: 1, w: 0.8 },
    { d: sym("M100,46 C124,46 144,56 152,76 C160,96 156,120 146,136 C136,152 120,166 100,168"), layer: 2 },
    { d: eye + " " + mirror(eye), dark: true, layer: 2 },
    { d: "M104,86 Q120,76 140,84 M96,86 Q80,76 60,84", detail: true, layer: 2 },
    { d: "M92,96 C94,106 92,114 86,120 M108,96 C106,106 108,114 114,120", detail: true, layer: 2, w: 0.8 },
    { d: sym("M100,116 L118,116 C122,116 124,121 120,125 L104,138 L100,140"), dark: true, layer: 2 },
    { d: "M100,140 L100,148 M100,148 C94,157 82,159 74,152 M100,148 C106,157 118,159 126,152 M90,162 Q100,168 110,162", detail: true, layer: 2 },
  ]);
}

def("bear", { name: "bear's head", plural: "bears' heads", plain: "bear", kind: "animal" }, [
  { d: circle(50, 50, 25) },
  { d: circle(150, 50, 25) },
  { d: circle(50, 52, 12) + " " + circle(150, 52, 12), detail: true },
  { d: sym("M100,32 C132,32 156,48 164,74 C172,100 168,128 154,148 C140,168 120,182 100,184"), layer: 1 },
  { d: "M92,54 L94,64 M100,50 L100,61 M108,54 L106,64 M162,112 L170,116 M38,112 L30,116", detail: true, layer: 1, w: 0.8 },
  { d: circle(74, 98, 7) + " " + circle(126, 98, 7), dark: true, layer: 1 },
  { d: "M62,84 Q74,78 86,84 M114,84 Q126,78 138,84", detail: true, layer: 1, w: 0.8 },
  { d: sym("M100,112 C122,112 136,126 136,144 C136,164 120,178 100,178"), layer: 2 },
  { d: sym("M100,118 L114,118 C122,118 124,126 118,132 L106,142 L100,144"), dark: true, layer: 2 },
  { d: "M100,144 L100,154 M100,154 C94,162 86,162 80,158 M100,154 C106,162 114,162 120,158", detail: true, layer: 2 },
]);

{
  const ear = "M116,56 L148,4 L164,66 Z";
  const eye = "M110,94 Q124,82 140,88 Q128,100 110,94 Z";
  def("wolf", { name: "wolf's head", plural: "wolves' heads", plain: "wolf", kind: "animal" }, [
    { d: ear },
    { d: mirror(ear) },
    { d: "M128,52 L146,22 L154,58 M72,52 L54,22 L46,58", detail: true, w: 0.8 },
    { d: sym("M100,38 C122,38 140,46 150,58 L170,70 L158,78 L176,92 L160,98 L174,114 L154,118 C146,136 128,154 118,166 C112,176 106,184 100,186"), layer: 1 },
    { d: "M100,48 L100,64 M92,50 L94,62 M108,50 L106,62", detail: true, layer: 1, w: 0.8 },
    { d: "M90,98 C92,124 94,148 96,166 M110,98 C108,124 106,148 104,166", detail: true, layer: 1, w: 0.8 },
    { d: eye + " " + mirror(eye), dark: true, layer: 1 },
    { d: "M104,84 Q122,72 144,78 M96,84 Q78,72 56,78", detail: true, layer: 1, w: 0.9 },
    { d: sym("M100,164 L112,164 C116,164 118,170 114,175 L104,182 L100,183"), dark: true, layer: 1 },
  ]);
}

{
  const ear = "M112,60 L154,6 L166,74 Z";
  const eye = "M112,92 Q125,82 138,86 Q128,98 112,92 Z";
  def("fox", { name: "fox's mask", plural: "foxes' masks", plain: "fox", kind: "animal" }, [
    { d: ear },
    { d: mirror(ear) },
    { d: "M124,58 L150,24 L156,66 M76,58 L50,24 L44,66", detail: true, w: 0.8 },
    { d: sym("M100,50 C126,50 148,58 162,74 L196,104 C178,110 162,116 148,124 C134,140 118,160 106,176 L100,180"), layer: 1 },
    { d: "M194,104 C170,102 150,100 134,106 C122,112 112,124 106,140 M6,104 C30,102 50,100 66,106 C78,112 88,124 94,140", detail: true, layer: 1 },
    { d: eye + " " + mirror(eye), dark: true, layer: 1 },
    { d: sym("M100,168 L110,168 C114,168 115,174 111,177 L103,182 L100,183"), dark: true, layer: 1 },
  ]);
}

{
  const tuft = "M100,48 L118,48 L144,12 L150,52";
  def("owl", { name: "owl", plural: "owls", plain: "owl", kind: "animal" }, [
    { d: sym("M100,48 L118,48 L144,12 L150,52 C164,66 170,90 168,116 C166,152 140,182 100,186") },
    { d: "M150,98 C150,130 140,158 120,176 M50,98 C50,130 60,158 80,176", detail: true },
    { d: "M86,128 L93,135 L100,128 L107,135 L114,128 M82,144 L91,151 L100,144 L109,151 L118,144 M88,160 L94,166 L100,160 L106,166 L112,160", detail: true, w: 0.8 },
    { d: circle(76, 84, 27), layer: 1 },
    { d: circle(124, 84, 27), layer: 1 },
    { d: circle(76, 84, 15), layer: 2 },
    { d: circle(124, 84, 15), layer: 2 },
    { d: circle(76, 84, 7.5) + " " + circle(124, 84, 7.5), dark: true, layer: 2 },
    { d: poly([[91, 98], [109, 98], [100, 118]]), dark: true, layer: 2 },
    { d: "M88,184 L80,196 M88,184 L88,198 M88,184 L96,196 M112,184 L104,196 M112,184 L112,198 M112,184 L120,196", line: 4, layer: 3 },
  ]);
}

{
  const beam = "M112,66 C124,46 146,30 176,20 C184,18 190,12 194,2";
  const tines = "M126,50 C126,36 122,24 114,12 M146,34 C148,22 148,12 144,2 M164,24 C168,16 172,10 172,0";
  const earR = "M124,76 C140,64 162,62 182,70 C168,84 148,90 128,90 Z";
  const eye = "M112,94 Q121,87 130,91 Q121,98 112,94 Z";
  def("stag", { name: "stag's head caboshed", plural: "stags' heads caboshed", plain: "stag", kind: "animal" }, [
    { d: beam, line: 9 },
    { d: mirror(beam), line: 9 },
    { d: tines, line: 7.5 },
    { d: mirror(tines), line: 7.5 },
    { d: earR, layer: 1 },
    { d: mirror(earR), layer: 1 },
    { d: "M134,80 C148,74 162,72 174,72 M66,80 C52,74 38,72 26,72", detail: true, layer: 1, w: 0.8 },
    { d: sym("M100,56 C116,56 130,62 134,78 C138,96 132,120 124,140 C118,160 112,176 106,186 L100,188"), layer: 2 },
    { d: eye + " " + mirror(eye), dark: true, layer: 2 },
    { d: "M94,64 L100,74 L106,64 M92,110 C94,136 96,156 98,170 M108,110 C106,136 104,156 102,170", detail: true, layer: 2, w: 0.8 },
    { d: sym("M100,176 L108,176 C112,178 112,184 108,187 L100,190"), dark: true, layer: 2 },
  ]);
}

{
  const wing = "M108,72 C128,54 156,30 186,10 C190,24 188,36 182,44 L194,50 C190,62 184,70 176,74 L188,82 C182,92 172,98 162,100 L172,110 C162,118 150,120 140,118 L146,130 C136,134 124,130 116,124 Z";
  const legs = "M110,144 L128,168 M90,144 L72,168";
  const talons = "M128,168 L140,166 M128,168 L138,178 M128,168 L128,182 M72,168 L60,166 M72,168 L62,178 M72,168 L72,182";
  const wingLines = "M120,84 L178,46 M122,96 L172,78 M124,108 L160,104";
  def("eagle", { name: "eagle displayed", plural: "eagles displayed", plain: "eagle", kind: "animal" }, [
    { d: wing },
    { d: mirror(wing) },
    { d: wingLines + " " + mirror(wingLines), detail: true, w: 0.8 },
    { d: sym("M100,148 L114,148 L132,184 L118,180 L112,194 L104,184 L100,194") },
    { d: legs, line: 9 },
    { d: talons, line: 4 },
    { d: sym("M100,54 C112,54 120,64 120,78 C124,98 122,128 114,148 C110,156 105,160 100,160"), layer: 1 },
    { d: "M92,86 Q100,92 108,86 M90,102 Q100,108 110,102 M92,118 Q100,124 108,118 M94,134 Q100,138 106,134", detail: true, layer: 1, w: 0.8 },
    { d: "M112,56 C114,40 106,26 94,26 C84,26 76,32 72,40 L58,46 L70,50 C68,56 72,62 80,60 C84,66 94,68 104,64 Z", layer: 2 },
    { d: circle(92, 40, 4.2), dark: true, layer: 2 },
    { d: "M72,40 L84,44", detail: true, layer: 2, w: 0.8 },
  ]);
}

def("horse", { name: "horse's head couped", plural: "horses' heads couped", plain: "horse", kind: "animal" }, [
  { d: "M104,22 L110,4 L120,26 Z" },
  { d: "M118,8 L128,34 C150,50 166,76 172,108 C178,136 176,164 168,192 L120,192 C118,174 110,160 100,148 C92,140 82,142 70,148 C56,154 40,152 32,140 C24,126 30,114 40,104 C52,90 70,62 88,40 C96,30 106,22 110,14 Z", layer: 1 },
  { d: "M126,30 C142,22 154,30 156,42 L166,42 C166,54 170,62 178,68 L172,76 C182,86 186,98 184,108 L176,110 C184,124 188,136 186,148 L178,148 C182,162 184,172 182,182 L172,180 C174,150 170,110 158,80 C150,60 140,46 126,30 Z", layer: 2 },
  { d: "M96,62 Q104,56 112,62 Q104,68 96,62 Z", dark: true, layer: 2 },
  { d: "M40,120 Q46,116 50,122", detail: true, layer: 2 },
  { d: "M32,140 C40,142 48,140 54,136 M104,112 C90,104 78,112 74,126 C72,136 76,144 84,146", detail: true, layer: 2, w: 0.8 },
]);

def("dolphin", { name: "dolphin embowed", plural: "dolphins embowed", plain: "dolphin", kind: "animal" }, [
  { d: "M96,42 C102,24 116,12 134,8 C128,22 126,32 128,44 Z" },
  { d: "M28,92 C30,70 52,48 84,40 C120,32 156,48 170,80 C180,104 176,130 160,152 L176,166 L188,184 L162,176 L144,190 L148,162 C156,136 154,110 142,92 C128,72 100,68 76,78 C62,84 50,94 44,104 C40,110 34,110 30,106 L16,108 L26,98 Z", layer: 1 },
  { d: "M86,80 C84,96 76,110 62,120 C80,118 94,106 100,90 Z", layer: 2 },
  { d: circle(50, 84, 4.5), dark: true, layer: 2 },
  { d: "M46,100 C62,90 86,84 110,90 C132,96 148,116 152,142", detail: true, layer: 2, w: 0.8 },
]);

{
  const upper = transformPath(ellipseC(142, 66, 42, 21), rotation(-28, 142, 66));
  const lower = transformPath(ellipseC(136, 104, 30, 15), rotation(22, 136, 104));
  const veins = "M108,76 L176,52 M110,96 L160,110";
  def("bee", { name: "bee volant", plural: "bees volant", plain: "bee", kind: "animal" }, [
    { d: upper },
    { d: mirror(upper) },
    { d: lower },
    { d: mirror(lower) },
    { d: veins + " " + mirror(veins), detail: true, w: 0.7 },
    { d: "M94,42 C90,30 84,22 74,18 M106,42 C110,30 116,22 126,18", line: 3.5, layer: 1 },
    { d: sym("M100,96 C122,96 134,112 134,136 C134,162 118,184 100,194"), layer: 1 },
    { d: circle(100, 80, 21), layer: 1 },
    { d: circle(100, 52, 15), layer: 2 },
    { d: "M68,116 Q100,126 132,116 L134,128 Q100,138 66,128 Z M67,142 Q100,152 133,142 L129,155 Q100,165 71,155 Z M80,168 Q100,175 120,168 L113,179 Q100,185 87,179 Z", dark: true, layer: 2 },
    { d: ellipse(91, 50, 4, 6) + " " + ellipse(109, 50, 4, 6), dark: true, layer: 2 },
  ]);
}

{
  const sprig = [leafShape(16, 112, 18, 5, 70), leafShape(30, 122, 18, 5, -40), leafShape(14, 132, 16, 4.5, 80)];
  def("dove", { name: "dove volant", plural: "doves volant", plain: "dove", kind: "animal" }, [
    { d: "M96,84 C92,64 86,48 74,34 L90,40 L86,24 L100,36 L102,20 L112,40 C114,56 112,72 108,84 Z" },
    { d: "M26,98 C20,108 18,120 22,136", line: 3 },
    ...sprig.map((d) => ({ d })),
    { d: "M24,96 C30,84 42,78 54,80 C66,70 84,72 92,84 C108,92 132,96 156,92 L194,80 L184,96 L196,104 L176,108 C160,124 136,134 108,132 C84,130 64,120 54,108 C44,104 34,104 24,96 Z", layer: 1 },
    { d: circle(44, 90, 3.6), dark: true, layer: 1 },
    { d: "M84,86 C88,60 102,36 126,14 L130,30 L144,8 L148,30 L162,12 L162,36 C152,62 136,82 116,98 Z", layer: 2 },
    { d: "M100,84 C110,66 124,48 140,32 M110,92 C122,78 136,62 152,46", detail: true, layer: 2, w: 0.8 },
  ]);
}

{
  const front = "M138,72 C160,56 182,58 192,70 C182,82 162,90 142,92 Z";
  const back = "M134,146 C152,150 166,164 170,182 C154,180 138,172 126,160 Z";
  const hex = [];
  for (let i = 0; i < 6; i++) hex.push(polar(100, 112, 20, -90 + i * 60));
  let lines = "";
  for (const [x, y] of hex) {
    const [ex, ey] = [100 + (x - 100) * 2.1, 112 + (y - 112) * 2.5];
    lines += `M${fmt(x)},${fmt(y)} L${fmt(ex)},${fmt(ey)} `;
  }
  def("turtle", { name: "tortoise", plural: "tortoises", plain: "turtle", kind: "animal" }, [
    { d: ellipse(100, 32, 16, 20) },
    { d: front },
    { d: mirror(front) },
    { d: back },
    { d: mirror(back) },
    { d: poly([[94, 172], [106, 172], [100, 194]]) },
    { d: circle(93, 26, 3) + " " + circle(107, 26, 3), dark: true },
    { d: ellipse(100, 112, 56, 68), layer: 1 },
    { d: poly(hex) + " " + lines + ellipse(100, 112, 44, 54), detail: true, layer: 1, w: 0.9 },
  ]);
}

{
  const ear = "M128,40 C156,36 174,56 172,92 C170,116 160,130 148,128 C140,120 136,96 134,70 Z";
  def("dog", { name: "hound's head", plural: "hounds' heads", plain: "dog", kind: "animal" }, [
    { d: sym("M100,32 C126,32 144,50 146,78 C148,108 140,132 128,146 C120,156 112,160 100,160") },
    { d: ear, layer: 1 },
    { d: mirror(ear), layer: 1 },
    { d: circle(80, 86, 7) + " " + circle(120, 86, 7), dark: true, layer: 1 },
    { d: "M70,72 Q80,66 90,72 M110,72 Q120,66 130,72", detail: true, layer: 1, w: 0.8 },
    { d: sym("M100,150 L109,150 C112,162 108,172 100,174"), layer: 2 },
    { d: sym("M100,108 C120,108 134,122 134,140 C134,158 118,168 100,168"), layer: 3 },
    { d: sym("M100,112 L114,112 C120,112 122,120 116,126 L104,134 L100,136"), dark: true, layer: 3 },
    { d: "M100,136 L100,146 M100,146 C94,154 86,154 80,148 M100,146 C106,154 114,154 120,148", detail: true, layer: 3 },
  ]);
}

{
  const ear = "M116,44 L156,8 L162,64 Z";
  const eye = "M110,96 Q126,80 142,96 Q126,108 110,96 Z";
  const whiskers = "M120,128 L176,118 M120,134 L178,136 M120,140 L172,152";
  def("cat", { name: "cat's face", plural: "cats' faces", plain: "cat", kind: "animal" }, [
    { d: ear },
    { d: mirror(ear) },
    { d: "M126,44 L150,22 L152,56 M74,44 L50,22 L48,56", detail: true, w: 0.8 },
    { d: sym("M100,40 C130,40 154,52 164,76 C174,100 168,130 150,148 C136,162 118,168 100,168"), layer: 1 },
    { d: eye, layer: 2 },
    { d: mirror(eye), layer: 2 },
    { d: ellipse(126, 96, 3.2, 8.5) + " " + ellipse(74, 96, 3.2, 8.5), dark: true, layer: 2 },
    { d: sym("M100,116 L109,116 L100,127"), dark: true, layer: 2 },
    { d: "M100,127 L100,133 M100,133 C96,141 88,141 84,135 M100,133 C104,141 112,141 116,135", detail: true, layer: 2 },
    { d: whiskers + " " + mirror(whiskers), detail: true, layer: 2, w: 0.7 },
  ]);
}

export const ANIMALS = Object.values(CHARGES).filter((c) => c.kind === "animal").map((c) => c.id);
export const OBJECTS = Object.values(CHARGES).filter((c) => c.kind === "object").map((c) => c.id);
