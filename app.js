const products = [
  {
    id: "eagle-audio-deck",
    name: "Eagle Audio Deck",
    category: "Electronica",
    description: "Sistema de sonido compacto con graves potentes y conexion Bluetooth.",
    price: 189,
    rating: 4.9,
    badge: "Premium",
    type: "electronics",
    shape: "linear-gradient(145deg, #ffffff, #0b3b82 72%)",
    art: "linear-gradient(145deg, #ffffff 0%, #d8e8ff 44%, #0b3b82 100%)"
  },
  {
    id: "smart-home-command",
    name: "Smart Home Command",
    category: "Electronica",
    description: "Centro inteligente para controlar luces, camaras y accesorios del hogar.",
    price: 129,
    rating: 4.7,
    badge: "Nuevo",
    type: "electronics",
    shape: "linear-gradient(145deg, #ffffff, #df1f2d 72%)",
    art: "linear-gradient(145deg, #ffffff 0%, #ffe1e4 44%, #df1f2d 100%)"
  },
  {
    id: "dash-cam-elite",
    name: "Dash Cam Elite",
    category: "Automovil",
    description: "Camara para auto con vision nocturna, GPS y grabacion continua.",
    price: 96,
    rating: 4.8,
    badge: "Auto",
    type: "auto",
    shape: "#0b3b82",
    art: "linear-gradient(145deg, #ffffff 0%, #d8e8ff 42%, #0b3b82 100%)"
  },
  {
    id: "garage-detail-kit",
    name: "Garage Detail Kit",
    category: "Automovil",
    description: "Kit de limpieza automotriz con espuma, microfibra y acabado brillante.",
    price: 58,
    rating: 4.6,
    badge: "Best",
    type: "auto",
    shape: "#df1f2d",
    art: "linear-gradient(145deg, #ffffff 0%, #ffe1e4 46%, #df1f2d 100%)"
  },
  {
    id: "impact-driver-pro",
    name: "Impact Driver Pro",
    category: "Herramientas",
    description: "Atornillador de impacto con torque alto y bateria de larga duracion.",
    price: 149,
    rating: 4.8,
    badge: "Pro",
    type: "tool",
    shape: "#0b3b82",
    art: "linear-gradient(145deg, #ffffff 0%, #d8e8ff 42%, #0b3b82 100%)"
  },
  {
    id: "steel-toolbox",
    name: "Steel Garage Toolbox",
    category: "Herramientas",
    description: "Caja metalica premium con organizadores para taller y garage.",
    price: 74,
    rating: 4.5,
    badge: "Garage",
    type: "tool",
    shape: "#df1f2d",
    art: "linear-gradient(145deg, #ffffff 0%, #ffe1e4 45%, #a91520 100%)"
  },
  {
    id: "weekend-power-bundle",
    name: "Weekend Power Bundle",
    category: "Ofertas",
    description: "Paquete de ahorro con accesorios de tecnologia, auto y herramientas.",
    price: 99,
    rating: 4.4,
    badge: "Oferta",
    type: "deal",
    shape: "#df1f2d",
    art: "linear-gradient(145deg, #0b3b82 0%, #ffffff 48%, #df1f2d 100%)"
  },
  {
    id: "american-saver-pack",
    name: "American Saver Pack",
    category: "Ofertas",
    description: "Seleccion de alta rotacion con precio reducido por tiempo limitado.",
    price: 45,
    rating: 4.6,
    badge: "Hot",
    type: "deal",
    shape: "#0b3b82",
    art: "linear-gradient(145deg, #df1f2d 0%, #ffffff 45%, #0b3b82 100%)"
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
    card.style.setProperty("--art-bg", product.art);
    card.style.setProperty("--shape", product.shape);
    card.querySelector(".badge").textContent = product.badge;
    card.querySelector(".category").textContent = product.category;
    card.querySelector("h3").textContent = product.name;
    card.querySelector(".description").textContent = product.description;
    card.querySelector(".rating").textContent = `${product.rating.toFixed(1)} ★`;
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
      <div class="mini-art" style="--art-bg: ${product.art}"></div>
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

  const shippingValue = subtotalValue > 0 && subtotalValue < 150 ? 12 : 0;
  cartCount.textContent = itemCount;
  subtotal.textContent = money.format(subtotalValue);
  shipping.textContent = shippingValue === 0 ? "Gratis" : money.format(shippingValue);
  total.textContent = money.format(subtotalValue + shippingValue);
  checkoutButton.disabled = itemCount === 0;
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

checkoutButton.addEventListener("click", () => {
  if (!state.cart.size) return;
  state.cart.clear();
  renderCart();
  checkoutMessage.textContent = "Pedido recibido. Gracias por comprar en Aguila Store 2.0.";
});

copyCode.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("AGUILA20");
    copyCode.textContent = "Codigo copiado";
  } catch {
    copyCode.textContent = "AGUILA20";
  }

  window.setTimeout(() => {
    copyCode.textContent = "Copiar codigo";
  }, 1800);
});

renderProducts();
renderCart();
