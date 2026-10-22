/* eslint-disable @typescript-eslint/no-require-imports -- Isolated API contract regression without network or database writes. */
const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
function load(file,imports={}){const testModule={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,"utf8"),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function("module","exports","require",code )(testModule,testModule.exports,name=>imports[name]);return testModule.exports;}
async function run(){
  const jsx = require("react/jsx-runtime"), { renderToStaticMarkup } = require("react-dom/server");
  const { EmptyState } = load("app/components/ui/EmptyState.tsx", {
    "react/jsx-runtime": jsx, "./Icon": { Icon: ({ name }) => jsx.jsx("svg", { "data-icon": name }) },
  });
  const { Button } = load("app/components/ui/Button.tsx", { "react/jsx-runtime": jsx, "./Button.module.css": { default: {} } });
  const { RequestError } = load("app/components/ui/RequestError.tsx", {
    "react/jsx-runtime": jsx, "./Button": { Button }, "./EmptyState": { EmptyState },
    "./Icon": { Icon: () => jsx.jsx("svg", {}) }, "./RequestError.module.css": { default: {} },
  });
  let brands = [];
  const { AccountBrandsTab } = load("app/account/components/AccountBrandsTab.tsx", {
    "react/jsx-runtime": jsx, "next/image": { default: () => null },
    "next/link": { default: ({ href, className, children }) => jsx.jsx("a", { href, className, children }) },
    "@/app/components/ui/toast": { toast: { error() {} } },
    "./AccountSkeleton": { AccountSkeleton: () => jsx.jsx("div", { role: "status" }) },
    "../../components/ui/EmptyState": { EmptyState },
    "../../components/ui/LikeButton": { LikeButton: props => jsx.jsx("button", { "aria-label": props["aria-label"] }) },
    "../../components/ui/RequestError": { RequestError },
    "../../lib/favoriteBrands": { useFavoriteBrands: () => ({ brands, loading: false, hasLoaded: true, error: null, pendingIds: [], reload() {}, toggle() {} }) },
    "./AccountBrandsTab.module.css": { default: {} },
  });
  const emptyBrands = renderToStaticMarkup(jsx.jsx(AccountBrandsTab, {}));
  assert(!/>0</.test(emptyBrands), "An empty brand list must not display a bare zero counter");
  assert(!emptyBrands.includes("<svg"), "An empty list has no decorative icon");
  assert(emptyBrands.includes('href="/catalog"'));
  brands = [{ id: 7, slug: "fixture", name: "Тестовый бренд", images: [] }];
  const savedBrands = renderToStaticMarkup(jsx.jsx(AccountBrandsTab, {}));
  assert(savedBrands.includes('href="/brand/fixture"')); assert(!savedBrands.includes("emptyStateLarge"));
  const failed = renderToStaticMarkup(jsx.jsx(EmptyState, { title: "Не удалось загрузить", tone: "danger", icon: "alert",
    actions: jsx.jsx("button", { children: "Повторить" }) }));
  assert(failed.includes('data-icon="alert"')); assert(failed.includes("Повторить"));
  const presentation=load("app/account/lib/presentation.ts");
  assert.equal(presentation.orderNumber({id:629}),"629");
  assert.equal(load("app/seller/components/SellerOrderCard.tsx").formatOrderCode({id:629,orderGroupId:"group"}),"629");
  assert.equal(presentation.itemCount(1),"1 товар");assert.equal(presentation.itemCount(11),"11 товаров");assert.equal(presentation.itemCount(22),"22 товара");
  assert.equal(presentation.shortDeliveryAddress("191040, Россия, Санкт-Петербург, Санкт-Петербург, ул. Тестовая, 1"),"Санкт-Петербург, ул. Тестовая, 1");
  assert.equal(await presentation.accountApiError(Response.json({message:"SQL private stack",path:"/api/private"},{status:500}),"Безопасная ошибка"),"Безопасная ошибка");
  assert.equal(await presentation.accountApiError(new Response("<html>upstream</html>",{status:502}),"Безопасная ошибка"),"Безопасная ошибка");
  let mode="success";const calls=[];
  const api=load("app/lib/returns.ts",{
    "./api":{API_URL:"",apiFetch:async(url,options)=>{calls.push({url,options});if(mode==="network")throw new TypeError("Private network details");if(mode!=="success")return Response.json({message:"SQL private detail"},{status:Number(mode)});return Response.json({id:1,photoUrls:[]});}},
    "./returnPhotoUrls":{resolveReturnPhotoUrl:value=>value},
    "../account/lib/presentation":presentation,
  });
  const input={orderId:701,productId:407,variantId:901,quantity:1,reason:"DEFECT",comment:" test ",photos:[new File(["test"],"test.png",{type:"image/png"})],requestKey:"00000000-0000-0000-0000-000000000001"};
  await api.createOrderReturn(input);await api.createOrderReturn(input);
  for(const call of calls){assert.equal(call.options.body.get("quantity"),"1");assert.equal(call.options.body.get("requestKey"),input.requestKey);assert.equal(call.options.body.get("comment"),"test");}
  for(const [status,unknown] of [["400",false],["500",true],["network",true]]){mode=status;await assert.rejects(()=>api.createOrderReturn(input),error=>error instanceof api.ReturnSubmitError&&error.resultUnknown===unknown&&!error.message.includes("private"));}
  console.log("Account: numeric identity, readable address, safe API errors, return quantity/key and known rejection vs unknown result passed");
  console.log("Empty states: no zero counter or decorative icon, catalogue action, populated brands and error retry preserved");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
