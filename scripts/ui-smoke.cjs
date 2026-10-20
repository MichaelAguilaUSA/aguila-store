const assert = require("node:assert/strict");
const fs = require("node:fs");
const {spawn} = require("node:child_process");
const {chromium} = require("playwright");

const ROOT = "http://127.0.0.1:4173";
const SHOTS = "artifacts/visual-check";
fs.mkdirSync(SHOTS, {recursive: true});
const server = spawn("python3", ["-m", "http.server", "4173", "--bind", "127.0.0.1"], {
  stdio: ["ignore", "pipe", "pipe"]
});
let browser;
let failed = false;

function check(ok, message) {
  assert.ok(ok, message);
  console.log("OK: " + message);
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(ROOT + "/")).ok) return; }
    catch (_) {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error("Servidor local no responde");
}

async function testViewport(name, width, height) {
  const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
  const errors = [];
  const missing = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.url().startsWith(ROOT) && response.status() >= 400) missing.push(response.url() + " HTTP " + response.status());
  });
  try {
    await page.goto(ROOT + "/index.html", {waitUntil: "networkidle"});
    await page.locator("#productGrid .product-card").first().waitFor();
    const result = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      title: document.querySelector("h1")?.innerText || "",
      count: document.querySelectorAll("#productGrid .product-card").length,
      gallery: document.querySelectorAll(".gallery-grid .product-photo").length,
      broken: [...document.images].filter(img => !img.complete || img.naturalWidth < 1).map(img => img.src),
      nav: document.querySelector("nav.desktop-nav")?.getBoundingClientRect().width || 0
    }));
    check(result.background === "rgb(248, 249, 250)", name + ": fondo claro");
    check(result.title.includes("Abrígate con"), name + ": titular nuevo");
    check(result.count === 2, name + ": 2 presentaciones");
    check(result.gallery === 4, name + ": 4 fotografías");
    check(result.broken.length === 0, name + ": fotografías sin errores (" + result.broken.join(", ") + ")");
    check(result.pageWidth <= result.viewportWidth + 2, name + ": sin desplazamiento horizontal " + result.pageWidth + "/" + result.viewportWidth);
    check(errors.length === 0, name + ": Javascript sin errores " + errors.join("; "));
    check(missing.length === 0, name + ": rutas locales válidas " + missing.join("; "));
    await page.screenshot({path: SHOTS + "/" + name + "-portada-completa.png", fullPage: true});
    await page.locator("#productGrid .add-button").first().click();
    check(await page.locator("#cartDrawer").getAttribute("aria-hidden") === "false", name + ": carrito abre");
    check(await page.locator("#cartCount").innerText() === "1", name + ": carrito cuenta producto");
    check(await page.locator("#checkoutButton").isDisabled(), name + ": pagos siguen inhabilitados");
    await page.screenshot({path: SHOTS + "/" + name + "-carrito.png", fullPage: false});
  } finally { await page.close(); }
}

(async() => {
  try {
    await waitForServer();
    browser = await chromium.launch({channel: "chrome", headless: true, args: ["--no-sandbox"]});
    await testViewport("escritorio-1440", 1440, 900);
    await testViewport("movil-390", 390, 844);
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    for (const path of ["envio.html","devoluciones.html","privacidad.html","condiciones.html","contacto.html","gracias.html"]) {
      await page.goto(ROOT + "/" + path, {waitUntil: "load"});
      check(await page.locator("h1").count() === 1, path + ": título visible");
      check(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === "rgb(248, 249, 250)", path + ": tema claro");
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), path + ": sin desbordamiento");
    }
    await page.screenshot({path: SHOTS + "/movil-politica-envio.png", fullPage: true});
    await page.close();
  } catch (e) {
    failed = true;
    console.error("ERROR DE LA AUDITORÍA VISUAL:", e.stack || e);
  } finally {
    if(browser) await browser.close();
    server.kill();
    process.exitCode = failed ? 1 : 0;
  }
})();
