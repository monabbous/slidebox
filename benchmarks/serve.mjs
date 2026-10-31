import { startServer } from "./server.mjs";

const args = process.argv.slice(2);
let host = "127.0.0.1", port = 4176;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--host") host = args[++i];
  else if (args[i] === "--port") {
    const value = args[++i];
    if (!/^\d+$/.test(value ?? "") || Number(value) < 1 || Number(value) > 65535) throw new Error("Invalid port");
    port = Number(value);
  } else throw new Error(`Unknown option: ${args[i]}`);
}
if (!["127.0.0.1", "0.0.0.0"].includes(host)) throw new Error("Host must be 127.0.0.1 or 0.0.0.0");
const server = await startServer({ host, port });
console.log(`Technique lab: ${server.url} (bound to ${host}:${server.port})`);
console.log("Manual inspection only. Use npm run benchmark for measured results.");
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, async () => { await server.close(); });
