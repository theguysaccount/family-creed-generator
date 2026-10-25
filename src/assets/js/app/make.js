// The family session: setup → pass the phone → questions → vote on three designs → edit → print.
// Everything stays in this browser (localStorage). Remote relatives answer through links.
import { h, CFG, toast, track, store, b64urlJson, unb64urlJson, pageUrl, shareOrCopy, copyText } from "./ui.js";
import { VALUES, GROUPS, VALUE_BY_ID, ANIMAL_CHOICES, COLOR_CHOICES } from "../engine/values.js";
import { TONES, OCCASIONS, ACTIVITIES, HARD_TIMES, LEGACY, tally, buildCreed, mottoOptions, variants, cleanName } from "../engine/creed.js";
import { designOptions, designCrest } from "../engine/design.js";
import { crestSvg, blazon, SHIELDS, LAYOUTS, DIVISIONS, LINES, tinctureChecks } from "../engine/crest.js";
import { chargeSvg } from "../engine/draw-charge.js";
import { CHARGES } from "../engine/charges.js";
import { TINCTURES } from "../engine/tinctures.js";
import { posterSvg, SIZES, STYLES } from "../engine/poster.js";
import { newSeed } from "../engine/rng.js";
import { encodeDesign } from "../engine/share.js";
import { explain } from "../engine/meanings.js";
import { exportPdf, exportPng, exportCrestPng, exportSvg, download, fileBase, canvasMeasure, fontsReady, creditText } from "./export.js";

const KEY = "fcg.session.v1";
const RKEY = "fcg.remote.v1";
const MAX_MEMBERS = 12;
const root = document.getElementById("app");
let S = store.get(KEY);
let R = null; // remote-answer mode state

const QUESTIONS = [
  { key: "values", title: "Which values matter most in our family?", hint: "Pick 3 to 5.", type: "values", min: 1, max: 5 },
  { key: "animal", title: "Which animal is most like our family?", hint: "It may go on the crest.", type: "animal", optional: true },
  { key: "color", title: "Which color feels most like home?", type: "color", optional: true },
  { key: "activity", title: "What do we love doing together?", hint: "Pick the one you'd miss most.", type: "single", options: ACTIVITIES, optional: true },
  { key: "hard", title: "When things get hard, we…", type: "single", options: HARD_TIMES, optional: true },
  { key: "legacy", title: "In a hundred years, we hope people say we were…", hint: "Pick one or two.", type: "multi", options: LEGACY, max: 2, optional: true },
];

const emptyDraft = () => ({ values: [], animal: "", color: "", activity: "", hard: "", legacy: [] });

function save() {
  if (!S) return;
  S.updatedAt = Date.now();
  if (!store.set(KEY, S)) toast("Your browser isn't saving progress (private mode?). Keep this tab open.");
}

function newSession(pre = {}) {
  S = {
    v: 1, sid: newSeed() + newSeed(), step: "setup",
    family: { name: "", year: String(new Date().getFullYear()), occasion: pre.occasion || "none", tone: "warm" },
    members: [{ id: "m1", name: "", answers: null }, { id: "m2", name: "", answers: null }],
    cur: { m: 0, q: 0 }, draft: null, seed: newSeed(), options: null, votes: [], design: null,
    pre: pre.values || [], createdAt: Date.now(),
  };
  save();
}

function memberName(m, i) {
  return (m.name || "").trim() || `Person ${i + 1}`;
}

