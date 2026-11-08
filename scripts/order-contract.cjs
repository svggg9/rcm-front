/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS CLI syncs and validates generated order types. */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const local = path.join(root, "contracts/order-api.openapi.json");
const supplied = process.argv.find(arg => arg.startsWith("--source="))?.slice(9);
const upstream = path.resolve(root, supplied || "../../rcm/contracts/order-api.openapi.json");
const check = process.argv.includes("--check");
if (!check) {
  if (!fs.existsSync(upstream)) throw new Error("Backend schema missing: run gradlew.bat exportOrderOpenApi and pass --source=<path> if needed");
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.copyFileSync(upstream, local);
} else if (fs.existsSync(upstream) && fs.readFileSync(local, "utf8") !== fs.readFileSync(upstream, "utf8")) {
  throw new Error("Backend order schema changed. Run npm run contract:sync");
}
const cli = path.join(root, "node_modules/openapi-typescript/bin/cli.js");
const args = [cli, local, "-o", "app/lib/generated/order-api.ts", ...(check ? ["--check"] : [])];
const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
