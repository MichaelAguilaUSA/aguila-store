# Servicio de pagos de AGUILA STORE — guía de despliegue

## Arquitectura
- **Tienda pública:** GitHub Pages (este repositorio) — solo archivos estáticos.
- **Servicio seguro de pedidos:** Netlify Functions (carpeta `netlify/`) — crea las
  Checkout Sessions de Stripe y recibe el webhook. La clave secreta de Stripe
  vive SOLO en las variables de entorno de Netlify. Nunca en el JavaScript público.

## Archivos
- `netlify/lib/catalog.js` — catálogo autorizado del servidor (Price ID oficiales,
  unidades por paquete) y validación de inventario contra el stock base (100 uds).
- `netlify/functions/create-checkout-session.js` — valida producto/cantidad/precio
  en el servidor, crea la sesión de Stripe y devuelve la URL de pago.
- `netlify/functions/stripe-webhook.js` — verifica la firma del evento y registra
  SOLO pedidos con pago confirmado (`PEDIDO_PAGADO`).
- `gracias.html` — página de confirmación tras el pago.

## Pasos de despliegue (fase de pruebas, modo TEST)
1. Crear un sitio en Netlify apuntando a este repositorio (la tienda pública
   sigue en GitHub Pages; Netlify solo ejecuta las funciones).
2. Variables de entorno en Netlify:
   - `STRIPE_SECRET_KEY` = clave secreta de PRUEBA (sk_test_...)
   - `STRIPE_WEBHOOK_SECRET` = secreto del webhook (se obtiene en el paso 4)
   - `SITE_URL` = URL pública de la tienda en GitHub Pages
   - `INVENTARIO_UNIDADES` = 100
   - `SHIPPING_RATE_ID` = tarifa de envío de Stripe (se crea tras el PASO 3)
3. En `app.js`: poner `CHECKOUT_API_URL` con la URL del sitio de Netlify y
   `CHECKOUT_ENABLED = true` SOLO durante las pruebas.
4. En Stripe (modo test): crear un endpoint de webhook hacia
   `https://<sitio-netlify>/.netlify/functions/stripe-webhook` con el evento
   `checkout.session.completed` y copiar su secreto a `STRIPE_WEBHOOK_SECRET`.
5. Ejecutar las pruebas del PASO 5 (tarjetas de prueba de Stripe).

## Antes de vender en real (tras el «LANZAR» de Michael)
- Cambiar las claves de test por las de producción en Netlify.
- Conectar el registro de pedidos del webhook a un sistema persistente
  (base de datos o correo de pedidos) y descontar el inventario vendido.
- Completar Stripe Tax y el domicilio fiscal (head_office) — PASO 3.
- Los productos de Stripe permanecen INACTIVOS hasta completar las pruebas.
