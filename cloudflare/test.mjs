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
