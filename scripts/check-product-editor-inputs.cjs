/* eslint-disable @typescript-eslint/no-require-imports -- Regression checks for editor input and text persistence. */
const fs=require('node:fs');
const ts=require('typescript');
const assert=require('node:assert/strict');
function read(path){const mod={exports:{}};new Function('require','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(require,mod.exports);return mod.exports;}
const {parseVariantNumber}=read('app/seller/products/[id]/edit/components/VariantNumberInput.tsx');
for(const [value,expected] of [['1999,90',1999.9],['1 999.90',1999.9],['0',0],['',null]])assert.equal(parseVariantNumber(value),expected);
for(const value of ['-1','1e3','12,345','12.3.4','text'])assert.ok(Number.isNaN(parseVariantNumber(value)));
assert.ok(Number.isNaN(parseVariantNumber('1.5',true)));assert.equal(parseVariantNumber('0',true),0);
const {parseDescription,serializeDescription,hasDescriptionContent}=read('app/lib/productDescription.ts');
assert.equal(serializeDescription([{type:'square',items:['','Хлопок','  ']}]),'▪ Хлопок');
assert.equal(hasDescriptionContent('▪ '),false);assert.equal(hasDescriptionContent('▪ Хлопок'),true);
const content='Строка 1\nСтрока 2\n\n▪ Хлопок\n▪ Карманы';assert.equal(serializeDescription(parseDescription(content)),content);
for(const content of ['• Один\n• Два','1. Один\n2. Два','— Один\n— Два'])assert.equal(serializeDescription(parseDescription(content)),content);
console.log('PASS: prices with kopecks, invalid/negative input, zero/untracked stock, empty lists, newlines and legacy list persistence');
