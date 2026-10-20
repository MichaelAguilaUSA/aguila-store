// AGUILA STORE: Checkout en pruebas. No activar cobros reales sin autorización.
const Stripe = require("stripe");
const { validateCart } = require("../lib/catalog");

const respond = (statusCode, message, headers = {}) => ({
  statusCode,
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ error: message })
});

function siteConfig() {
  try {
    const site = new URL(process.env.SITE_URL || "");
    if (site.protocol !== "https:" || site.search || site.hash) return null;
    return { base: site.href.replace(/\/+$/, ""), origin: site.origin };
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const site = siteConfig();
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const cors = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  // GitHub Pages usa origen sin ruta, aunque SITE_URL incluye /aguila-store.
  if (site && (!requestOrigin || requestOrigin === site.origin)) {
    cors["Access-Control-Allow-Origin"] = site.origin;
    cors.Vary = "Origin";
  }
  if (requestOrigin && (!site || requestOrigin !== site.origin)) {
    return respond(403, "Origen no autorizado.", cors);
  }
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: site ? 204 : 503, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") return respond(405, "Metodo no permitido.", cors);

  // El servidor esta apagado salvo autorizacion explicita para pruebas.
  if (process.env.CHECKOUT_SERVICE_ENABLED !== "true") {
    return respond(503, "Servicio de compras aun no habilitado.", cors);
  }
  // En esta fase solo se permite modo TEST, nunca cargos de produccion.
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (process.env.CHECKOUT_MODE !== "test" || !/^(sk|rk)_test_/.test(key)) {
    return respond(503, "Solo se permiten sesiones de prueba.", cors);
  }
  if (!site || !process.env.SHIPPING_RATE_ID?.startsWith("shr_") ||
      !process.env.STRIPE_PRICE_PACK2?.startsWith("price_") ||
      !process.env.STRIPE_PRICE_PACK3?.startsWith("price_")) {
    return respond(503, "Configuracion de pruebas incompleta: precios y envio.", cors);
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, "Solicitud JSON no valida.", cors);
  }

  const cart = validateCart(payload.items);
  if (!cart.ok) return respond(400, cart.error, cors);

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.lineItems,
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{ shipping_rate: process.env.SHIPPING_RATE_ID }],
      success_url: site.base + "/gracias.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: site.base + "/index.html#catalogo",
      metadata: {
        items: JSON.stringify(cart.summary),
        total_units: String(cart.totalUnits)
      }
      // Impuestos automaticos desactivados hasta autorizacion.
    });
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url })
    };
  } catch {
    return respond(502, "No se pudo preparar la sesion de prueba.", cors);
  }
};
