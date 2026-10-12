import assert from "node:assert/strict";
import test from "node:test";
import { canBuy, validQuantity, quoteMessage, whatsappUrl } from "../lib/catalog.ts";
test("cantidades enteras positivas compatibles con backend", () => {
  for (const n of [0, -1, 1.5, NaN, Infinity, 2147483648]) assert.equal(validQuantity(n), false);
  assert.equal(validQuantity(1), true);
});
test("minorista respeta stock y precio; cotización nunca admite carrito", () => {
  const item = { quoteOnly: false, price: 1000, stock: 4 };
  assert.equal(canBuy(item, 2), true);
  assert.equal(canBuy(item, 5), false);
  assert.equal(canBuy({ ...item, price: null }, 1), false);
  assert.equal(canBuy({ ...item, quoteOnly: true }, 1), false);
});
test("WhatsApp codifica producto, SKU, cantidad y presentación", () => {
  const message = quoteMessage({ name: "Semilla & riego #1", sku: "PRUEBA/1", unit: "Saco 25 kg" }, 3);
  const url = new URL(whatsappUrl("+12345678901", message));
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.searchParams.get("text"), message);
  assert.equal([...url.searchParams].length, 1);
  assert.match(message, /Agrocenter.*SKU PRUEBA\/1, cantidad 3, presentación Saco 25 kg/);
  assert.throws(() => quoteMessage({ name: "Prueba" }, 0));
});
test("configuración ausente o inválida no genera enlace", () => {
  for (const number of ["", "NUMERO", "123", "javascript:alert(1)", "12345678?text=otro"]) assert.equal(whatsappUrl(number, "Hola"), null);
});
