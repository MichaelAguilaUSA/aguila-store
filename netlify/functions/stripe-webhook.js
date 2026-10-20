// Stripe webhook: solo diagnósticos firmados del entorno de PRUEBA.
// No registra pedidos reales ni descuenta inventario: esas funciones requieren
// almacenamiento persistente e idempotencia antes de habilitar producción.
const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (process.env.CHECKOUT_MODE !== "test" ||
      process.env.CHECKOUT_SERVICE_ENABLED !== "true" ||
      !/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || "")) {
    return { statusCode: 503, body: "Webhook de pruebas no habilitado." };
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 503, body: "Webhook no configurado." };
  }

  const signature = event.headers?.["stripe-signature"] ||
    event.headers?.["Stripe-Signature"];
  if (!signature || typeof event.body !== "string") {
    return { statusCode: 400, body: "Solicitud sin firma válida." };
  }

  let stripeEvent;
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    // No mostrar información de validación de firma al cliente.
    return { statusCode: 400, body: "Firma de Stripe no válida." };
  }

  // Rechazar eventos de producción incluso si llegan firmados a este endpoint.
  if (stripeEvent.livemode !== false) {
    return { statusCode: 403, body: "Evento fuera del entorno de prueba." };
  }
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data?.object;
    if (session?.payment_status === "paid" &&
        session.mode === "payment" &&
        session.livemode === false &&
        /^cs_test_/.test(session.id || "")) {
      // Diagnóstico sin direcciones, correos ni datos personales.
      // NO implica registro de pedido, ni genera despacho.
      console.log("PAGO_TEST_VERIFICADO_SIN_PEDIDO", JSON.stringify({
        session_id: session.id,
        amount_total: session.amount_total,
        currency: session.currency
      }));
    }
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
