// Crea una Stripe Checkout Session de forma segura.
// La clave secreta vive SOLO en las variables de entorno del servidor
// (STRIPE_SECRET_KEY). Nunca aparece en el JavaScript público de la tienda.
//
// Variables de entorno requeridas:
//   STRIPE_SECRET_KEY   clave secreta de Stripe (modo test en las pruebas)
//   SITE_URL            URL pública de la tienda (GitHub Pages)
//   SHIPPING_RATE_ID    (opcional) tarifa de envío de Stripe definida en el PASO 3
const Stripe = require("stripe");
const { validateCart } = require("../lib/catalog");

const CORS = {
  "Access-Control-Allow-Origin": process.env.SITE_URL || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }
  // No generar sesiones si todavía no existe una tarifa de envío aprobada.
  if (!process.env.SHIPPING_RATE_ID) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: "La tarifa de envío aún no está configurada." })
    };
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SITE_URL) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Servicio de pago no configurado." })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "JSON no válido." }) };
  }

  // Validación en el servidor: producto, cantidad, precio (vía Price ID) e inventario.
  const check = validateCart(payload.items);
  if (!check.ok) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: check.error }) };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sessionParams = {
    mode: "payment",
    line_items: check.lineItems,
    shipping_address_collection: { allowed_countries: ["US"] },
    success_url: `${process.env.SITE_URL}/gracias.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_URL}/index.html#catalogo`,
    metadata: { items: JSON.stringify(check.summary), total_units: String(check.totalUnits) }
    // Impuestos automáticos DESACTIVADOS a propósito:
    // no se activan sin la aprobación expresa de Michael (PASO 3).
  };
  sessionParams.shipping_options = [{ shipping_rate: process.env.SHIPPING_RATE_ID }];

  const session = await stripe.checkout.sessions.create(sessionParams);
  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify({ url: session.url })
  };
};
