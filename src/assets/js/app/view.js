// The shared-link page: shows a family's finished crest and creed from the URL fragment.
import { h, CFG, track, toast } from "./ui.js";
import { decodeDesign } from "../engine/share.js";
import { posterSvg } from "../engine/poster.js";
import { blazon } from "../engine/crest.js";
import { explain } from "../engine/meanings.js";
import { exportPdf, exportPng, download, fileBase, canvasMeasure, fontsReady, creditText } from "./export.js";

const root = document.getElementById("app");

async function main() {
  const token = location.hash.slice(1);
  if (!token) return empty();
  let D;
  try { D = await decodeDesign(token); } catch { return empty(true); }
  D.spec.ribbonText = D.spec.ribbon === false ? "" : String(D.motto.text || "").toUpperCase();
  await fontsReady();
  const title = D.name ? `The ${D.name} Family` : "A family crest";
  document.title = `${title}: crest and creed`;
  const opts = { size: D.size, style: D.style, credit: true };
  const busy = (btn, fn) => async () => {
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Preparing…";
    try { await fn(); } catch (e) { console.error(e); toast("Sorry, that download failed."); }
    btn.disabled = false; btn.textContent = label;
  };
  const bPdf = h("button", { type: "button", class: "btn secondary" }, "Download PDF");
  bPdf.onclick = busy(bPdf, async () => { download(await exportPdf(D, opts), fileBase(D, opts) + ".pdf"); track("view_export_pdf"); });
  const bPng = h("button", { type: "button", class: "btn ghost" }, "Download image");
  bPng.onclick = busy(bPng, async () => { download(await exportPng(D, opts), fileBase(D, opts) + ".png"); track("view_export_png"); });
  root.replaceChildren(h("div", { class: "wrap share-view" },
    h("div", { class: "preview-box", html: posterSvg(D, { ...opts, creditText: creditText(), measure: canvasMeasure, id: "sv", fluid: true }) }),
    h("div", { class: "stack" },
      h("h1", {}, title),
      h("p", { class: "lead" }, "A family crest and creed, made together by the family with the free Family Creed Generator."),
      h("a", { class: "btn big", href: CFG.base + "make/", onclick: () => track("view_cta") }, "Make one for your family"),
      h("div", { class: "row", style: { flexWrap: "wrap" } }, bPdf, bPng),
      h("h2", {}, "What it means"),
      h("p", { class: "blazon" }, blazon(D.spec)),
      h("ul", { class: "meaning-list" }, explain(D.spec, D.motto).map((x) => h("li", {}, x))),
      h("p", { class: "small muted" }, "A family emblem designed by the family itself, not a historical coat of arms. Everything shown here comes from the link; nothing is stored on a server."))));
  track("view_open");
}

function empty(bad) {
  root.replaceChildren(h("div", { class: "wrap narrow app" },
    h("h1", {}, bad ? "This link looks incomplete" : "No crest in this link"),
    h("p", {}, bad ? "Part of the link may have been cut off when it was copied. Ask for it again, or make your own." : "Shared crests open here. Make one for your family in about ten minutes."),
    h("a", { class: "btn big", href: CFG.base + "make/" }, "Make your family's crest")));
}

addEventListener("hashchange", () => location.reload());

main();
