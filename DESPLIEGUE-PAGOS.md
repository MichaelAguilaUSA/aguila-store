# AGUILA STORE 2.0 — Estado real del sistema de pagos

**Tienda pública:** https://michaelaguilausa.github.io/aguila-store/

## Estado confirmado

- La web pública sigue en GitHub Pages, con `CHECKOUT_ENABLED = false` y `CHECKOUT_API_URL = ""`.
- La cuenta de Stripe puede recibir pagos, pero esta autorización técnica **no** autoriza a abrir ventas.
- El backend de Netlify está versionado en este repositorio; su despliegue y configuración externa **NO están verificados**.
- Los precios LIVE asociados al catálogo son $12.99 (dos) y $16.99 (tres); los productos LIVE permanecen inactivos.
- La página `gracias.html` no confirma pagos: solo el backend puede verificarlos.
- El webhook actual solo diagnostica eventos firmados de TEST. **No persiste pedidos ni descuenta stock.**
- El carrito publica la tarifa **estimada** de envío de $3.99 de la política existente. No debe confundirse con una tarifa Stripe autorizada ni con el total final con impuestos.

## Variables del backend de pruebas (Netlify)

| Variable | Significado |
|---|---|
| `SITE_URL` | `https://michaelaguilausa.github.io/aguila-store` (incluida la subruta; sin `/` final obligatorio) |
| `CHECKOUT_SERVICE_ENABLED` | `false` por defecto; `true` solo en backend aislado para pruebas |
| `CHECKOUT_MODE` | `test` exclusivamente; los endpoints rechazan `live` |
| `STRIPE_SECRET_KEY` | Clave de prueba `sk_test_...` o clave restringida de prueba `rk_test_...`. Nunca publicar. |
| `STRIPE_PRICE_PACK2`, `STRIPE_PRICE_PACK3` | IDs **de prueba**, distintos de los IDs LIVE |
| `SHIPPING_RATE_ID` | Tarifa aprobada **de prueba** (`shr_...`); obligatoria |
| `STRIPE_WEBHOOK_SECRET` | Secreto del endpoint de prueba correspondiente |
| `INVENTARIO_UNIDADES` | Cantidad de referencia para pruebas; NO reserva stock ni evita ventas concurrentes |

El código **rechaza** cualquier sesión de pago que no cumpla el interruptor de pruebas, la modalidad TEST y los parámetros requeridos. El navegador público nunca almacena la clave privada de Stripe.

## Bloqueos de lanzamiento (no superados)

1. Desplegar, conectar y comprobar un backend seguro; GitHub Pages no ejecuta funciones serverless.
2. Comprobar tarifas reales de envío para paquetes/destinos y validarlas contra la política pública ($3.99 actualmente mostrados como estimación).
3. Resolver registro fiscal, impuestos aplicables y total final antes de permitir pagos.
4. Guardar pedidos de forma **persistente e idempotente** tras webhooks firmados, con control de duplicados.
5. Implementar gestión de inventario concurrente, reserva/descuento real y flujo de cumplimiento. Las 100 unidades de referencia no se actualizan automáticamente.
6. Verificar confirmación, cancelación, error, reembolso y seguridad en Stripe TEST sin cobros LIVE.
7. Obtener aprobación explícita del propietario para pasar a LIVE; solo después modificar configuraciones de producción y habilitar el botón.

**No se debe habilitar el checkout ni activar productos LIVE simplemente por tener la cuenta de Stripe verificada.**

## Pruebas automáticas

`.github/workflows/checkout-safety.yml` comprueba validación de carrito, bloqueo del checkout, CORS, rechazo del modo LIVE, webhook firmado TEST sin exposición de datos personales y protección de la página de confirmación. No equivale a una prueba de pagos de extremo a extremo ni a un despliegue del backend.

## Precisión sobre seguridad

CORS limita lo que pueden hacer navegadores de otros orígenes: **no es autenticación**. Un cliente HTTP podría llamar al servicio directamente. La protección fundamental es validar el carrito/precios en el servidor, mantener las claves privadas fuera de GitHub Pages, exigir una firma válida en webhooks y proteger el proceso de pago y la persistencia.