function nextUnanswered() {
  return S.members.findIndex((m) => !m.answers);
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function mount(...nodes) {
  root.replaceChildren(...nodes);
  const first = root.querySelector("h1, h2");
  if (first) { first.setAttribute("tabindex", "-1"); first.focus({ preventScroll: true }); }
  scrollTop();
}

// ---------- entry ----------

function readHash() {
  const hash = location.hash.slice(1);
  if (!hash) return null;
  const [k, v] = hash.split("=");
  history.replaceState(null, "", location.pathname + location.search);
  return { k, v };
}

function init() {
  const params = new URLSearchParams(location.search);
  const pre = {
    values: (params.get("v") || "").split(",").filter((x) => VALUE_BY_ID[x]),
    occasion: OCCASIONS.some((o) => o.id === params.get("occasion")) ? params.get("occasion") : undefined,
  };
  const hv = readHash();
  if (hv && hv.k === "join") return startRemote(hv.v);
  if (hv && hv.k === "ans") return importAnswers(hv.v);
  R = store.get(RKEY);
  if (R && R.mode === "remote" && !R.done && params.get("remote") === "1") return renderRemote();
  if (!S || S.v !== 1) newSession(pre);
  else if (pre.values.length && S.step === "setup" && !S.members.some((m) => m.answers)) S.pre = pre.values;
  if (pre.occasion && S.step === "setup") S.family.occasion = pre.occasion;
  render();
}

function render() {
  switch (S.step) {
    case "pass": return renderPass();
    case "q": return renderQuestion();
    case "between": return renderBetween();
    case "results": return renderResults();
    case "edit": return renderEditor();
    default: return renderSetup();
  }
}

// ---------- setup ----------

function renderSetup() {
  const f = S.family;
  const membersBox = h("div", { class: "members" });
  const drawMembers = () => {
    membersBox.replaceChildren(...S.members.map((m, i) => h("div", { class: "row" },
      h("input", { type: "text", value: m.name, maxlength: 24, "aria-label": `Name of person ${i + 1}`, placeholder: i === 0 ? "You (the organizer)" : `Person ${i + 1}`, autocomplete: "off",
        oninput: (e) => { m.name = e.target.value; save(); } }),
      m.answers ? h("span", { class: "small muted", style: { flex: "none" } }, m.remote ? "answered remotely ✓" : "answered ✓") : null,
      S.members.length > 1 ? h("button", { type: "button", class: "icon-btn", "aria-label": `Remove ${memberName(m, i)}`, onclick: () => { S.members.splice(i, 1); save(); drawMembers(); } }, "×") : null,
    )));
  };
  drawMembers();

  const toneTiles = h("div", { class: "tone-cards", role: "radiogroup", "aria-label": "Tone of the creed" },
    TONES.map((t) => h("label", { class: "tile" },
      h("input", { type: "radio", name: "tone", value: t.id, checked: f.tone === t.id, onchange: () => { f.tone = t.id; save(); } }),
      h("span", {}, t.label, h("small", {}, t.hint)))));

  const inviteOut = h("div", { class: "stack" });
  const invite = h("details", { class: "panel" },
    h("summary", {}, "Someone can't be here? Send them a link"),
    h("div", { class: "stack" },
      h("p", { class: "small" }, "They answer on their own phone, then send a link back to you. Open that link on this device and their answers join the session. Nothing passes through a server."),
      h("button", { type: "button", class: "btn secondary small", onclick: async () => {
        const token = b64urlJson({ s: S.sid, f: cleanName(f.name), t: f.tone });
        const url = pageUrl(`make/?remote=1#join=${token}`);
        track("invite_created");
        inviteOut.replaceChildren(
          h("input", { type: "text", readonly: true, value: url, "aria-label": "Invite link", onfocus: (e) => e.target.select() }),
          h("div", { class: "row" },
            h("button", { type: "button", class: "btn small", onclick: async () => {
              const r = await shareOrCopy({ title: "Help make our family crest", text: `Help make the ${cleanName(f.name) || "family"} crest: answer six quick questions.`, url });
              if (r === "copied") toast("Invite link copied");
            } }, "Share invite"),
            h("button", { type: "button", class: "btn ghost small", onclick: async () => toast((await copyText(url)) ? "Copied" : "Couldn't copy") }, "Copy")),
        );
      } }, "Create an invite link"),
      inviteOut));

  const startBtn = h("button", { type: "button", class: "btn big", onclick: () => {
    S.members = S.members.filter((m, i) => m.answers || m.name.trim() || i === 0);
    if (!S.members.length) S.members = [{ id: "m1", name: "", answers: null }];
    const i = nextUnanswered();
    track("setup_start");
    if (i < 0) { generate(); S.step = "results"; }
    else { S.cur = { m: i, q: 0 }; S.draft = { ...emptyDraft(), values: (S.pre || []).slice(0, 5) }; S.step = "pass"; }
    save(); render();
  } }, S.members.some((m) => m.answers) ? "Continue" : "Start the questions →");

  mount(h("div", { class: "wrap narrow app" },
    h("h1", {}, "Make your family's crest and creed"),
    h("p", { class: "lead" }, "Everyone answers six quick questions on this phone, one at a time, without seeing each other's answers. Then the family votes on three designs and you print the winner. About ten minutes for a family of four."),
    h("div", { class: "card stack" },
      h("div", { class: "field" },
        h("label", { for: "fam" }, "Family name ", h("span", { class: "hint" }, "(shown as “The Rivera Family”; leave blank for “Our Family”)")),
        h("input", { id: "fam", type: "text", value: f.name, maxlength: 40, placeholder: "Rivera", autocomplete: "family-name", oninput: (e) => { f.name = e.target.value; save(); } })),
      h("div", { class: "row" },
        h("div", { class: "field" },
          h("label", { for: "yr" }, "Established"),
          h("input", { id: "yr", type: "text", inputmode: "numeric", value: f.year, maxlength: 12, oninput: (e) => { f.year = e.target.value; save(); } })),
        h("div", { class: "field" },
          h("label", { for: "occ" }, "Occasion"),
          h("select", { id: "occ", onchange: (e) => { f.occasion = e.target.value; save(); } },
            OCCASIONS.map((o) => h("option", { value: o.id, selected: f.occasion === o.id }, o.label))))),
      h("div", { class: "field" }, h("label", {}, "Tone of the creed"), toneTiles),
      h("div", { class: "field" },
        h("label", {}, "Who's answering? ", h("span", { class: "hint" }, "First names or nicknames. Kids welcome. Making it as a gift? Just add yourself.")),
        membersBox,
        h("button", { type: "button", class: "linkbtn", onclick: () => {
          if (S.members.length >= MAX_MEMBERS) return toast(`Up to ${MAX_MEMBERS} people`);
          S.members.push({ id: "m" + Date.now().toString(36), name: "", answers: null });
          save(); drawMembers(); membersBox.querySelector(".row:last-child input")?.focus();
        } }, "+ Add a person")),
      invite,
      h("p", { class: "notice small" }, "Private by design: what you type stays on this device. No accounts, no uploads, and we never see your answers."),
      h("div", { class: "nav-row" }, startBtn,
        S.members.some((m) => m.answers) ? h("button", { type: "button", class: "linkbtn", onclick: () => { if (confirm("Start over and clear every answer?")) { newSession(); render(); } } }, "Start over") : null)),
  ));
}

// ---------- pass the phone ----------

function renderPass() {
  const i = S.cur.m, m = S.members[i];
  mount(h("div", { class: "wrap narrow app" },
    h("div", { class: "pass card" },
      h("p", { class: "muted" }, "Pass the phone to"),
      h("h1", { class: "who" }, memberName(m, i)),
      h("p", {}, "Only you should see the next screens. Your answers stay hidden from everyone else."),
      h("button", { type: "button", class: "btn big", onclick: () => { S.step = "q"; S.cur.q = 0; S.draft = S.draft || { ...emptyDraft(), values: (S.pre || []).slice(0, 5) }; save(); render(); } }, `I'm ${memberName(m, i)}. Let's go`),
      h("p", { style: { marginTop: "18px" } },
        h("button", { type: "button", class: "linkbtn", onclick: () => skipMember(i) }, `${memberName(m, i)} isn't here. Skip`)),
    )));
}

function skipMember(i) {
  S.members.splice(i, 1);
  S.draft = null;
  if (!S.members.length) { newSession(); return render(); }
  const n = nextUnanswered();
  if (n < 0) { generate(); S.step = "results"; }
  else { S.cur = { m: n, q: 0 }; S.step = "pass"; }
  save(); render();
}

// ---------- questions (shared with remote mode) ----------

function questionView({ name, q, draft, onBack, onNext, onSkipQ }) {
  const Q = QUESTIONS[q];
  const nextBtn = h("button", { type: "button", class: "btn" }, q === QUESTIONS.length - 1 ? "Done" : "Next →");
  const valid = () => Q.type === "values" ? draft.values.length >= Q.min : Q.type === "multi" ? true : !!draft[Q.key] || Q.optional;
  const refresh = () => { nextBtn.disabled = !valid(); };
  nextBtn.addEventListener("click", () => valid() && onNext());
  let body;
  if (Q.type === "values") {
    const counter = h("p", { class: "small muted", "aria-live": "polite" });
    const boxes = [];
    const sync = () => {
      counter.textContent = `${draft.values.length} of ${Q.max} picked`;
      for (const b of boxes) b.disabled = !b.checked && draft.values.length >= Q.max;
      refresh();
    };
    body = h("div", {}, counter, GROUPS.map((g) => h("div", {},
      h("div", { class: "group-label" }, g.label),
      h("div", { class: "chips" }, VALUES.filter((v) => v.group === g.id).map((v) => {
        const cb = h("input", { type: "checkbox", value: v.id, checked: draft.values.includes(v.id), onchange: (e) => {
          if (e.target.checked) { if (draft.values.length < Q.max) draft.values.push(v.id); else e.target.checked = false; }
          else draft.values = draft.values.filter((x) => x !== v.id);
          sync();
        } });
        boxes.push(cb);
        return h("label", { class: "chip", title: v.short }, cb, h("span", {}, v.label));
      })))));
    sync();
  } else if (Q.type === "animal") {
    body = h("div", { class: "tiles", role: "radiogroup", "aria-label": Q.title }, ANIMAL_CHOICES.map((a) => h("label", { class: "tile" },
      h("input", { type: "radio", name: "animal", value: a.id, checked: draft.animal === a.id, onchange: () => { draft.animal = a.id; refresh(); } }),
      h("span", { html: `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="98" fill="#1F4F9A"/>${chargeSvg(a.id, "or", 100, 100, 150, 4)}</svg>` }, a.label))));
  } else if (Q.type === "color") {
    body = h("div", { class: "tiles", role: "radiogroup", "aria-label": Q.title }, COLOR_CHOICES.map((c) => h("label", { class: "tile" },
      h("input", { type: "radio", name: "color", value: c.id, checked: draft.color === c.id, onchange: () => { draft.color = c.id; refresh(); } }),
      h("span", {}, h("i", { class: "sw", style: { background: TINCTURES[c.id].hex } }), c.label))));
  } else if (Q.type === "single") {
    body = h("div", { class: "list-opts", role: "radiogroup", "aria-label": Q.title }, Q.options.map((o) => h("label", { class: "chip" },
      h("input", { type: "radio", name: Q.key, value: o.id, checked: draft[Q.key] === o.id, onchange: () => { draft[Q.key] = o.id; refresh(); } }),
      h("span", {}, o.label))));
  } else {
    const boxes = [];
    const sync = () => { for (const b of boxes) b.disabled = !b.checked && draft[Q.key].length >= Q.max; refresh(); };
    body = h("div", { class: "chips" }, Q.options.map((o) => {
      const cb = h("input", { type: "checkbox", value: o.id, checked: draft[Q.key].includes(o.id), onchange: (e) => {
        if (e.target.checked) draft[Q.key].push(o.id); else draft[Q.key] = draft[Q.key].filter((x) => x !== o.id);
        sync();
      } });
      boxes.push(cb);
      return h("label", { class: "chip" }, cb, h("span", {}, o.label));
    }));
    sync();
  }
  refresh();
  return h("div", { class: "wrap narrow app" },
    h("div", { class: "progress", "aria-hidden": "true" }, QUESTIONS.map((_, k) => h("span", { class: k <= q ? "on" : "" }))),
    h("p", { class: "small muted" }, `Question ${q + 1} of ${QUESTIONS.length} · ${name}`),
    h("h1", { class: "q-title" }, Q.title),
    Q.hint ? h("p", { class: "muted" }, Q.hint) : null,
    body,
    h("div", { class: "nav-row" },
      h("button", { type: "button", class: "btn ghost", onclick: onBack }, "← Back"),
      h("div", { class: "row", style: { flex: "none", gap: "14px" } },
        Q.optional ? h("button", { type: "button", class: "linkbtn", onclick: onSkipQ }, "Skip") : null,
        nextBtn)));
}

function renderQuestion() {
  const i = S.cur.m, m = S.members[i];
  if (!m) { S.step = "setup"; return render(); }
  S.draft = S.draft || emptyDraft();
  const advance = () => {
    if (S.cur.q < QUESTIONS.length - 1) { S.cur.q++; save(); render(); return; }
    m.answers = S.draft;
    S.draft = null;
    track("member_done");
    const n = nextUnanswered();
    S.step = "between";
    S.cur.next = n;
    save(); render();
  };
  mount(questionView({
    name: memberName(m, i), q: S.cur.q, draft: S.draft,
    onBack: () => { if (S.cur.q > 0) S.cur.q--; else S.step = "pass"; save(); render(); },
    onNext: advance,
    onSkipQ: () => { const Q = QUESTIONS[S.cur.q]; S.draft[Q.key] = Q.type === "multi" ? [] : ""; advance(); },
  }));
}

function renderBetween() {
  const done = S.members[S.cur.m];
  const n = S.cur.next;
  const last = n == null || n < 0;
  mount(h("div", { class: "wrap narrow app" },
    h("div", { class: "pass card" },
      h("h1", { class: "q-title" }, `Thanks, ${memberName(done || {}, S.cur.m)}!`),
      h("p", {}, "Your answers are saved and hidden."),
      last
        ? [h("p", {}, "That's everyone. Hand the phone back to the organizer."),
          h("button", { type: "button", class: "btn big", onclick: () => { generate(); S.step = "results"; save(); render(); } }, "See our designs")]
        : [h("p", {}, "Now pass the phone to"),
          h("p", { class: "who" }, memberName(S.members[n], n)),
          h("button", { type: "button", class: "btn big", onclick: () => { S.cur = { m: n, q: 0 }; S.draft = { ...emptyDraft(), values: (S.pre || []).slice(0, 5) }; S.step = "pass"; save(); render(); } }, "Pass the phone")],
    )));
}

// ---------- generate, results and vote ----------

function generate() {
  const t = tally(S.members);
  const opts = designOptions(t, { seed: S.seed, tone: S.family.tone, occasion: S.family.occasion }, 3);
  S.options = opts.map((o, i) => {
    const creed = buildCreed(t, S.family, o.seed);
    const mottos = mottoOptions(t, o.seed);
    const motto = mottos[Math.min(i, mottos.length - 1)];
    o.spec.ribbonText = motto.text.toUpperCase();
    return { seed: o.seed, spec: o.spec, creed, motto, mottos };
  });
  S.votes = S.options.map(() => 0);
  track("generated");
}

function renderResults() {
  if (!S.options) generate();
  const t = tally(S.members);
  const max = Math.max(1, ...t.values.map(([, n]) => n));
  const label = (list, id) => list.find((x) => x.id === id)?.label || id;
  const top = (arr, list) => {
    if (!arr.length) return "no answer";
    const n = arr[0][1];
    const tied = arr.filter(([, c]) => c === n).map(([id]) => label(list, id));
    return tied.length > 1 ? `${tied.slice(0, 3).join(" or ")} (tie)` : `${tied[0]}${n > 1 ? ` (${n} votes)` : ""}`;
  };
  const optionCards = S.options.map((o, i) => {
    const votes = h("b", { "aria-live": "polite" }, String(S.votes[i] || 0));
    return h("article", { class: "card option" },
      h("h2", { class: "q-title", style: { fontSize: "1.2rem", margin: 0 } }, `Design ${i + 1}`),
      h("div", { html: crestSvg(o.spec, { id: "opt" + i, title: `Design ${i + 1}` }) }),
      h("p", { class: "motto" }, o.motto.text, o.motto.translation ? h("span", { class: "small muted", style: { display: "block", fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400 } }, `“${o.motto.translation}”`) : null),
      h("div", { class: "creed-sample small" }, o.creed.lines.slice(1, 4).map((l) => h("p", {}, l.text))),
      h("div", { class: "votes" },
        h("button", { type: "button", class: "icon-btn", "aria-label": `Remove a vote from design ${i + 1}`, onclick: () => { S.votes[i] = Math.max(0, (S.votes[i] || 0) - 1); votes.textContent = S.votes[i]; save(); } }, "−"),
        votes,
        h("button", { type: "button", class: "icon-btn", "aria-label": `Add a vote for design ${i + 1}`, onclick: () => { S.votes[i] = (S.votes[i] || 0) + 1; votes.textContent = S.votes[i]; save(); track("voted"); } }, "+")),
      h("button", { type: "button", class: "btn", onclick: () => choose(i) }, "Choose this one"));
  });
  mount(h("div", { class: "wrap app" },
    h("h1", {}, "Here's what your family said"),
    h("div", { class: "card stack" },
      h("p", { class: "small muted" }, `${t.n} ${t.n === 1 ? "person" : "people"} answered. Counts only, so nobody's answers are singled out.`),
      h("div", { class: "bars" }, t.values.slice(0, 8).map(([id, n]) => h("div", { class: "bar" }, h("span", {}, VALUE_BY_ID[id].label), h("i", { style: { width: `${(n / max) * 100}%` } }), h("span", {}, String(n))))),
      h("p", {}, h("b", {}, "Most like a: "), top(t.animal, ANIMAL_CHOICES), h("br"),
        h("b", {}, "Color of home: "), top(t.color, COLOR_CHOICES), h("br"),
        h("b", {}, "Together we love: "), top(t.activity, ACTIVITIES), h("br"),
        h("b", {}, "When it's hard, we: "), top(t.hard, HARD_TIMES))),
    h("h2", {}, "Vote for your favorite"),
    h("p", {}, "Everyone points at the one they like best. Tap + for each vote, then choose the winner. You can change every word and color afterwards."),
    h("div", { class: "options" }, optionCards),
    h("div", { class: "nav-row" },
      h("button", { type: "button", class: "btn ghost", onclick: () => { S.seed = newSeed(); generate(); save(); render(); } }, "Show me three new designs"),
      h("button", { type: "button", class: "linkbtn", onclick: () => { S.step = "setup"; S.options = null; save(); render(); } }, "Add someone else's answers"))));
}

function choose(i) {
  const o = S.options[i];
  S.design = {
    name: cleanName(S.family.name), year: (S.family.year || "").trim(),
    creed: o.creed, motto: o.motto, mottos: o.mottos, spec: o.spec, seed: o.seed,
    style: S.family.tone === "playful" ? "modern" : "heirloom", size: "letter", credit: true,
  };
  S.step = "edit";
  track("chosen");
  save(); render();
}

// ---------- editor ----------

let previewTimer = 0;

function renderEditor() {
  const D = S.design;
  const preview = h("div", { class: "preview-box", "aria-live": "off" });
  const blazonP = h("p", { class: "blazon" });
  const meaningUl = h("ul", { class: "meaning-list" });
  const tinctureNote = h("p", { class: "notice warn small", hidden: true });
  const draw = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      D.spec.ribbonText = D.spec.ribbon === false ? "" : String(D.motto.text || "").toUpperCase();
      preview.innerHTML = posterSvg(D, { size: D.size, style: D.style, credit: D.credit, creditText: creditText(), measure: canvasMeasure, id: "pv", fluid: true });
      blazonP.textContent = blazon(D.spec);
      meaningUl.replaceChildren(...explain(D.spec, D.motto).map((x) => h("li", {}, x)));
      const bad = tinctureChecks(D.spec).filter((c) => !c.ok);
      tinctureNote.hidden = !bad.length;
      tinctureNote.textContent = bad.length ? "Heraldry tip: metal (gold, silver) on color, or color on metal, reads best from across a room. Some of your colors sit on their own kind." : "";
      save();
    }, 60);
  };
  fontsReady().then(draw);

  // Creed lines
  const linesBox = h("div");
  const drawLines = () => {
    linesBox.replaceChildren(...D.creed.lines.map((l, i) => {
      const ta = h("textarea", { rows: 2, maxlength: 160, "aria-label": `Creed line ${i + 1}`, oninput: (e) => { l.text = e.target.value; l.edited = true; draw(); } });
      ta.value = l.text;
      const vs = l.kind && l.kind !== "custom" ? variants(l.kind, l.key || "", D.creed.tone, D.name) : [];
      return h("div", { class: "line-ed" }, ta,
        h("button", { type: "button", class: "icon-btn", title: "Say it another way", "aria-label": `Say line ${i + 1} another way`, disabled: vs.length < 2,
          onclick: () => { l.alt = ((l.alt || 0) + 1) % vs.length; l.text = vs[l.alt]; ta.value = l.text; draw(); } }, "↻"),
        h("button", { type: "button", class: "icon-btn", title: "Remove line", "aria-label": `Remove line ${i + 1}`, onclick: () => { D.creed.lines.splice(i, 1); drawLines(); draw(); } }, "×"));
    }));
  };
  drawLines();

  // Motto choices
  const mottoBox = h("div", { class: "stack" });
  const drawMotto = () => {
    const opts = D.mottos || [D.motto];
    const isCustom = !opts.some((m) => m.text === D.motto.text);
    const custom = h("input", { type: "text", maxlength: 40, value: isCustom ? D.motto.text : "", placeholder: "Write your own motto", "aria-label": "Your own motto",
      oninput: (e) => { D.motto = { text: e.target.value, translation: trans.value, lang: trans.value ? "la" : "en", kind: "custom" }; draw(); } });
    const trans = h("input", { type: "text", maxlength: 80, value: isCustom ? D.motto.translation || "" : "", placeholder: "Translation, if it's not in English", "aria-label": "Motto translation",
      oninput: (e) => { if (custom.value) { D.motto = { text: custom.value, translation: e.target.value, lang: e.target.value ? "la" : "en", kind: "custom" }; draw(); } } });
    mottoBox.replaceChildren(
      h("div", { class: "list-opts", role: "radiogroup", "aria-label": "Motto" }, opts.map((m) => h("label", { class: "chip" },
        h("input", { type: "radio", name: "motto", checked: D.motto.text === m.text, onchange: () => { D.motto = { ...m }; drawMotto(); draw(); } }),
        h("span", { style: { display: "block" } }, m.text, m.translation ? h("small", { style: { display: "block", fontWeight: 400 } }, `“${m.translation}”`) : null)))),
      h("label", { class: "small" }, "Or write your own"), custom, trans,
      h("label", { class: "row small", style: { fontWeight: 400 } },
        h("input", { type: "checkbox", checked: D.spec.ribbon !== false, style: { flex: "none", width: "22px", height: "22px" }, onchange: (e) => { D.spec.ribbon = e.target.checked; draw(); } }),
        h("span", {}, "Show the motto on the ribbon under the shield")));
  };
  drawMotto();

  // Crest controls
  const sel = (label, value, options, onchange) => h("div", { class: "field" },
    h("label", {}, label),
    h("select", { onchange: (e) => { onchange(e.target.value); draw(); } }, options.map(([v, t]) => h("option", { value: v, selected: v === value }, t))));
  const swatchRow = (label, idx) => h("div", { class: "field" },
    h("label", {}, label),
    h("div", { class: "swatches", role: "radiogroup", "aria-label": label }, Object.entries(TINCTURES).map(([k, T]) => h("label", { title: `${T.plain} (${T.name})` },
      h("input", { type: "radio", name: "t" + idx, value: k, checked: D.spec.t[idx] === k, "aria-label": T.plain, onchange: () => { D.spec.t[idx] = k; draw(); } }),
      h("span", { style: { background: T.hex } })))));
  const chargeGrid = (label, key) => h("div", { class: "field" },
    h("label", {}, label),
    h("div", { class: "mini-grid", role: "radiogroup", "aria-label": label }, Object.values(CHARGES).map((c) => h("label", { title: c.plain },
      h("input", { type: "radio", name: "ch-" + key, value: c.id, checked: D.spec[key] === c.id, "aria-label": c.plain, onchange: () => { D.spec[key] = c.id; draw(); } }),
      h("span", { html: `<svg viewBox="0 0 200 200" aria-hidden="true">${chargeSvg(c.id, "or", 100, 100, 180, 5)}</svg>` })))));

  const buildCrestPanel = () => h("div", {},
    h("div", { class: "row" },
      sel("Shield", D.spec.shield, Object.entries(SHIELDS).map(([k, v]) => [k, v.label]), (v) => (D.spec.shield = v)),
      sel("Layout", D.spec.layout, Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]), (v) => { D.spec.layout = v; rebuildCrestPanel(); })),
    D.spec.layout === "party" ? sel("Division", D.spec.division, Object.entries(DIVISIONS).map(([k, v]) => [k, v.label]), (v) => (D.spec.division = v)) : null,
    LAYOUTS[D.spec.layout]?.lines || D.spec.layout === "party" ? sel("Edge of the line", D.spec.line, Object.entries(LINES).map(([k, v]) => [k, v.label]), (v) => (D.spec.line = v)) : null,
    swatchRow("Field color", 0),
    ["party", "impaled", "quarterly"].includes(D.spec.layout) ? swatchRow("Second field color", 1) : null,
    LAYOUTS[D.spec.layout]?.ordinary ? swatchRow("Band or border color", 2) : null,
    ["party", "impaled", "quarterly"].includes(D.spec.layout) ? null : swatchRow("Main symbol color", 3),
    ["center", "party", "impaled", "quarterly"].includes(D.spec.layout) ? null : swatchRow("Small symbol color", 4),
    tinctureNote,
    chargeGrid("Main symbol", "main"),
    D.spec.layout === "center" || D.spec.layout === "party" ? null : chargeGrid("Small symbol", "second"),
    D.spec.layout === "bordure" ? h("label", { class: "row small", style: { fontWeight: 400 } },
      h("input", { type: "checkbox", checked: !!D.spec.bordureCharged, style: { flex: "none", width: "22px", height: "22px" }, onchange: (e) => { D.spec.bordureCharged = e.target.checked; draw(); } }),
      h("span", {}, "Put small symbols on the border")) : null,
    h("div", { class: "row" },
      sel("Wreath", D.spec.frame || "none", [["none", "None"], ["laurel", "Laurel"], ["oak", "Oak"]], (v) => (D.spec.frame = v)),
      sel("Wreath color", D.spec.frameT || "or", Object.entries(TINCTURES).map(([k, T]) => [k, T.plain.replace(/^./, (c) => c.toUpperCase())]), (v) => (D.spec.frameT = v))),
    h("div", { class: "row" },
      sel("Crest above the shield", D.spec.crest ? "on" : "off", [["off", "None"], ["on", "On a wreath"]], (v) => (D.spec.crest = v === "on")),
      sel("Crest symbol", D.spec.crestCharge || D.spec.main, Object.values(CHARGES).map((c) => [c.id, c.plain.replace(/^./, (x) => x.toUpperCase())]), (v) => (D.spec.crestCharge = v))),
    sel("Finish", D.spec.finish || "shaded", [["shaded", "Soft shading"], ["flat", "Flat (best for embroidery and stamps)"]], (v) => (D.spec.finish = v)),
    h("button", { type: "button", class: "btn ghost small", onclick: () => {
      const t = tally(S.members);
      const keep = { main: D.spec.main, second: D.spec.second, ribbon: D.spec.ribbon };
      D.spec = { ...designCrest(t, { seed: newSeed(), tone: D.creed.tone, occasion: S.family.occasion }), ...keep };
      rebuildCrestPanel(); draw();
    } }, "Shuffle the crest"));
  const crestSummary = h("summary", {}, "Crest");
  const crestDetails = h("details", { class: "panel" }, crestSummary, buildCrestPanel());
  const rebuildCrestPanel = () => { crestDetails.replaceChildren(crestSummary, buildCrestPanel()); draw(); };

  // Poster
  const posterPanel = h("div", {},
    h("div", { class: "row" },
      h("div", { class: "field" }, h("label", { for: "pn" }, "Family name"),
        h("input", { id: "pn", type: "text", maxlength: 40, value: D.name, oninput: (e) => { D.name = cleanName(e.target.value); draw(); } })),
      h("div", { class: "field" }, h("label", { for: "py" }, "Established"),
        h("input", { id: "py", type: "text", maxlength: 12, value: D.year, oninput: (e) => { D.year = e.target.value; draw(); } }))),
    h("div", { class: "field" }, h("label", {}, "Style"),
      h("div", { class: "tone-cards", role: "radiogroup", "aria-label": "Poster style" }, Object.entries(STYLES).map(([k, st]) => h("label", { class: "tile" },
        h("input", { type: "radio", name: "style", checked: D.style === k, onchange: () => { D.style = k; draw(); } }),
        h("span", {}, h("i", { class: "swatch", style: { background: st.bg, borderColor: st.rule } }), st.label))))),
    sel("Print size", D.size, Object.entries(SIZES).map(([k, s]) => [k, s.label]), (v) => (D.size = v)),
    h("label", { class: "row small", style: { fontWeight: 400 } },
      h("input", { type: "checkbox", checked: D.credit !== false, style: { flex: "none", width: "22px", height: "22px" }, onchange: (e) => { D.credit = e.target.checked; draw(); } }),
      h("span", {}, "Small credit line at the bottom (it helps other families find this free tool)")));

  // Export
  const busy = (btn, fn) => async () => {
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Preparing…";
    try { await fn(); } catch (e) { console.error(e); toast("Sorry, that export failed. Try PNG, or a smaller size."); }
    btn.disabled = false;
    btn.textContent = label;
  };
  const opts = () => ({ size: D.size, style: D.style, credit: D.credit });
  const bPdf = h("button", { type: "button", class: "btn" }, "Download print-ready PDF");
  bPdf.onclick = busy(bPdf, async () => { download(await exportPdf(D, opts()), fileBase(D, opts()) + ".pdf"); track("export_pdf"); });
  const bPng = h("button", { type: "button", class: "btn secondary" }, "Download poster image (PNG)");
  bPng.onclick = busy(bPng, async () => { download(await exportPng(D, opts()), fileBase(D, opts()) + ".png"); track("export_png"); });
  const bCrest = h("button", { type: "button", class: "btn secondary" }, "Crest only, transparent (PNG)");
  bCrest.onclick = busy(bCrest, async () => { download(await exportCrestPng(D), fileBase(D, { size: "crest" }) + ".png"); track("export_crest"); });
  const bSvg = h("button", { type: "button", class: "btn ghost" }, "Vector file (SVG)");
  bSvg.onclick = busy(bSvg, async () => { download(await exportSvg(D, opts()), fileBase(D, opts()) + ".svg"); track("export_svg"); });
  const bShare = h("button", { type: "button", class: "btn ghost" }, "Share a link to it");
  bShare.onclick = busy(bShare, async () => {
    const token = await encodeDesign({ ...D, style: D.style, size: D.size });
    const url = pageUrl("c/") + "#" + token;
    const r = await shareOrCopy({ title: D.name ? `The ${D.name} Family Crest` : "Our family crest", text: "Our family crest and creed", url });
    if (r === "copied") toast("Link copied. It holds the whole design, so anyone with it can see and print it.");
    track("share");
  });
  const bPrint = h("button", { type: "button", class: "btn ghost", onclick: () => printPoster(D) }, "Print");
  const exportPanel = h("div", { class: "export-grid" }, bPdf, bPng, bCrest, bShare, bPrint, bSvg,
    h("p", { class: "small muted" }, "PDFs are 300 dpi at the size you picked (16 × 20 in is 200 dpi), ready for a print shop or a home printer. Your files are made on this device."),
    CFG.shop ? h("div", { class: "shop-slot" }, h("p", { class: "small" }, h("b", {}, "Want it framed or on a shirt? "), "Download the PNG, then upload it here:"),
      h("a", { class: "btn small", href: CFG.shop, target: "_blank", rel: "noopener" }, "Order a print")) : null);

  mount(h("div", { class: "wrap app" },
    h("h1", {}, "Make it yours"),
    h("p", { class: "muted" }, "Edit any line, pick a motto, adjust the crest, then download it. Changes save on this device."),
    h("div", { class: "editor" },
      h("div", { class: "preview" }, preview, h("p", { class: "small muted center" }, "Preview. Downloads are full print resolution.")),
      h("div", {},
        h("details", { class: "panel", open: true }, h("summary", {}, "Creed"), h("div", {},
          sel("Tone", D.creed.tone, TONES.map((t) => [t.id, `${t.label}: ${t.hint}`]), (v) => {
            if (D.creed.lines.some((l) => l.edited) && !confirm("Rewrite the creed in this tone? Your edits to the lines will be replaced.")) return drawLines();
            const t = tally(S.members);
            D.creed = buildCreed(t, { ...S.family, name: D.name, tone: v }, D.seed);
            drawLines();
          }),
          linesBox,
          h("button", { type: "button", class: "linkbtn", onclick: () => { D.creed.lines.splice(Math.max(1, D.creed.lines.length - 1), 0, { kind: "custom", text: "" }); drawLines(); linesBox.querySelectorAll("textarea")[Math.max(1, D.creed.lines.length - 2)]?.focus(); } }, "+ Add a line"))),
        h("details", { class: "panel", open: true }, h("summary", {}, "Motto"), h("div", {}, mottoBox)),
        crestDetails,
        h("details", { class: "panel" }, h("summary", {}, "Poster"), posterPanel),
        h("details", { class: "panel", open: true }, h("summary", {}, "Download and share"), exportPanel),
        h("details", { class: "panel" }, h("summary", {}, "What it means"), h("div", {},
          h("p", { class: "small muted" }, "Its blazon, the formal heraldic description:"), blazonP, meaningUl,
          h("p", { class: "small muted" }, "This is a family emblem you designed, not a historical coat of arms or a grant from any heraldic authority."))),
        h("div", { class: "nav-row" },
          h("button", { type: "button", class: "linkbtn", onclick: () => { S.step = "results"; save(); render(); } }, "← Back to the three designs"),
          h("button", { type: "button", class: "linkbtn", onclick: () => { if (confirm("Start a new family session? This design will be cleared from this device. Download or share it first.")) { newSession(); render(); } } }, "Start a new session"))))));
  draw();
}

