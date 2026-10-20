// Catálogo autorizado del servidor — AGUILA STORE
// El servidor NUNCA confía en precios enviados por el navegador:
// solo acepta identificadores de producto y cantidades, y cobra
// siempre con los Price ID oficiales de Stripe.
const CATALOG = {
  "orejeras-fleece-2": {
    name: "FLEECE EAR MUFFS — Paquete de 2",
    // En modo TEST se usan los precios de prueba definidos por entorno
    // (STRIPE_PRICE_PACK2); el Price ID real queda como valor por defecto.
    stripePriceId: process.env.STRIPE_PRICE_PACK2 || "price_1USUSaMHMUnGAXSu7LiayJjC",
    unitsPerPack: 2
  },
  "orejeras-fleece-3": {
    name: "FLEECE EAR MUFFS — Paquete de 3",
    stripePriceId: process.env.STRIPE_PRICE_PACK3 || "price_1USUScMHMUnGAXSuAZgDYnu3",
    unitsPerPack: 3
  }
};

// Stock base vigente (unidades sueltas de orejeras).
// El paquete de 2 y el de 3 consumen del MISMO stock base.
// En producción este valor debe leerse de la base de datos de inventario;
// en la fase de pruebas se define con la variable de entorno INVENTARIO_UNIDADES.
function availableUnits() {
  const n = parseInt(process.env.INVENTARIO_UNIDADES || "100", 10);
  return Number.isFinite(n) && n >= 0 ? n : 100;
}

function validateCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "El carrito está vacío." };
  }
  if (items.length > Object.keys(CATALOG).length) {
    return { ok: false, error: "Demasiados productos en el carrito." };
  }
  const seen = new Set();
  let totalUnits = 0;
  const lineItems = [];
  const summary = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.id !== "string") {
      return { ok: false, error: "Línea del carrito no válida." };
    }
    const product = Object.hasOwn(CATALOG, item.id) ? CATALOG[item.id] : null;
    if (!product || seen.has(item.id)) {
      return { ok: false, error: "Producto no autorizado o duplicado." };
    }
    seen.add(item.id);
    if (!Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 20) {
      return { ok: false, error: "Cantidad no válida." };
    }
    totalUnits += product.unitsPerPack * item.qty;
    lineItems.push({ price: product.stripePriceId, quantity: item.qty });
    summary.push({ id: item.id, qty: item.qty, units: product.unitsPerPack * item.qty });
  }
  if (totalUnits > availableUnits()) {
    return { ok: false, error: "Cantidad superior al inventario vigente." };
  }
  return { ok: true, lineItems, summary, totalUnits };
}

module.exports = { CATALOG, availableUnits, validateCart };
