// Tiny DOM helpers shared by the app pages.
export const CFG = Object.assign({ base: "/", site: "", shop: "", support: "", goatcounter: "" }, window.FCG || {});

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // only ever used with our own trusted markup (SVG from the engine)
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function toast(msg, ms = 2600) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

// Cookieless counts, only when the site owner has configured GoatCounter. Respects Do Not Track
// and Global Privacy Control.
export function track(name) {
  try {
    if (!CFG.goatcounter || navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "event/" + name, title: name, event: true });
  } catch { /* analytics must never break the page */ }
}

export function slug(s) {
  return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "family";
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h("textarea", { style: { position: "fixed", opacity: "0" } }, text);
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

// Native share sheet when there is one, otherwise copy.
export async function shareOrCopy({ title, text, url }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  return (await copyText(url)) ? "copied" : "failed";
}

export const store = {
  get(key, dflt = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : dflt; } catch { return dflt; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; }
  },
  del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

export function b64urlJson(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function unb64urlJson(str) {
  const s = atob(String(str).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function pageUrl(path) {
  return (CFG.site || location.origin + CFG.base.replace(/\/$/, "")) + "/" + path.replace(/^\//, "");
}