function printPoster(D) {
  const size = SIZES[D.size] || SIZES.letter;
  const style = h("style", {}, `@page { size: ${size.w}in ${size.h}in; margin: 0; } @media print { #print-area svg { width: ${size.w}in; height: ${size.h}in; display: block; } }`);
  const area = h("div", { id: "print-area", class: "print-only", html: posterSvg(D, { size: D.size, style: D.style, credit: D.credit, creditText: creditText(), measure: canvasMeasure, id: "pr" }) });
  document.body.append(style, area);
  track("print");
  setTimeout(() => {
    window.print();
    setTimeout(() => { area.remove(); style.remove(); }, 500);
  }, 50);
}

// ---------- remote relatives ----------

function sanitizeAnswers(a) {
  const pick = (v, list) => (list.some((x) => x.id === v) ? v : "");
  return {
    values: (Array.isArray(a?.values) ? a.values : []).filter((v) => VALUE_BY_ID[v]).slice(0, 5),
    animal: pick(a?.animal, ANIMAL_CHOICES), color: pick(a?.color, COLOR_CHOICES),
    activity: pick(a?.activity, ACTIVITIES), hard: pick(a?.hard, HARD_TIMES),
    legacy: (Array.isArray(a?.legacy) ? a.legacy : []).filter((v) => LEGACY.some((l) => l.id === v)).slice(0, 2),
  };
}

