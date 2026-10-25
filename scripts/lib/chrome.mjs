// Drive headless Chrome over the DevTools protocol, with no dependencies (Node 22+ has WebSocket).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium-browser", "/usr/bin/chromium",
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("Chrome not found; set CHROME=/path/to/chrome");
  return found;
}

export async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "fcg-chrome-"));
  const args = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"];
  if (process.env.CI || process.getuid?.() === 0) args.unshift("--no-sandbox");
  const proc = spawn(chromePath(), args, { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const t = setTimeout(() => reject(new Error("Chrome did not start: " + buf.slice(-400))), 30000);
    proc.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); resolve(m[1]); } });
    proc.on("exit", () => reject(new Error("Chrome exited: " + buf.slice(-400))));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r, { once: true }); ws.addEventListener("error", j, { once: true }); });
  let seq = 0;
  const waiting = new Map();
  const listeners = new Set();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(typeof e.data === "string" ? e.data : e.data.toString());
    if (m.id && waiting.has(m.id)) {
      const { resolve, reject } = waiting.get(m.id);
      waiting.delete(m.id);
      if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
    } else for (const l of listeners) l(m);
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  async function newPage({ width = 1280, height = 900, mobile = false, scale = 1 } = {}) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const console = [];
    const errors = [];
    on((m) => {
      if (m.sessionId !== sessionId) return;
      if (m.method === "Runtime.consoleAPICalled") console.push({ type: m.params.type, text: m.params.args.map((a) => a.value ?? a.description ?? "").join(" ") });
      if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "exception");
      if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push(`${m.params.entry.text} ${m.params.entry.url || ""}`.trim());
    });
    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    await send("Log.enable", {}, sessionId);
    const page = {
      sessionId, console, errors,
      send: (method, params) => send(method, params, sessionId),
      async viewport(w, h, isMobile = false, dsf = 1) {
        await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dsf, mobile: isMobile }, sessionId);
        if (isMobile) await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" }, sessionId);
      },
      async goto(url, settleMs = 300) {
        const loaded = new Promise((resolve) => {
          const off = on((m) => { if (m.sessionId === sessionId && m.method === "Page.loadEventFired") { off(); resolve(); } });
        });
        await send("Page.navigate", { url }, sessionId);
        await Promise.race([loaded, new Promise((r) => setTimeout(r, 20000))]);
        if (settleMs) await new Promise((r) => setTimeout(r, settleMs));
      },
      async eval(expression, awaitPromise = true) {
        const r = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true }, sessionId);
        if (r.exceptionDetails) throw new Error("eval failed: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
        return r.result.value;
      },
      async waitFor(expression, timeout = 15000) {
        const t0 = Date.now();
        while (Date.now() - t0 < timeout) {
          if (await page.eval(`!!(${expression})`)) return true;
          await new Promise((r) => setTimeout(r, 100));
        }
        throw new Error("timed out waiting for " + expression);
      },
      async screenshot(file, opts = {}) {
        const format = opts.format || (file.endsWith(".jpg") ? "jpeg" : "png");
        const { data } = await send("Page.captureScreenshot", { format, ...(format === "jpeg" ? { quality: opts.quality || 86 } : {}), captureBeyondViewport: !!opts.fullPage, ...(opts.clip ? { clip: { ...opts.clip, scale: 1 } } : {}) }, sessionId);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(data, "base64"));
      },
      async close() { await send("Target.closeTarget", { targetId }); },
    };
    await page.viewport(width, height, mobile, scale);
    return page;
  }

  async function close() {
    try { ws.close(); } catch { /* ignore */ }
    const exited = new Promise((r) => proc.once("exit", r));
    proc.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  return { send, newPage, close };
}
