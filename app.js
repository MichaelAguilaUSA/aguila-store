const products = [
  {
    id: "orejeras-fleece-2",
    name: "FLEECE EAR MUFFS — Paquete de 2",
    category: "Invierno",
    description: "Paquete de 2 unidades completas de orejeras de tejido polar para adulto, con banda detrás de la cabeza. Colores surtidos sujetos a disponibilidad. Referencia 7051AST.",
    price: 12.99,
    stripePriceId: "price_1USUSaMHMUnGAXSu7LiayJjC",
    image: "images/orejeras-negras.webp",
    imageAlt: "Orejeras negras de tejido polar sobre fondo blanco, fotografía de presentación",
    badge: "Paquete de 2",
    type: "winter"
  },
  {
    id: "orejeras-fleece-3",
    name: "FLEECE EAR MUFFS — Paquete de 3",
    category: "Invierno",
    description: "Paquete de 3 unidades completas de orejeras de tejido polar para adulto, con banda detrás de la cabeza. Colores surtidos sujetos a disponibilidad. Referencia 7051AST.",
    price: 16.99,
    stripePriceId: "price_1USUScMHMUnGAXSuAZgDYnu3",
    image: "images/orejeras-grises.webp",
    imageAlt: "Orejeras grises de tejido polar sobre fondo blanco, fotografía de presentación",
    badge: "Paquete de 3",
    type: "winter"
  }
];

const CART_STORAGE_KEY = "aguila-store-cart-v1";
function loadSavedCart() {
  try {
    const entries = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(entries)) return new Map();
    return new Map(entries.filter(([id, qty]) =>
      products.some(product => product.id === id) && Number.isSafeInteger(qty) && qty > 0
    ));
  } catch {
    return new Map();
  }
}
const state = {
  category: "Todos",
  query: "",
  sort: "featured",
  cart: loadSavedCart()
};
function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([...state.cart]));
  } catch {
    // El carrito sigue funcionando si el navegador bloquea almacenamiento.
  }
}

const productGrid = document.querySelector("#productGrid");
const productTemplate = document.querySelector("#productTemplate");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const tabs = document.querySelectorAll(".tab");
const cartDrawer = document.querySelector("#cartDrawer");
const openCart = document.querySelector("#openCart");
const closeCart = document.querySelector("#closeCart");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const subtotal = document.querySelector("#subtotal");
const shipping = document.querySelector("#shipping");
const taxAmount = document.querySelector("#taxAmount");
const total = document.querySelector("#total");
const checkoutButton = document.querySelector("#checkoutButton");
const checkoutMessage = document.querySelector("#checkoutMessage");
const copyCode = document.querySelector("#copyCode");
const clearCartButton = document.querySelector("#clearCart");
const cartFinalNote = document.querySelector("#cartFinalNote");

// Pago seguro: el carrito pide la sesión al servicio de pedidos y redirige
// a Stripe Checkout. La clave secreta NUNCA está en este archivo.
// CHECKOUT_ENABLED se activa solo en las pruebas del PASO 5 y tras el
// "LANZAR" de Michael. CHECKOUT_API_URL se rellena al desplegar el servicio.
const CHECKOUT_ENABLED = true;
const CHECKOUT_API_URL = "https://aguila-store-checkout.lanielgarcia49.workers.dev";

