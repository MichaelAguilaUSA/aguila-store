# AGUILA STORE — Backend Cloudflare de PRUEBAS

**Tienda pública:** GitHub Pages. **Pagos reales:** desactivados.

## Estado verificable

- Código del Worker: `src/index.mjs`.
- Pruebas automáticas: `node cloudflare/test.mjs` y workflow `.github/workflows/cloudflare-test.yml`.
- Registro de pagos simulados: `schema.sql` con `session_id` único para no duplicar.
- Checkout en modo TEST exclusivamente. `CHECKOUT_SERVICE_ENABLED = "false"` por defecto.
- **Sin despliegue a Cloudflare aún:** falta autorización/conexión con una cuenta de Cloudflare.
- No desplegar credenciales ni datos de Stripe en GitHub Pages.

## Preparación de despliegue en Cloudflare (después de conectar cuenta)

1. Crear Worker llamado `aguila-store-checkout-test` con el código de `cloudflare/src/index.mjs`; usar `cloudflare/wrangler.toml`. Mantener `CHECKOUT_SERVICE_ENABLED=false` en la primera publicación.
2. Verificar `GET /health`: respuesta `mode:test-only`, `configured:false`, `webPaymentsEnabled:false`.
3. Crear D1 `aguila-store-test-orders`, ejecutar `cloudflare/schema.sql` y añadir binding `DB` con ID REAL, nunca inventado.
4. Cargar únicamente **secretos TEST de Stripe** en Cloudflare: `STRIPE_SECRET_KEY` (`sk_test_...`), `STRIPE_PRICE_PACK2`, `STRIPE_PRICE_PACK3`, `SHIPPING_RATE_ID`, `STRIPE_WEBHOOK_SECRET`. Los precios y la tarifa deben corresponder a objetos Stripe en modo TEST y estar aprobados.
5. Habilitar `CHECKOUT_SERVICE_ENABLED=true` SOLO en backend TEST aislado, dejando `CHECKOUT_MODE=test`; jamás activar pagos de la tienda pública. Verificar controles de CORS, webhook HMAC, duplicados y persistencia D1.
6. No conectar al carrito de GitHub Pages hasta completar pruebas y recibir aprobación del propietario. Se mantienen `const CHECKOUT_ENABLED = false;` y `const CHECKOUT_API_URL = "";`.
7. Antes de LIVE: implementar persistencia de órdenes reales, gestión de inventario concurrente, impuestos, tarifas de despacho verificadas, conciliación y confirmación real al comprador.

## Riesgos

- La tarifa $3.99 mostrada en el carrito es **estimada** según política existente, aún no validada para el checkout final.
- D1 almacena órdenes TEST, no actualiza stock real; el inventario estático de 100 es solo validación inicial.
- CORS no constituye autenticación. Toda transacción requiere validación de precio y producto en el servidor.
- El endpoint `/health` no anuncia que los pagos de la tienda estén habilitados.
- Las pruebas simuladas no implican haber desplegado Workers ni efectuado un cobro real.