function startRemote(token) {
  let inv;
  try { inv = unb64urlJson(token); } catch { inv = null; }
  if (!inv || typeof inv.s !== "string") {
    mount(h("div", { class: "wrap narrow app" }, h("h1", {}, "That invite link is incomplete"), h("p", {}, "Ask the organizer to send it again, or "), h("a", { href: CFG.base + "make/" }, "start your own family's crest.")));
    return;
  }
  R = { mode: "remote", sid: String(inv.s).slice(0, 24), family: String(inv.f || "").slice(0, 40), tone: inv.t, name: "", q: -1, draft: emptyDraft(), done: false };
  store.set(RKEY, R);
  history.replaceState(null, "", location.pathname + "?remote=1");
  renderRemote();
}

function renderRemote() {
  const fam = R.family ? `the ${R.family} family` : "your family";
  if (R.done) return renderRemoteDone();
  if (R.q < 0) {
    const name = h("input", { id: "rn", type: "text", maxlength: 24, value: R.name, placeholder: "Your first name", autocomplete: "given-name" });
    mount(h("div", { class: "wrap narrow app" },
      h("h1", {}, `Help make ${fam}'s crest`),
      h("p", { class: "lead" }, "Answer six quick questions. When you're done, you'll send your answers back to the organizer with one link."),
      h("div", { class: "card stack" },
        h("div", { class: "field" }, h("label", { for: "rn" }, "Your name"), name),
        h("p", { class: "notice small" }, "Your answers are only in the link you send back. Nothing is uploaded."),
        h("button", { type: "button", class: "btn big", onclick: () => { R.name = name.value.trim().slice(0, 24) || "A relative"; R.q = 0; store.set(RKEY, R); renderRemote(); } }, "Start"))));
    return;
  }
  mount(questionView({
    name: R.name, q: R.q, draft: R.draft,
    onBack: () => { R.q--; store.set(RKEY, R); renderRemote(); },
    onNext: () => { if (R.q < QUESTIONS.length - 1) R.q++; else R.done = true; store.set(RKEY, R); renderRemote(); },
    onSkipQ: () => { const Q = QUESTIONS[R.q]; R.draft[Q.key] = Q.type === "multi" ? [] : ""; if (R.q < QUESTIONS.length - 1) R.q++; else R.done = true; store.set(RKEY, R); renderRemote(); },
  }));
}

