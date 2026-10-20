const products = [
  {
    id: "orejeras-fleece-2",
    name: "FLEECE EAR MUFFS — Paquete de 2",
    category: "Invierno",
    description: "Paquete de 2 orejeras de tejido polar para adulto, con banda detrás de la cabeza. Colores surtidos sujetos a disponibilidad. Referencia 7051AST.",
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
    description: "Paquete de 3 orejeras de tejido polar para adulto, con banda detrás de la cabeza. Colores surtidos sujetos a disponibilidad. Referencia 7051AST.",
    price: 16.99,
    stripePriceId: "price_1USUScMHMUnGAXSuAZgDYnu3",
    image: "images/orejeras-negras.webp",
    imageAlt: "Orejeras negras de tejido polar sobre fondo blanco, fotografía de presentación",
    badge: "Paquete de 3",
    type: "winter"
  }
];

const state = {
  category: "Todos",
  query: "",
  sort: "featured",
  cart: new Map()
};

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
const total = document.querySelector("#total");
const checkoutButton = document.querySelector("#checkoutButton");
const checkoutMessage = document.querySelector("#checkoutMessage");
const copyCode = document.querySelector("#copyCode");

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
    card.querySelector(".product-media").insertAdjacentHTML("beforeend", `<img class="product-photo" src="${product.image}?v=20261020-2" alt="${product.imageAlt}" loading="eager" decoding="async">`);
    card.querySelector(".badge").textContent = product.badge;
    card.querySelector(".category").textContent = product.category;
    card.querySelector("h3").textContent = product.name;
    card.querySelector(".description").textContent = product.description;
    card.querySelector(".rating").textContent = "Colores surtidos";
    card.querySelector(".price").textContent = money.format(product.price);
    card.querySelector(".add-button").addEventListener("click", () => addToCart(product.id));
    productGrid.append(card);
  });
}

function addToCart(productId) {
  const current = state.cart.get(productId) || 0;
  state.cart.set(productId, current + 1);
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

  checkoutMessage.textContent = "";
  renderCart();
}

function openCartPanel() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCartPanel() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

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
      <div class="quantity">
        <button type="button" aria-label="Quitar ${product.name}">-</button>
        <strong>${quantity}</strong>
        <button type="button" aria-label="Agregar ${product.name}">+</button>
      </div>
    `;

    const [decrease, increase] = line.querySelectorAll("button");
    decrease.addEventListener("click", () => updateQuantity(product.id, -1));
    increase.addEventListener("click", () => updateQuantity(product.id, 1));
    cartItems.append(line);
  });

  if (!itemCount) {
    cartItems.innerHTML = '<p class="empty-cart">Tu carrito esta vacio. Agrega productos del catalogo para comenzar.</p>';
  }

  const shippingValue = 0;
  cartCount.textContent = itemCount;
  subtotal.textContent = money.format(subtotalValue);
  shipping.textContent = "Por calcular";
  total.textContent = `${money.format(subtotalValue)} + envío por calcular`;
  checkoutButton.disabled = true;
  checkoutButton.textContent = "Compras aún no habilitadas";
  checkoutMessage.textContent = "Compra no habilitada: falta verificar el envío e integrar Stripe Checkout. No se generan pedidos ni se realizan cobros.";
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

openCart.addEventListener("click", openCartPanel);
closeCart.addEventListener("click", closeCartPanel);

cartDrawer.addEventListener("click", (event) => {
  if (event.target === cartDrawer) {
    closeCartPanel();
  }
});

// Los pagos no se activarán hasta verificar catálogo, envío y Checkout de Stripe.

renderProducts();
renderCart();
