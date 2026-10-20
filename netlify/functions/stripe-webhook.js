// Webhook de Stripe — única vía que registra pedidos.
// Un pedido SOLO se registra cuando Stripe confirma el pago
// (evento checkout.session.completed con payment_status = "paid")
// y la firma del evento se verifica con STRIPE_WEBHOOK_SECRET.
//
// Variables de entorno requeridas:
//   STRIPE_SECRET_KEY     clave secreta de Stripe
//   STRIPE_WEBHOOK_SECRET secreto del endpoint del webhook
//
// Fase de pruebas: el pedido confirmado queda registrado en el registro
// (log) de la función con la marca PEDIDO_PAGADO y en el panel de Stripe.
// Antes de vender en real, este registro debe conectarse al sistema de
// despacho (base de datos/correo de pedidos) y descontar el inventario.
const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 500, body: "Webhook no configurado." };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = event.headers["stripe-signature"];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    // Firma no válida: no se registra nada.
    return { statusCode: 400, body: `Firma no válida: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    if (session.payment_status === "paid") {
      const order = {
        order_id: session.id,
        email: session.customer_details?.email || null,
        amount_total: session.amount_total,
        currency: session.currency,
        items: session.metadata?.items || null,
        total_units: session.metadata?.total_units || null,
        shipping: session.shipping_details || null,
        paid_at: new Date().toISOString()
      };
      console.log("PEDIDO_PAGADO", JSON.stringify(order));
      // TODO antes del lanzamiento real: persistir el pedido y descontar
      // las unidades del inventario vigente (total_units).
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