function renderRemoteDone() {
  const token = b64urlJson({ s: R.sid, n: R.name, a: sanitizeAnswers(R.draft) });
  const url = pageUrl("make/") + "#ans=" + token;
  mount(h("div", { class: "wrap narrow app" },
    h("h1", {}, `Thanks, ${R.name}!`),
    h("p", { class: "lead" }, "Now send your answers to the organizer. They open this link on the phone they're using for the family session."),
    h("div", { class: "card stack" },
      h("button", { type: "button", class: "btn big", onclick: async () => { const r = await shareOrCopy({ title: "My answers for our family crest", text: `${R.name}'s answers for our family crest`, url }); if (r === "copied") toast("Link copied. Paste it in a message to the organizer."); } }, "Send my answers"),
      h("input", { type: "text", readonly: true, value: url, "aria-label": "Your answers link", onfocus: (e) => e.target.select() }),
      h("button", { type: "button", class: "linkbtn", onclick: () => { R.done = false; R.q = 0; store.set(RKEY, R); renderRemote(); } }, "Change my answers")),
    h("p", { style: { marginTop: "26px" } }, "Want one for your own household? ", h("a", { href: CFG.base + "make/", onclick: () => store.del(RKEY) }, "Make your own family crest"), ".")));
}

function importAnswers(token) {
  let p;
  try { p = unb64urlJson(token); } catch { p = null; }
  if (!p || typeof p.s !== "string") {
    if (!S) newSession();
    render();
    return toast("That answers link is incomplete.");
  }
  if (!S || S.sid !== p.s) {
    mount(h("div", { class: "wrap narrow app" },
      h("h1", {}, "Open this on the organizer's phone"),
      h("p", {}, `These are ${String(p.n || "someone").slice(0, 24)}'s answers for a family session that was started on a different phone or browser. Open this link on the phone (and browser) that started the session, and the answers will be added.`),
      h("p", {}, h("a", { class: "btn", href: CFG.base + "make/" }, "Go to the session on this device"))));
    return;
  }
  const name = String(p.n || "A relative").slice(0, 24);
  const answers = sanitizeAnswers(p.a);
  const existing = S.members.find((m) => m.remote && m.name === name);
  if (existing) existing.answers = answers;
  else {
    const blank = S.members.findIndex((m) => !m.answers && !m.name.trim());
    const member = { id: "r" + Date.now().toString(36), name, answers, remote: true };
    if (blank >= 0 && S.step === "setup") S.members.splice(blank, 1, member);
    else S.members.push(member);
  }
  if (S.options) S.options = null; // regenerate designs with the new answers
  if (S.step === "edit" || S.step === "results") S.step = "results";
  save();
  track("answers_imported");
  render();
  toast(`Added ${name}'s answers`);
}

// A pasted invite or answers link in an open tab is a same-page navigation; reload to handle it.
addEventListener("hashchange", () => { if (/^#(join|ans)=/.test(location.hash)) location.reload(); });

init();
