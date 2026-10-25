// Render one charge from the library as SVG markup, scaled into a square of `size`
// centred on (x, y). `ow` is the outline width in the caller's units.
import { CHARGES } from "./charges.js";
import { TINCTURES, OUTLINE, LIGHT_LINE } from "./tinctures.js";
import { fmt } from "./geom.js";

export function chargeSvg(id, t, x, y, size, ow = 3) {
  const ch = CHARGES[id];
  if (!ch) throw new Error("unknown charge " + id);
  const k = size / 200;
  const sw = ow / k;
  const fill = TINCTURES[t].hex;
  const dk = t === "sable" ? LIGHT_LINE : OUTLINE;
  const layers = new Map();
  for (const p of ch.parts) {
    const L = p.layer || 0;
    if (!layers.has(L)) layers.set(L, []);
    layers.get(L).push(p);
  }
  let out = `<g transform="translate(${fmt(x - size / 2)},${fmt(y - size / 2)}) scale(${fmt(k * 1000) / 1000})" stroke-linejoin="round" stroke-linecap="round">`;
  for (const L of [...layers.keys()].sort((a, b) => a - b)) {
    const parts = layers.get(L);
    for (const p of parts) {
      if (p.line) out += `<path d="${p.d}" fill="none" stroke="${OUTLINE}" stroke-width="${fmt(p.line + 2 * sw)}"/>`;
      else if (!p.detail && !p.dark) out += `<path d="${p.d}" fill="none" stroke="${OUTLINE}" stroke-width="${fmt(2 * sw)}"/>`;
    }
    for (const p of parts) {
      if (p.line) out += `<path d="${p.d}" fill="none" stroke="${fill}" stroke-width="${fmt(p.line)}"/>`;
      else if (p.dark) out += `<path d="${p.d}" fill="${dk}"/>`;
      else if (!p.detail) out += `<path d="${p.d}" fill="${fill}"${p.evenodd ? ' fill-rule="evenodd"' : ""}/>`;
    }
    for (const p of parts) {
      if (p.detail) out += `<path d="${p.d}" fill="none" stroke="${dk}" stroke-width="${fmt(sw * 0.85 * (p.w ?? 1))}"/>`;
    }
  }
  return out + "</g>";
}
