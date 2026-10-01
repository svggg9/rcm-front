/* eslint-disable @typescript-eslint/no-require-imports -- Standalone TS regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { validProductPhotoCount, validateProductPhotoUpload } = require("../app/lib/productPhotos.ts");
let dimensions = [1200, 1600];
let broken = false;
let allocated = 0;
let revoked = 0;
global.window = { Image: class {
  get naturalWidth() { return dimensions[0]; }
  get naturalHeight() { return dimensions[1]; }
  set src(_value) { queueMicrotask(() => broken ? this.onerror() : this.onload()); }
} };
URL.createObjectURL = () => { allocated++; return "blob:test"; };
URL.revokeObjectURL = () => revoked++;
const file = (type = "image/jpeg", size = 100) => ({ type, size });
(async () => {
  for (const count of [0, 1, 2, 11]) assert.equal(validProductPhotoCount(count), false);
  for (const count of [3, 5, 10]) assert.equal(validProductPhotoCount(count), true);
  for (const type of ["image/jpeg", "image/png", "image/webp"]) await validateProductPhotoUpload([file(type, 8 * 1024 * 1024)], 9);
  await validateProductPhotoUpload([file()], 0); // Incomplete draft is allowed.
  await assert.rejects(validateProductPhotoUpload([file()], 10), /10 фото/);
  await assert.rejects(validateProductPhotoUpload([file("image/svg+xml")], 0), /JPEG/);
  await assert.rejects(validateProductPhotoUpload([file("image/png", 0)], 0), /8 МБ/);
  await assert.rejects(validateProductPhotoUpload([file("image/png", 8 * 1024 * 1024 + 1)], 0), /8 МБ/);
  dimensions = [1600, 1199];
  await assert.rejects(validateProductPhotoUpload([file()], 0), /1200/);
  broken = true;
  await assert.rejects(validateProductPhotoUpload([file()], 0), /прочитать/);
  assert.equal(allocated, revoked, "Object URLs must be released on success and error");
  console.log("Product photo validation checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
