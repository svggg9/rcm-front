import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
function config(mode, optIn) {
  const context = { module: { exports: {} }, process: { env: { NODE_ENV: mode, RCM_LOCAL_CATALOG_IMAGES: optIn } } };
  vm.runInNewContext(source, context);
  return context.module.exports.images;
}
for (const [mode, flag] of [["production", "true"], ["test", "true"], ["development", "false"], ["development", undefined]]) {
  const images = config(mode, flag);
  assert.equal(images.dangerouslyAllowLocalIP, false);
  assert.equal(images.remotePatterns.some((pattern) => pattern.protocol === "http"), false);
}
const images = config("development", "true");
assert.equal(images.dangerouslyAllowLocalIP, true);
const local = images.remotePatterns.filter((pattern) => pattern.protocol === "http");
assert.deepEqual(Array.from(local, (pattern) => pattern.pathname).sort(), [
  "/rcm-windows-local/brands/**", "/rcm-windows-local/catalog-v1/**",
  "/rcm-windows-local/products/**", "/rcm-windows-local/storefront/**",
]);
for (const pattern of local) {
  assert.equal(pattern.hostname, "127.0.0.1");
  assert.equal(pattern.port, "9000");
  assert.equal(pattern.search, "");
}
console.log("Local image config: development opt-in, fixed origin/bucket/namespaces; production excludes local IP.");