async function startCheckout() {
  const items = [...state.cart.entries()].map(([id, qty]) => ({ id, qty }));
  if (!items.length) return;
  checkoutButton.disabled = true;
  checkoutMessage.textContent = "Conectando con el pago seguro...";
  try {
    const res = await fetch(`${CHECKOUT_API_URL}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || "Sin respuesta del servicio de pago.");
    window.location.href = data.url;
  } catch (err) {
    checkoutMessage.textContent = `No se pudo iniciar el pago: ${err.message}`;
    checkoutButton.disabled = false;
  }
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

function getVisibleProducts() {
  const query = state.query.trim().toLowerCase();

  return products
    .filter((product) => state.category === "Todos" || product.category === state.category)
    .filter((product) => {
      const content = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      return content.includes(query);
    })
    .sort((a, b) => {
      if (state.sort === "priceLow") return a.price - b.price;
      if (state.sort === "priceHigh") return b.price - a.price;
      if (state.sort === "rating") return b.rating - a.rating;
      return products.indexOf(a) - products.indexOf(b);
    });
}

function renderProducts() {
  productGrid.innerHTML = "";
  const visibleProducts = getVisibleProducts();

  if (!visibleProducts.length) {
    productGrid.innerHTML = '<p class="no-results">No encontramos productos con esos filtros.</p>';
    return;
  }

  visibleProducts.forEach((product) => {
    const card = productTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.type = product.type;
    card.style.setProperty("--art-bg", "#ffffff");
    const media = card.querySelector(".product-media");
    const mainPhoto = document.createElement("img");
    mainPhoto.className = "product-photo";
    mainPhoto.src = `${product.image}?v=20261020-3`;
    mainPhoto.alt = product.imageAlt;
    mainPhoto.loading = "eager";
    mainPhoto.decoding = "async";
    media.append(mainPhoto);
    mainPhoto.classList.add("product-open-image");
    mainPhoto.setAttribute("tabindex", "0");
    mainPhoto.setAttribute("role", "button");
    mainPhoto.setAttribute("aria-label", "Ver detalles de " + product.badge);
    mainPhoto.addEventListener("click", () => openProductDialog(product.id, mainPhoto.src));
    mainPhoto.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProductDialog(product.id, mainPhoto.src); }
    });
    card.querySelector("h3").classList.add("product-open-title");
    card.querySelector("h3").setAttribute("tabindex", "0");
    card.querySelector("h3").setAttribute("role", "button");
    card.querySelector("h3").addEventListener("click", () => openProductDialog(product.id, mainPhoto.src));
    card.querySelector("h3").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProductDialog(product.id, mainPhoto.src); } });
    card.querySelector(".badge").textContent = product.badge;
    card.querySelector(".category").textContent = "FLEECE EAR MUFFS · ADULTOS";
    card.querySelector("h3").textContent = `Orejeras fleece — ${product.badge}`;
    card.querySelector(".product-pack-count").textContent =
      product.id === "orejeras-fleece-2" ? "Incluye 2 unidades completas" : "Incluye 3 unidades completas";
    card.querySelector(".description").textContent =
      "Suaves orejeras de tejido polar para adulto. Se usan con la banda detrás de la cabeza. Colores surtidos sujetos a disponibilidad.";
    card.querySelector(".price").textContent = money.format(product.price);

    const views = [
      {src: product.image, alt: product.imageAlt, label: "Vista principal"},
      {src: "images/orejeras-vino.webp", alt: "Orejeras de tejido polar en color rojo vino", label: "Rojo vino"},
      {src: "images/orejeras-camionero.webp", alt: "Orejeras negras colocadas detrás de la cabeza, fotografía del producto en uso", label: "En uso"}
    ];
    const gallery = card.querySelector(".product-thumbnails");
    views.forEach((view, index) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = `product-thumbnail${index === 0 ? " is-active" : ""}`;
      thumb.setAttribute("aria-label", `Mostrar imagen: ${view.label}`);
      thumb.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      const img = document.createElement("img");
      img.src = view.src;
      img.alt = "";
      img.loading = "lazy";
      thumb.append(img);
      thumb.addEventListener("click", () => {
        mainPhoto.src = view.src;
        mainPhoto.alt = view.alt;
        gallery.querySelectorAll("button").forEach(b => {
          const selected = b === thumb;
          b.classList.toggle("is-active", selected);
          b.setAttribute("aria-pressed", String(selected));
        });
      });
      gallery.append(thumb);
    });

    card.querySelector(".add-button").addEventListener("click", () => addToCart(product.id));
    productGrid.append(card);
  });
}

function addToCart(productId) {
  const current = state.cart.get(productId) || 0;
  state.cart.set(productId, current + 1);
  saveCart();
  checkoutMessage.textContent = "";
  renderCart();
  openCartPanel();
}

function updateQuantity(productId, change) {
  const current = state.cart.get(productId) || 0;
  const next = current + change;

  if (next <= 0) {
    state.cart.delete(productId);
  } else {
    state.cart.set(productId, next);
  }

  saveCart();
  checkoutMessage.textContent = "";
  renderCart();
}

function clearCart() {
  state.cart.clear();
  saveCart();
  renderCart();
}

function openCartPanel() {
  cartDrawer.inert = false;
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  cartDrawer.setAttribute("aria-modal", "true");
  closeCart.focus();
}

function closeCartPanel() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartDrawer.removeAttribute("aria-modal");
  if (cartDrawer.contains(document.activeElement)) openCart.focus();
  cartDrawer.inert = true;
}

// Vista previa conforme a la política de envío publicada: no configura tarifas de Stripe.
const PUBLISHED_US_SHIPPING_CENTS = 399;

function renderCart() {
  cartItems.innerHTML = "";
  let itemCount = 0;
  let subtotalValue = 0;

  state.cart.forEach((quantity, productId) => {
    const product = products.find((item) => item.id === productId);
    itemCount += quantity;
    subtotalValue += product.price * quantity;

    const line = document.createElement("article");
    line.className = "cart-line";
    line.innerHTML = `
      <img class="mini-art" src="${product.image}" alt="" loading="lazy">
      <div>
        <h3>${product.name}</h3>
        <p>${money.format(product.price)} x ${quantity}</p>
      </div>
      <div class="cart-line-actions">
        <div class="quantity">
          <button type="button" aria-label="Quitar una unidad de ${product.name}">−</button>
          <strong aria-label="${quantity} paquetes">${quantity}</strong>
          <button type="button" aria-label="Agregar una unidad de ${product.name}">+</button>
        </div>
        <button type="button" class="remove-cart-line" aria-label="Eliminar ${product.name} del carrito">Eliminar</button>
      </div>
    `;

    const [decrease, increase] = line.querySelectorAll(".quantity button");
    decrease.addEventListener("click", () => updateQuantity(product.id, -1));
    increase.addEventListener("click", () => updateQuantity(product.id, 1));
    line.querySelector(".remove-cart-line").addEventListener("click", () => {
      state.cart.delete(product.id);
      saveCart();
      renderCart();
    });
    cartItems.append(line);
  });

  if (!itemCount) {
    cartItems.innerHTML = '<p class="empty-cart">Tu carrito esta vacio. Agrega productos del catalogo para comenzar.</p>';
  }

  cartCount.textContent = itemCount;
  subtotal.textContent = money.format(subtotalValue);
  const subtotalCents = Math.round(subtotalValue * 100);
  const shippingCents = itemCount ? PUBLISHED_US_SHIPPING_CENTS : 0;
  const previewTotal = (subtotalCents + shippingCents) / 100;
  shipping.textContent = money.format(shippingCents / 100);
  taxAmount.textContent = itemCount ? "Por calcular" : "$0.00";
  total.textContent = money.format(previewTotal);
  clearCartButton.disabled = itemCount === 0;
  cartFinalNote.textContent = itemCount
    ? "Importe estimado para EE. UU., sin impuestos. Envío según tarifa de $3.99 publicada; pendiente de validación antes de habilitar las compras. El total definitivo se confirmará antes de pagar."
    : "Añade productos para ver el subtotal, envío y total estimado.";
  if (CHECKOUT_ENABLED) {
    checkoutButton.disabled = !itemCount;
    checkoutButton.textContent = "Finalizar pedido";
  } else {
    checkoutButton.disabled = true;
    checkoutButton.textContent = "Compras aún no habilitadas";
    checkoutMessage.textContent = "Compra no habilitada: falta verificar el envío e integrar Stripe Checkout. No se generan pedidos ni se realizan cobros.";
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    state.category = tab.dataset.category;
    renderProducts();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProducts();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

checkoutButton.addEventListener("click", () => { if (CHECKOUT_ENABLED) startCheckout(); });
openCart.addEventListener("click", openCartPanel);
closeCart.addEventListener("click", closeCartPanel);
clearCartButton.addEventListener("click", clearCart);
cartDrawer.inert = true;
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && cartDrawer.classList.contains("open")) closeCartPanel();
});

cartDrawer.addEventListener("click", (event) => {
  if (event.target === cartDrawer) {
    closeCartPanel();
  }
});

// Los pagos no se activarán hasta verificar catálogo, envío y Checkout de Stripe.

renderProducts();
renderCart();


const productDialog = document.querySelector("#productDialog");
const dialogPack = document.querySelector("#dialogPack");
const dialogPhoto = document.querySelector("#dialogPhoto");
const dialogThumbnails = document.querySelector("#dialogThumbnails");
const dialogPrice = document.querySelector("#dialogPrice");
const dialogTitle = document.querySelector("#dialogTitle");
let dialogProductId = "orejeras-fleece-2";

function updateDialogPack() {
  dialogProductId = dialogPack.value;
  const product = products.find(p => p.id === dialogProductId);
  dialogPrice.textContent = money.format(product.price);
  dialogTitle.textContent = "Orejeras fleece — " + product.badge;
}

function openProductDialog(productId, photo) {
  if (!productDialog || typeof productDialog.showModal !== "function") return;
  dialogPack.value = products.some(p => p.id === productId) ? productId : products[0].id;
  updateDialogPack();
  dialogPhoto.src = photo || products.find(p => p.id === dialogProductId).image;
  dialogPhoto.alt = "Orejeras de tejido polar para adultos, vista ampliada";
  const images = [
    ["images/orejeras-negras.webp", "Negro"],
    ["images/orejeras-grises.webp", "Gris"],
    ["images/orejeras-vino.webp", "Rojo vino"],
    ["images/orejeras-camionero.webp", "En uso"]
  ];
  dialogThumbnails.replaceChildren();
  images.forEach(([src, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dialog-thumbnail";
    b.setAttribute("aria-label", "Ver foto: " + label);
    b.setAttribute("aria-pressed", String(dialogPhoto.src.includes(src)));
    const im = document.createElement("img");
    im.src = src;
    im.alt = "";
    b.append(im);
    b.addEventListener("click", () => {
      dialogPhoto.src = src;
      dialogPhoto.alt = "Orejeras, " + label;
      dialogThumbnails.querySelectorAll("button").forEach(btn => btn.setAttribute("aria-pressed", String(btn === b)));
    });
    dialogThumbnails.append(b);
  });
  productDialog.showModal();
}

document.querySelectorAll("[data-open-product]").forEach(button => button.addEventListener("click", () => openProductDialog(button.dataset.openProduct, button.dataset.photo)));
dialogPack?.addEventListener("change", updateDialogPack);
document.querySelector("#closeProductDialog")?.addEventListener("click", () => productDialog.close());
productDialog?.addEventListener("click", event => { if (event.target === productDialog) productDialog.close(); });
document.querySelector("#dialogAdd")?.addEventListener("click", () => { productDialog.close(); addToCart(dialogProductId); });


/* Galería: un único diálogo nativo en la capa superior del navegador. */
const galleryViewer = document.querySelector("#galleryViewer");
const galleryViewerImage = document.querySelector("#galleryViewerImage");
const galleryViewerTitle = document.querySelector("#galleryViewerTitle");
document.querySelectorAll("[data-gallery-src]").forEach(button => {
  button.addEventListener("click", () => {
    galleryViewerImage.src = button.dataset.gallerySrc;
    galleryViewerImage.alt = "Fotografía ampliada: " + button.dataset.galleryLabel;
    galleryViewerTitle.textContent = button.dataset.galleryLabel;
    if (!galleryViewer.open) galleryViewer.showModal();
  });
});
galleryViewer?.addEventListener("click", event => {
  if (event.target === galleryViewer) galleryViewer.close();
});
document.querySelector("#galleryViewerShop")?.addEventListener("click", () => galleryViewer.close());
