// Share links carry the finished design in the URL fragment (#...), which browsers never send
// to the server. Only the final creed, motto and crest travel, never anyone's individual answers.
import { SHIELDS, LAYOUTS, DIVISIONS, LINES } from "./crest.js";
import { CHARGES } from "./charges.js";
import { TINCTURES } from "./tinctures.js";
import { STYLES, SIZES } from "./poster.js";

const LIMITS = { name: 40, year: 12, line: 160, lines: 14, motto: 60, translation: 90 };

function b64url(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(str) {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

// design -> compact object -> JSON -> (deflate) -> base64url. "z" prefix = deflated, "j" = plain.
export async function encodeDesign(design) {
  const json = JSON.stringify(compact(design));
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream !== "undefined") {
    try { return "z" + b64url(await pipe(bytes, new CompressionStream("deflate-raw"))); } catch { /* fall through */ }
  }
  return "j" + b64url(bytes);
}

export async function decodeDesign(token) {
  if (!token || token.length > 6000) throw new Error("bad link");
  const kind = token[0], body = unb64url(token.slice(1));
  let bytes;
  if (kind === "z") bytes = await pipe(body, new DecompressionStream("deflate-raw"));
  else if (kind === "j") bytes = body;
  else throw new Error("bad link");
  return sanitize(JSON.parse(new TextDecoder().decode(bytes)));
}

function compact(d) {
  return {
    v: 1, n: d.name || "", y: d.year || "",
    l: (d.creed?.lines || []).map((l) => [l.kind || "value", l.text]),
    m: d.motto?.text || "", mt: d.motto?.translation || "", ml: d.motto?.lang || "en",
    s: d.spec, st: d.style || "heirloom", sz: d.size || "letter",
  };
}

const str = (v, max) => (typeof v === "string" ? v : "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);
const oneOf = (v, set, dflt) => (Object.prototype.hasOwnProperty.call(set, v) ? v : dflt);
const KINDS = ["open", "value", "activity", "hard", "occasion", "legacy", "close", "custom"];

// Accept only known keys and values; anything else is dropped or replaced by a default.
export function sanitize(o) {
  if (!o || typeof o !== "object" || o.v !== 1) throw new Error("bad link");
  const s = o.s && typeof o.s === "object" ? o.s : {};
  const tin = (t, d) => oneOf(t, TINCTURES, d);
  const ch = (c, d) => oneOf(c, CHARGES, d);
  const t = Array.isArray(s.t) ? s.t : [];
  const spec = {
    shield: oneOf(s.shield, SHIELDS, "heater"),
    layout: oneOf(s.layout, LAYOUTS, "center"),
    division: oneOf(s.division, DIVISIONS, "pale"),
    line: oneOf(s.line, LINES, "straight"),
    t: [tin(t[0], "azure"), tin(t[1], "or"), tin(t[2], "or"), tin(t[3], "or"), tin(t[4], "or")],
    main: ch(s.main, "lion"), second: ch(s.second, "star"),
    bordureCharged: !!s.bordureCharged,
    frame: ["laurel", "oak", "none"].includes(s.frame) ? s.frame : "none",
    frameT: tin(s.frameT, "or"),
    crest: !!s.crest, crestCharge: ch(s.crestCharge, ch(s.main, "lion")), crestT: s.crestT ? tin(s.crestT, "or") : undefined,
    ribbon: s.ribbon !== false, ribbonText: "",
    finish: s.finish === "flat" ? "flat" : "shaded",
  };
  const lines = (Array.isArray(o.l) ? o.l : []).slice(0, LIMITS.lines)
    .map((x) => (Array.isArray(x) ? { kind: KINDS.includes(x[0]) ? x[0] : "custom", text: str(x[1], LIMITS.line) } : null))
    .filter((x) => x && x.text.trim());
  return {
    name: str(o.n, LIMITS.name), year: str(o.y, LIMITS.year),
    creed: { lines },
    motto: { text: str(o.m, LIMITS.motto), translation: str(o.mt, LIMITS.translation), lang: o.ml === "la" ? "la" : "en" },
    spec, style: oneOf(o.st, STYLES, "heirloom"), size: oneOf(o.sz, SIZES, "letter"),
  };
}

export { LIMITS };
