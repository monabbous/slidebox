import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function startServer({ port = 0, host = "127.0.0.1", css, assets = {} } = {}) {
  const files = {
    "/": [new URL("lab.html", import.meta.url), "text/html"],
    "/lab.html": [new URL("lab.html", import.meta.url), "text/html"],
    "/lab.css": [new URL("lab.css", import.meta.url), "text/css"],
    "/lab.mjs": [new URL("lab.mjs", import.meta.url), "text/javascript"],
    "/metrics.mjs": [new URL("metrics.mjs", import.meta.url), "text/javascript"],
    "/slidebox.css": [new URL("../dist/css/slidebox.css", import.meta.url), "text/css"],
  };
  // Freeze inputs for a run so an editor/build cannot change later trials.
  const snapshots = new Map(await Promise.all(Object.entries(files).map(async ([path, [url, type]]) => {
    const name = fileURLToPath(url).split(/[\\/]/).at(-1);
    const data = path === "/slidebox.css" && css ? css : assets[name] ?? await readFile(url);
    return [path, { data: Buffer.from(data), type }];
  })));
  const server = createServer(async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let path;
    try { path = new URL(request.url, "http://localhost").pathname; }
    catch { response.writeHead(400).end(); return; }
    const file = snapshots.get(path);
    if (!file) { response.writeHead(404).end("Not found"); return; }
    response.writeHead(200, { "Content-Type": file.type + "; charset=utf-8", "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : file.data);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return {
    url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${address.port}`,
    port: address.port,
    close: () => new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    }),
  };
}
