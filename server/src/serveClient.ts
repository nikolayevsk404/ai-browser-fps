import { createReadStream, existsSync, statSync } from "node:fs";
import { access } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(serverDir, "../../client/dist");

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

export async function clientDistAvailable(): Promise<boolean> {
  try {
    await access(path.join(clientDistDir, "index.html"));
    return true;
  } catch {
    return false;
  }
}

export function tryServeClient(
  request: http.IncomingMessage,
  response: http.ServerResponse
): boolean {
  if (!existsSync(clientDistDir)) {
    return false;
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/health") || pathname.startsWith("/api")) {
    return false;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(clientDistDir, relativePath);

  if (!filePath.startsWith(clientDistDir)) {
    response.writeHead(403, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "forbidden" }));
    return true;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    serveFile(filePath, response);
    return true;
  }

  const indexPath = path.join(clientDistDir, "index.html");
  if (existsSync(indexPath)) {
    serveFile(indexPath, response);
    return true;
  }

  return false;
}

function serveFile(filePath: string, response: http.ServerResponse): void {
  const extension = path.extname(filePath);
  const contentType = mimeTypes[extension] ?? "application/octet-stream";

  response.writeHead(200, { "content-type": contentType });
  createReadStream(filePath).pipe(response);
}
