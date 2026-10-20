// AGUILA STORE — backend de pruebas en Cloudflare Workers.
// GitHub Pages no expone claves; nunca activar cobros LIVE sin autorización.
const PRODUCTS = Object.freeze({
  "orejeras-fleece-2": { units: 2, priceVar: "STRIPE_PRICE_PACK2" },
  "orejeras-fleece-3": { units: 3, priceVar: "STRIPE_PRICE_PACK3" }
});
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json; charset=utf-8",...headers}
});
function siteConfig(env){
  try{
    const u=new URL(env.SITE_URL);
    if(u.protocol!=="https:" || u.search || u.hash || u.username || u.password)return null;
    return {origin:u.origin,base:u.href.replace(/\/+$/,"")};
  }catch{return null;}
}
function cartCheck(items,env){
  if(!Array.isArray(items)||!items.length||items.length>2)return {error:"Carrito no valido"};
  let units=0;
  const seen=new Set(), lines=[], summary=[];
  for(const item of items){
    if(!item||typeof item!=="object"||Array.isArray(item)||typeof item.id!=="string"||
       !Object.hasOwn(PRODUCTS,item.id)||seen.has(item.id)||
       !Number.isSafeInteger(item.qty)||item.qty<1||item.qty>20)return {error:"Producto o cantidad invalida"};
    seen.add(item.id);
    const p=PRODUCTS[item.id];
    const price=env[p.priceVar];
    if(!/^price_[A-Za-z0-9]+$/.test(price||""))return {error:"Precio de pruebas no configurado",status:503};
    units+=item.qty*p.units;
    lines.push({price,quantity:item.qty});
    summary.push({id:item.id,qty:item.qty,units:item.qty*p.units});
  }
  const available=Number(env.INVENTARIO_UNIDADES);
  if(!Number.isSafeInteger(available)||available<0)return {error:"Stock de prueba no configurado",status:503};
  if(units>available)return {error:"Stock de prueba insuficiente"};
  return {units,lines,summary};
}
function testConfigured(env){
  return env.CHECKOUT_SERVICE_ENABLED==="true" &&
    env.CHECKOUT_MODE==="test" &&
    /^sk_test_/.test(env.STRIPE_SECRET_KEY||"");
}
function corsHeaders(site,origin){
  return {
    Vary:"Origin",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
    ...(site && origin===site.origin?{"Access-Control-Allow-Origin":site.origin}:{})
  };
}
function strBytes(str){return new TextEncoder().encode(str);}
function hex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}
function fixedEqual(a,b){
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;
  let difference=0;
  for(let i=0;i<a.length;i++) difference |= a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
export async function verifySignature(raw,signature,secret,now=Math.floor(Date.now()/1000)){
  if(!secret?.startsWith("whsec_")||!signature)return false;
  const components=signature.split(",").map(x=>x.trim());
  const t=components.find(x=>/^t=\d+$/.test(x))?.slice(2);
  const hashes=components.filter(x=>/^v1=[a-f0-9]{64}$/i.test(x)).map(x=>x.slice(3).toLowerCase());
  const ts=Number(t);
  if(!Number.isSafeInteger(ts)||Math.abs(now-ts)>300||!hashes.length)return false;
  const key=await crypto.subtle.importKey("raw",strBytes(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const digest=hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,strBytes(t+"."+raw))));
  return hashes.some(h=>fixedEqual(h,digest));
}
async function createSession(request,env,site,cors,networkFetch){
  if(!testConfigured(env))return json({error:"Checkout inactivo: solo pruebas autorizadas"},503,cors);
  if(!site||!/^shr_[A-Za-z0-9]+$/.test(env.SHIPPING_RATE_ID||""))
    return json({error:"Tarifa de pruebas no configurada"},503,cors);
  let raw,payload;
  try{
    raw=await request.text();
    if(raw.length>10000)return json({error:"Solicitud demasiado grande"},413,cors);
    payload=JSON.parse(raw);
  }catch{return json({error:"JSON no valido"},400,cors);}
  const cart=cartCheck(payload?.items,env);
  if(cart.error)return json({error:cart.error},cart.status||400,cors);
  const form=new URLSearchParams();
  form.set("mode","payment");
  cart.lines.forEach((line,i)=>{
    form.set("line_items["+i+"][price]",line.price);
    form.set("line_items["+i+"][quantity]",String(line.quantity));
  });
  form.set("shipping_address_collection[allowed_countries][0]","US");
  form.set("shipping_options[0][shipping_rate]",env.SHIPPING_RATE_ID);
  form.set("success_url",site.base+"/gracias.html?session_id={CHECKOUT_SESSION_ID}");
  form.set("cancel_url",site.base+"/index.html#catalogo");
  form.set("metadata[items]",JSON.stringify(cart.summary));
  form.set("metadata[total_units]",String(cart.units));
  try{
    const response=await networkFetch("https://api.stripe.com/v1/checkout/sessions",{
      method:"POST",
      headers:{"Authorization":"Bearer "+env.STRIPE_SECRET_KEY,
        "Content-Type":"application/x-www-form-urlencoded"},
      body:form.toString()
    });
    const data=await response.json();
    if(!response.ok||!data?.url||!data?.id?.startsWith("cs_test_"))
      return json({error:"Stripe TEST no pudo crear la sesion"},502,cors);
    const url=new URL(data.url);
    if(url.protocol!=="https:"||url.hostname!=="checkout.stripe.com")
      return json({error:"URL de Checkout invalida"},502,cors);
    return json({url:data.url},200,cors);
  }catch{return json({error:"Servicio TEST no disponible"},502,cors);}
}
async function handleWebhook(request,env){
  if(!testConfigured(env)||!env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"))
    return json({error:"Webhook no habilitado"},503);
  // Si falla D1, NO confirmar recepción del webhook: Stripe debe reintentar.
  if(!env.DB?.prepare)return json({error:"Registro de pedidos TEST no configurado"},503);
  const raw=await request.text();
  if(raw.length>100000)return json({error:"Evento demasiado grande"},413);
  if(!await verifySignature(raw,request.headers.get("stripe-signature"),env.STRIPE_WEBHOOK_SECRET))
    return json({error:"Firma no valida"},400);
  let event;
  try{event=JSON.parse(raw);}catch{return json({error:"Evento invalido"},400);}
  if(event.livemode!==false)return json({error:"Evento LIVE rechazado"},403);
  if(event.type!=="checkout.session.completed")return json({received:true,ignored:true});
  const session=event.data?.object;
  if(session?.livemode!==false||session.mode!=="payment"||session.payment_status!=="paid"||
     !/^cs_test_[A-Za-z0-9_]+$/.test(session.id||""))
    return json({received:true,ignored:true});
  const amount=session.amount_total;
  const totalUnits=Number(session.metadata?.total_units);
  if(!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(totalUnits)||totalUnits<1||
     !/^[a-z]{3}$/.test(session.currency||""))
    return json({error:"Datos de pago TEST incompletos"},400);
  try{
    await env.DB.prepare(
      "INSERT INTO test_orders (session_id, amount_total, currency, total_units, item_summary, created_at) "+
      "VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(session_id) DO NOTHING"
    ).bind(session.id,amount,session.currency,totalUnits,
      session.metadata?.items||"[]",new Date().toISOString()).run();
    return json({received:true});
  }catch{return json({error:"No se pudo guardar evento de prueba"},503);}
}
export async function handleRequest(request,env,networkFetch=fetch){
  const u=new URL(request.url);
  const site=siteConfig(env);
  if(u.pathname==="/health" && request.method==="GET")
    return json({service:"aguila-store-checkout",mode:"test-only",
      configured:!!site&&testConfigured(env),webPaymentsEnabled:false});
  if(u.pathname==="/stripe-webhook" && request.method==="POST")
    return handleWebhook(request,env);
  if(u.pathname!=="/create-checkout-session")return json({error:"No encontrado"},404);
  const origin=request.headers.get("Origin");
  const cors=corsHeaders(site,origin);
  if(origin!==site?.origin)return json({error:"Origen no autorizado"},403,cors);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(request.method!=="POST")return json({error:"Metodo no permitido"},405,cors);
  return createSession(request,env,site,cors,networkFetch);
}
export default {fetch(request,env){return handleRequest(request,env);}};
