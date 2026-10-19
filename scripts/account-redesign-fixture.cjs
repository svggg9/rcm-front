/* eslint-disable @typescript-eslint/no-require-imports -- Disposable local account fixture without a real database or payment provider. */
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),{spawn}=require("node:child_process");
const origin="http://127.0.0.1:13046",api="http://127.0.0.1:19646";
const directory=path.resolve("build/account-redesign");fs.mkdirSync(directory,{recursive:true});
const calls=[],returns=[],saved=new Map();
const readDelay=Math.min(30000,Math.max(0,Number(process.env.RCM_FIXTURE_ACCOUNT_DELAY_MS)||0));
const image="https://storage.yandexcloud.net/rcm/products/rcm-demo-20260908/demo-watch-saturn/1-1-98a277ac110647e9.webp";
const profile={id:1,username:"fixture@example.test",email:"fixture@example.test",emailVerified:true,firstName:"Тест",lastName:"Покупатель",phone:"+79990000000",sellerApproved:false};
let emailChangeProof="", emailChangeTarget="";
const lines=[{productId:407,variantId:901,sellerId:1,sku:"fixture-a",productTitle:"Часы Mission to Saturn",brandName:"Swatch × Omega",size:"42",color:"Бежевый",imageUrl:image,quantity:3,price:15900,lineTotal:47700},{productId:408,variantId:902,sellerId:1,sku:"fixture-b",productTitle:"Термокружка",brandName:"Stanley",size:"",color:"Бежевый",imageUrl:image,quantity:1,price:2000,lineTotal:2000}];
const delivered={id:701,orderGroupId:"fixture-delivered",status:"COMPLETED",paymentStatus:"PAID",deliveryStatus:"DELIVERED",paymentMethod:"CARD",createdAt:new Date().toISOString(),paidAt:new Date().toISOString(),returnAvailableUntil:new Date(Date.now()+86400000).toISOString(),subtotalAmount:49700,deliveryAmount:300,discountAmount:0,totalAmount:50000,currency:"RUB",recipientName:"Тест Покупатель",recipientPhone:"+79990000000",deliveryAddress:"Россия, Санкт-Петербург, Санкт-Петербург, Тестовая, 1",deliveryMethod:"PICKUP_POINT",cancellationAllowed:false,items:lines,delivery:null};
const pending={...delivered,id:702,orderGroupId:"fixture-pending",status:"NEW",paymentStatus:"PENDING",deliveryStatus:"PENDING",items:[lines[1]],subtotalAmount:2000,deliveryAmount:100,totalAmount:2100,paymentDueAt:new Date(Date.now()+15*60000).toISOString(),paymentAllowed:true,cancellationAllowed:true};
const sibling={...pending,id:703,items:[{...lines[0],quantity:1,lineTotal:15900}],subtotalAmount:15900,deliveryAmount:200,totalAmount:16100};
function list(orders){return {content:orders.map(order=>({...order,firstProductTitle:order.items[0].productTitle,firstImageUrl:image,imageUrls:[image],itemsCount:order.items.reduce((sum,item)=>sum+item.quantity,0)})),number:0,totalPages:1,totalElements:orders.length,size:20};}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,api);
  res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Access-Control-Allow-Credentials","true");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method==="OPTIONS")return res.end();
  function reply(data,status=200){res.statusCode=status;res.end(JSON.stringify(data));}
  let raw=Buffer.alloc(0);for await(const chunk of req)raw=Buffer.concat([raw,chunk]);
  const multipart=(req.headers["content-type"]||"").includes("multipart/form-data");
  const body=multipart?await new Request(api,{method:"POST",headers:{"Content-Type":req.headers["content-type"]},body:raw}).formData():raw.length?JSON.parse(raw.toString()):{};
  const logged={method:req.method,path:url.pathname};if(multipart){logged.quantity=Number(body.get("quantity"));logged.key=body.get("requestKey");logged.productId=Number(body.get("productId"));}calls.push(logged);fs.writeFileSync(path.join(directory,"fixture-calls.json"),JSON.stringify(calls,null,2));
  if(readDelay&&req.method==="GET"&&(url.pathname==="/api/profile"||url.pathname==="/api/orders/my/list"||/^\/api\/orders\/\d+$/.test(url.pathname)||url.pathname==="/api/returns/my/list"||url.pathname==="/api/favorites"||url.pathname.includes("favorite-brands")))await new Promise(resolve=>setTimeout(resolve,readDelay));
  if(url.pathname==="/api/auth/session")return reply({id:1,username:profile.username,role:"USER"});
  if(url.pathname==="/api/profile"){
    if(req.method==="PUT")for(const field of ["firstName","lastName","phone","birthDate","gender"])if(Object.hasOwn(body,field))profile[field]=body[field];
    return reply(profile);
  }
  if(url.pathname.startsWith("/api/profile/email-change/")){
    const action=url.pathname.slice("/api/profile/email-change/".length);
    if(action==="start"){emailChangeProof="";emailChangeTarget="";return reply({ttlSeconds:600,resendAfterSeconds:60},202);}
    if(action==="confirm-current"){if(body.code!=="000000")return reply({message:"invalid_or_expired_change_code"},400);emailChangeProof="fixture-proof";return reply({changeToken:emailChangeProof,ttlSeconds:600});}
    if(body.changeToken!==emailChangeProof||!emailChangeProof)return reply({message:"invalid_or_expired_change_code"},400);
    if(action==="new/start"){if(body.email===profile.email)return reply({message:"same_email"},400);emailChangeTarget=body.email;return reply({ttlSeconds:600,resendAfterSeconds:60},202);}
    if(action==="complete"){if(body.code!=="000000"||body.email!==emailChangeTarget)return reply({message:"invalid_or_expired_change_code"},400);profile.email=emailChangeTarget;profile.emailVerified=true;emailChangeProof="";return reply({email:profile.email,emailVerified:true});}
  }
  if(url.pathname==="/api/orders/my/list")return reply(list(url.searchParams.has("deliveryStatus")?[delivered]:[pending,sibling,delivered]));
  if(url.pathname==="/api/returns/my/list")return reply({content:returns,totalElements:returns.length,totalPages:1,number:0,size:20});
  if(url.pathname==="/api/orders/701/returns"&&req.method==="POST"){
    const key=body.get("requestKey");
    if(saved.has(key))return reply(saved.get(key));
    const productId=Number(body.get("productId")),quantity=Number(body.get("quantity")),line=lines.find(item=>item.productId===productId);
    const returned={id:900+returns.length,orderId:701,productId,variantId:line.variantId,productTitle:line.productTitle,quantity,reason:body.get("reason"),comment:body.get("comment"),photoUrls:[],status:"REQUESTED",requestedAmount:line.price*quantity,approvedRefundAmount:null,imageUrl:image,requestKey:key,createdAt:new Date().toISOString()};
    returns.push(returned);saved.set(key,returned);
    // First response is lost after the durable fixture write.
    return reply(productId===407&&returns.length===1?{message:"private SQL fixture detail"}:returned,productId===407&&returns.length===1?500:200);
  }
  if(/^\/api\/orders\/\d+\/returns$/.test(url.pathname))return reply(url.pathname.includes("/701/")?returns:[]);
  if(url.pathname.endsWith("/group"))return reply(url.pathname.includes("/701/")?[delivered]:[pending,sibling]);
  if(/^\/api\/orders\/\d+$/.test(url.pathname))return reply(url.pathname.endsWith("/701")?delivered:url.pathname.endsWith("/702")?pending:sibling);
  if(url.pathname.includes("group-last"))return reply({},404);
  if(url.pathname==="/api/payments/group/fixture-pending")return reply({message:"private provider exception"},502);
  if(url.pathname==="/__fixture/calls")return reply(calls);
  if(url.pathname==="/api/cart/me")return reply([]);
  if(url.pathname==="/api/favorites"||url.pathname.includes("favorite-brands"))return reply([]);
  if(url.pathname.includes("storefront/home"))return reply({sections:[]});
  return reply([]);
});
server.listen(19646,"127.0.0.1",()=>{
  const child=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","13046"],{env:{...process.env,RCM_TEST_DIST_DIR:"build/account-redesign-dev",NEXT_PUBLIC_API_URL:api,SERVER_API_URL:api,NEXT_PUBLIC_SITE_URL:origin},stdio:"inherit"});
  child.on("exit",code=>{server.close();process.exitCode=code||0;});
  function close(){child.kill();server.close();}
  process.on("SIGINT",close);process.on("SIGTERM",close);
  console.log("Account fixture: "+origin+" (disposable data)");
});
