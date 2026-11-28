import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] || "dist/web");
const port = Number(process.argv[3] || process.env.PORT || 4173);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".wasm", "application/wasm"],
  [".onnx", "application/octet-stream"],
  [".ico", "image/x-icon"],
]);

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  const pathname = decodeURIComponent(
    url.pathname === "/" ? "/index.html" : url.pathname,
  );
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "content-type":
        types.get(path.extname(filePath).toLowerCase()) ||
        "application/octet-stream",
      "cache-control": "no-cache",
    });
    response.end(data);
  });
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}/`);
});
