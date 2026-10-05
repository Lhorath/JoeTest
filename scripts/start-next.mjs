import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const app = process.argv[2];
const defaults = { web: "3000", host: "3001", admin: "3002" };
if (!defaults[app]) {
  console.error("Usage: node scripts/start-next.mjs <web|host|admin>");
  process.exit(1);
}

const port = process.env.PORT || defaults[app];
const cwd = path.resolve("apps", app);
const require = createRequire(path.join(cwd, "package.json"));
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", String(port)], {
  cwd,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
