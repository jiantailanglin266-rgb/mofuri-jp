// REALPORT ローカルプレビューサーバー（SPAフォールバック付き）: node tools/serve.mjs [port]
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = +(process.argv[2] || 3210);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  let f = join(ROOT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!existsSync(f)) f = join(ROOT, "index.html"); // SPAフォールバック（本番404.html相当）
  const ext = extname(f);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(readFileSync(f));
}).listen(PORT, () => console.log("REALPORT preview: http://localhost:" + PORT));
