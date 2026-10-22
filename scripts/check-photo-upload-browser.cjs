/* eslint-disable @typescript-eslint/no-require-imports -- Isolated component/validator browser fixture, no application server or real uploads. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "build/photo-upload-browser-2026-10-22");
fs.mkdirSync(output, { recursive: true });
const moduleStyles = [];
const originalLoad = Module._load;
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}
require.extensions[".css"] = (module, filename) => {
  const prefix = path.basename(filename).replace(/\W/g, "_") + "__";
  let css = fs.readFileSync(filename, "utf8").replace(/:global\(([^)]+)\)/g, (_, selector) => selector.replace(/\./g, "GLOBALCLASS"));
  css = css.replace(/\.([a-zA-Z_][\w-]*)/g, (_, name) => "." + prefix + name).replace(/GLOBALCLASS/g, ".");
  moduleStyles.push(css);
  module.exports = { __esModule: true, default: new Proxy({}, { get: (_, name) => prefix + String(name) }) };
};
Module._load = function(request, ...args) {
  if (request === "next/image") return ({ src, alt, className, fill }) => React.createElement("img", {
    src, alt, className, style: fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined,
  });
  return originalLoad.call(this, request, ...args);
};
let render;
try {
  const { ProductPhotoEditor } = require("../app/seller/products/[id]/edit/components/ProductPhotoEditor.tsx");
  const noOp = () => {};
  const base = { uploading: false, reordering: false, mediaDisabled: false, dragImageId: null,
    uploadProgress: { done: 0, total: 0 }, onFilesChange: noOp, onUploadImages: noOp,
    onDragImageStart: noOp, onDragImageEnd: noOp, onMoveImage: noOp, onDeleteImage: noOp, onMoveImageByIndex: noOp };
  const images = [1, 2, 3].map(id => ({ id, url: "/photo.svg", sortOrder: id - 1, width: id === 1 ? 600 : 1200, height: id === 1 ? 866 : 1600 }));
  render = () => renderToStaticMarkup(React.createElement(ProductPhotoEditor, { ...base, images, invalidImages: true }));
} finally {
  Module._load = originalLoad;
}
const globalCss = ["tokens", "typography", "buttons", "alerts", "forms"].map(name => fs.readFileSync(path.join(root, `app/styles/${name}.css`), "utf8")).join("\n");
const originalFiles = new Map();
const posts = [];
const browserScript = `
import { validateProductPhotoUpload } from '/productPhotos.js';
const input=document.querySelector('input[type=file]');
document.querySelectorAll('button').forEach(button=>{if(button.textContent.trim()==='Выбрать фото')button.addEventListener('click',()=>input.click());});
input.addEventListener('change',async()=>{
  window.fixtureState={status:'validating'};
  try{
    const file=input.files[0];await validateProductPhotoUpload([file],3);
    const body=new FormData();body.append('file',file);
    const response=await fetch('/fixture-upload',{method:'POST',body});
    if(!response.ok)throw new Error('Mock upload failed');
    window.fixtureState={status:'uploaded',size:file.size,type:file.type};
  }catch(error){window.fixtureState={status:'rejected',message:error.message};}
  finally{input.value='';}
});
window.fixtureReady=true;
`;
const server = http.createServer(async (req, res) => {
  if (req.url === "/photo.svg") {
    res.setHeader("Content-Type", "image/svg+xml");
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="866" viewBox="0 0 600 866"><rect width="600" height="866" fill="white"/><path d="M220 180 130 250 180 360 215 330v340h170V330l35 30 50-110-90-70-40 50h-80z" fill="#c6bba6" stroke="#a79d8c" stroke-width="3"/></svg>');
  }
  if (req.url === "/productPhotos.js" || req.url === "/imageUploadPolicy.js") {
    const file = req.url === "/productPhotos.js" ? "productPhotos" : "imageUploadPolicy";
    const source = fs.readFileSync(path.join(root, `app/lib/${file}.ts`), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replace('"./imageUploadPolicy"', '"/imageUploadPolicy.js"');
    res.setHeader("Content-Type", "text/javascript"); return res.end(compiled);
  }
  if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(browserScript); }
  if (req.url === "/fixture-upload" && req.method === "POST") {
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const request = new Request("http://fixture.invalid/upload", { method: "POST", body: Buffer.concat(chunks), headers: { "content-type": req.headers["content-type"] } });
    const file = (await request.formData()).get("file");
    const bytes = Buffer.from(await file.arrayBuffer());
    assert.deepEqual(bytes, originalFiles.get(file.name), "The original browser-selected bytes reach multipart unchanged");
    posts.push({ name: file.name, size: file.size, type: file.type });
    return res.end("ok");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${globalCss}\n${moduleStyles.join("\n")}\n*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:var(--black);line-height:1.5}main{width:min(560px,calc(100% - 32px));margin:24px auto}button,input,select{font-family:inherit}svg{max-width:100%;flex-shrink:0}p{margin:0}h2{margin:0}.fieldError{color:var(--danger)}</style></head><body><main>${render()}</main><script type="module" src="/fixture.js"></script></body></html>`);
});

async function main() {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    for (const width of [1280,390,320]) {
      await page.setViewportSize({ width, height: width < 700 ? 1000 : 1200 });
      await page.goto(origin);await page.waitForFunction(()=>window.fixtureReady);
      const editor=page.locator("#product-photos");
      assert.match(await editor.innerText(),/до 10 МБ/);
      assert.match(await editor.innerText(),/Фото с низким разрешением/);
      assert.doesNotMatch(await editor.innerText(),/от 1200 px|не менее 1200|до 8 МБ|Перед модерацией замените/);
      assert.equal(await editor.locator(".fieldError").count(),0,"Small photos do not block moderation");
      const accept=await editor.locator("input[type=file]").getAttribute("accept");
      for(const mime of ["image/jpeg","image/png","image/webp"])assert(accept.includes(mime));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`No horizontal overflow at ${width}`);
      await page.screenshot({path:path.join(output,`photo-editor-${width}.png`),fullPage:true});
    }
    for (const [type,name] of [["image/png","four-k.png"],["image/jpeg","four-k.jpg"],["image/webp","four-k.webp"]]) {
      const data=await page.evaluate(type=>{const canvas=document.createElement("canvas");canvas.width=4096;canvas.height=4096;const ctx=canvas.getContext("2d");ctx.fillStyle="#c6bba6";ctx.fillRect(0,0,4096,4096);return canvas.toDataURL(type,0.8);},type);
      const bytes=Buffer.alloc(10*1024*1024);Buffer.from(data.split(",")[1],"base64").copy(bytes);originalFiles.set(name,bytes);
      const chooserPromise=page.waitForEvent("filechooser");await page.getByRole("button",{name:"Выбрать фото",exact:true}).click();
      await (await chooserPromise).setFiles({name,mimeType:type,buffer:bytes});
      await page.waitForFunction(()=>window.fixtureState?.status!=="validating");
      assert.deepEqual(await page.evaluate(()=>window.fixtureState),{status:"uploaded",size:10*1024*1024,type});
    }
    const before=posts.length;
    const chooserPromise=page.waitForEvent("filechooser");await page.getByRole("button",{name:"Выбрать фото",exact:true}).click();
    await (await chooserPromise).setFiles({name:"oversize.png",mimeType:"image/png",buffer:Buffer.alloc(10*1024*1024+1)});
    await page.waitForFunction(()=>window.fixtureState?.status!=="validating");
    assert.match((await page.evaluate(()=>window.fixtureState)).message,/10 МБ/);
    assert.equal(posts.length,before,"Oversized photo never reaches the mock POST");
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,"result.json"),JSON.stringify({passed:true,scope:"SSR ProductPhotoEditor with real CSS; input harness uses real browser validator, not full editor integration",widths:[1280,390,320],posts,oversizeRejectedBeforePost:true,browserErrors:errors},null,2));
    console.log("PASS: static ProductPhotoEditor CSS fits 1280/390/320; low-resolution warning has no blocking error; JPEG/PNG/WebP accept and 10 MiB text; real browser file chooser and shared validator accept 4096x4096 JPEG/PNG/WebP at exact 10 MiB with unchanged multipart bytes; +1 byte causes no POST; no Next/dev/backend server used");
  } finally {
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
