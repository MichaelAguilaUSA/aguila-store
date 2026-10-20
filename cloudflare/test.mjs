import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {handleRequest} from "./src/index.mjs";
if(!globalThis.crypto) globalThis.crypto=webcrypto;
const base="https://aguila-store-checkout-test.example.workers.dev";
const origin="https://michaelaguilausa.github.io";
const env={SITE_URL:origin+"/aguila-store",CHECKOUT_MODE:"test",
 CHECKOUT_SERVICE_ENABLED:"false",INVENTARIO_UNIDADES:"100",
 STRIPE_SECRET_KEY:"sk_test_fake",STRIPE_PRICE_PACK2:"price_fake2",STRIPE_PRICE_PACK3:"price_fake3",
 SHIPPING_RATE_ID:"shr_fake",STRIPE_WEBHOOK_SECRET:"whsec_fake"};
function order(items,o=origin){return new Request(base+"/create-checkout-session",{
 method:"POST",headers:{"Origin":o,"Content-Type":"application/json"},body:JSON.stringify({items})});}
let requested=0;
const mockFetch=async (url,options)=>{
 requested++;
 assert.equal(url,"https://api.stripe.com/v1/checkout/sessions");
 assert.equal(new URLSearchParams(options.body).get("metadata[total_units]"),"8");
 assert.equal(new URLSearchParams(options.body).get("shipping_options[0][shipping_rate]"),"shr_fake");
 return new Response(JSON.stringify({url:"https://checkout.stripe.com/test/simulated",id:"cs_test_example"}),{status:200});
};
let r=await handleRequest(order([{id:"orejeras-fleece-2",qty:1}]),env,mockFetch);
assert.equal(r.status,503);
assert.equal(requested,0);
r=await handleRequest(order([{id:"orejeras-fleece-2",qty:1}],"https://evil.example"),env,mockFetch);
assert.equal(r.status,403);
const enabled={...env,CHECKOUT_SERVICE_ENABLED:"true"};
for(const items of [[{id:"__proto__",qty:1}],[{id:"orejeras-fleece-2",qty:"1"}],
 [{id:"orejeras-fleece-2",qty:1},{id:"orejeras-fleece-2",qty:1}]]) {
 r=await handleRequest(order(items),enabled,mockFetch);assert.equal(r.status,400);
}
assert.equal(requested,0);
r=await handleRequest(order([{id:"orejeras-fleece-2",qty:1},{id:"orejeras-fleece-3",qty:2}]),enabled,mockFetch);
assert.equal(r.status,200);
assert.equal((await r.json()).url,"https://checkout.stripe.com/test/simulated");
assert.equal(requested,1);
r=await handleRequest(order([{id:"orejeras-fleece-2",qty:1}]),{...enabled,CHECKOUT_MODE:"live"},mockFetch);
assert.equal(r.status,503);
assert.equal(requested,1);
const h=await handleRequest(new Request(base+"/health"),env,mockFetch);
assert.equal((await h.json()).webPaymentsEnabled,false);
console.log("WORKERS TEST OK: apagado por defecto, CORS, carritos y checkout simulado; cero cobros");


// Stripe webhook: HMAC real de prueba, D1 simulado, rechazo LIVE e idempotencia.
const webhookEnv={...enabled,STRIPE_WEBHOOK_SECRET:"whsec_unit_fake"};
const recorded=new Map();
let attemptedInserts=0;
webhookEnv.DB={prepare(sql){
 assert.ok(sql.includes("ON CONFLICT(session_id) DO NOTHING"));
 return {bind(...values){return {async run(){
   attemptedInserts++;
   if(!recorded.has(values[0]))recorded.set(values[0],values);
   return {success:true};
 }};}};
}};
async function signedWebhook(event, opts={}){
 const body=JSON.stringify(event);
 const timestamp=opts.timestamp??Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(webhookEnv.STRIPE_WEBHOOK_SECRET),
   {name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(timestamp+"."+body)));
 const hex=Array.from(sig,b=>b.toString(16).padStart(2,"0")).join("");
 return new Request(base+"/stripe-webhook",{method:"POST",headers:{
   "Stripe-Signature":"t="+timestamp+",v1="+(opts.invalid?"0".repeat(64):hex)
 },body});
}
const paidEvent={id:"evt_test_unit123",livemode:false,type:"checkout.session.completed",data:{
 object:{id:"cs_test_unit123",livemode:false,mode:"payment",payment_status:"paid",
 amount_total:1698,currency:"usd",
 metadata:{total_units:"2",items:'[{"id":"orejeras-fleece-2","qty":1}]'},
 customer_details:{email:"not-for-storage@example.invalid"}}}};
r=await handleRequest(await signedWebhook(paidEvent,{invalid:true}),webhookEnv,mockFetch);
assert.equal(r.status,400);
r=await handleRequest(await signedWebhook(paidEvent,{timestamp:Math.floor(Date.now()/1000)-3600}),webhookEnv,mockFetch);
assert.equal(r.status,400);
r=await handleRequest(await signedWebhook({...paidEvent,livemode:true}),webhookEnv,mockFetch);
assert.equal(r.status,403);
assert.equal(recorded.size,0);
r=await handleRequest(await signedWebhook(paidEvent),{...webhookEnv,DB:undefined},mockFetch);
assert.equal(r.status,503);
r=await handleRequest(await signedWebhook({...paidEvent,data:{object:{...paidEvent.data.object,payment_status:"unpaid"}}}),webhookEnv,mockFetch);
assert.equal(r.status,200);
assert.equal(recorded.size,0);
r=await handleRequest(await signedWebhook(paidEvent),webhookEnv,mockFetch);
assert.equal(r.status,200);
assert.equal(recorded.size,1);
r=await handleRequest(await signedWebhook(paidEvent),webhookEnv,mockFetch);
assert.equal(r.status,200);
assert.equal(recorded.size,1);
assert.equal(attemptedInserts,2);
const stored=JSON.stringify([...recorded.values()]);
assert.ok(!stored.includes("not-for-storage"));
assert.ok(!stored.includes("sk_test_"));
console.log("WORKERS WEBHOOK OK: HMAC real, caducidad, rechazo LIVE, D1 idempotente, sin PII");
