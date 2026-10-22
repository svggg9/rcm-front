/* eslint-disable @typescript-eslint/no-require-imports -- Standalone TS regression runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { validProductPhotoCount, validateProductPhotoUpload, hasLowResolutionPhoto } = require("../app/lib/productPhotos.ts");
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
  for (const type of ["image/jpeg", "image/png", "image/webp"]) await validateProductPhotoUpload([file(type, 10 * 1024 * 1024)], 9);
  await validateProductPhotoUpload([file()], 0); // Incomplete draft is allowed.
  await assert.rejects(validateProductPhotoUpload([file()], 10), /10 фото/);
  await assert.rejects(validateProductPhotoUpload([file("image/svg+xml")], 0), /JPEG/);
  await assert.rejects(validateProductPhotoUpload([file("image/png", 0)], 0), /непустую/);
  await assert.rejects(validateProductPhotoUpload([file("image/png", 10 * 1024 * 1024 + 1)], 0), /10 МБ/);
  dimensions = [3840, 2160];
  await validateProductPhotoUpload([file("image/jpeg", 10 * 1024 * 1024)], 0);
  dimensions = [7680, 4320];
  await validateProductPhotoUpload([file("image/png")], 0);
  dimensions = [8000, 6000];
  await validateProductPhotoUpload([file("image/webp")], 0);
  dimensions = [8001, 6000];
  await assert.rejects(validateProductPhotoUpload([file()], 0), /48 мегапикселей/);
  dimensions = [16385, 1];
  await assert.rejects(validateProductPhotoUpload([file()], 0), /16384/);
  dimensions = [0, 100];
  await assert.rejects(validateProductPhotoUpload([file()], 0), /размер/);
  dimensions = [1600, 1199];
  await validateProductPhotoUpload([file()], 0);
  dimensions = [600, 866];
  await validateProductPhotoUpload([file("image/webp")], 0);
  assert.equal(hasLowResolutionPhoto({width: 600, height: 866}), true);
  assert.equal(hasLowResolutionPhoto({width: 1600, height: 1199}), true);
  assert.equal(hasLowResolutionPhoto({width: 1200, height: 1600}), false);
  assert.equal(hasLowResolutionPhoto({width: null, height: null}), false);
  broken = true;
  await assert.rejects(validateProductPhotoUpload([file()], 0), /прочитать/);
  assert.equal(allocated, revoked, "Object URLs must be released on success and error");
  console.log("PASS: product photo10MiB boundaries,4K/8K/small input, technical pixel budget and object URL cleanup");
})().catch(error => { console.error(error); process.exitCode = 1; });
