/* eslint-disable @typescript-eslint/no-require-imports -- Runs handlers with mocked APIs only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('app/seller/products/[id]/edit/ProductEditPageClient.tsx', 'utf8');
const ast = ts.createSourceFile('editor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['saveProduct', 'publishProduct'].includes(node.name?.text)) functions.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const code = ts.transpileModule(functions.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
function setup({ valid = false, dirty = true, failSave = false, stale = false } = {}) {
  const calls = []; let validationCalls = 0;
  const noop = () => {};
  const context = {
    saving: false, publishing: false, archiving: false, deleting: false, uploading: false, reordering: false, mediaActionPending: false,
    saveRequestRef: {current:false}, publishRequestRef: {current:false}, editRevisionRef: {current:0}, publishSuccessReturnFocusRef: {},
    dirty, product: {status:'DRAFT'}, productId: 7, API_URL: '', title:'', description:'', composition:'', categoryId:'', brandId:1,
    suggestedCategoryName:'', audience:'UNISEX', packageWidthCm:'', packageHeightCm:'', packageLengthCm:'', packageWeightKg:'',
    canEditProductOperations: () => true, isProductStatusPublishable: () => true,
    setValidationErrors: noop, setSaveSucceeded: noop, setSaving: noop, setDirty: noop, setPublishing: noop,
    setPublishSucceeded: noop, setPublishSuccessOpen: noop, setProduct: noop,
    window: {setTimeout:noop}, document:{activeElement:null}, HTMLElement: class {},
    toast:{error:noop, info:noop, success:noop}, failValidation:noop, scrollToFirstValidationError:noop,
    validateProduct: () => { validationCalls++; return {valid}; }, isSellerReadyForPublish: () => true,
    resolveVariantsForSave: async () => [], reloadProductState: async () => !stale, numberOrNull: x => x === '' ? null : Number(x),
    apiFetch: async (url, options) => { calls.push({url,...options}); return {ok:!(failSave && options.method === 'PUT'), status:400, text:async()=> 'Save failed'}; },
  };
  const handlers = new Function(...Object.keys(context), code + '\nreturn {saveProduct,publishProduct};')(...Object.values(context));
  return {...handlers,calls,validationCalls:()=>validationCalls};
}
(async () => {
  let test = setup();
  assert.equal(await test.saveProduct(), true);
  assert.equal(test.validationCalls(), 0);
  assert.equal(JSON.parse(test.calls[0].body).title, '');
  assert.equal(JSON.parse(test.calls[0].body).packageWidthCm, null);
  test = setup(); await test.publishProduct();
  assert.equal(test.validationCalls(), 1); assert.equal(test.calls.length, 0);
  test = setup({valid:true}); await Promise.all([test.publishProduct(),test.publishProduct()]);
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT','POST']);
  test = setup({valid:true,failSave:true}); await test.publishProduct();
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT']);
  test = setup({valid:true,stale:true}); await test.publishProduct();
  assert.deepEqual(test.calls.map(c=>c.method), ['PUT']);
  test = setup({valid:true,dirty:false}); await test.publishProduct();
  assert.deepEqual(test.calls.map(c=>c.method), ['POST']);
  test = setup(); await Promise.all([test.saveProduct(),test.saveProduct()]);
  assert.equal(test.calls.length, 1);
  console.log('PASS: incomplete save, moderation validation, save-before-publish, failure/stale guards and duplicate protection');
})().catch(error => { console.error(error); process.exitCode = 1; });
