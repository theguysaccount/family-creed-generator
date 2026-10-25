// Serve dist/ the way GitHub Pages does: under the repository path, with 404.html for misses.
//   node scripts/serve.mjs [port] [basePath]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2] || process.env.PORT || 4321);
const base = (process.argv[3] || process.env.FCG_BASE_PATH || "/family-creed-generator/").replace(/\/?$/, "/");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", process.env.FCG_OUT || "dist");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".pdf": "application/pdf" };

export function createServer(basePath = base) {
  const base = basePath.replace(/\/?$/, "/");
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (base !== "/" && (url.pathname === "/" || !url.pathname.startsWith(base))) { res.writeHead(302, { location: base }); return res.end(); }
    let rel = decodeURIComponent(url.pathname.slice(base.length));
    let file = path.join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith("/")) { res.writeHead(301, { location: url.pathname + "/" + url.search }); return res.end(); }
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "content-type": types[".html"] });
      return res.end(fs.existsSync(path.join(root, "404.html")) ? fs.readFileSync(path.join(root, "404.html")) : "not found");
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(port, "127.0.0.1", () => console.log(`serving dist/ at http://127.0.0.1:${port}${base}`));
}
