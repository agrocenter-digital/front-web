import test from "node:test";
import assert from "node:assert/strict";
import { demoFallback } from "../lib/demo-catalog.ts";
import { quotationLink, canBuy } from "../lib/catalog.ts";

test("catálogo de prueba solo disponible en desarrollo", () => {
  for (const environment of ["production", "test", undefined]) assert.deepEqual(demoFallback(environment), []);
  const products = demoFallback("development");
  assert.equal(products.length, 4);
  assert.ok(products.every(p => p.demo && p.id < 0));
  assert.ok(products.filter(p => !p.quoteOnly).every(p => canBuy(p, 1)));
  assert.ok(products.filter(p => p.quoteOnly).every(p => !canBuy(p, 1)));
});
test("cotización demo abre WhatsApp sin destinatario y etiqueta la simulación", () => {
  const product = demoFallback("development").find(p => p.quoteOnly);
  const url = new URL(quotationLink(product, 3, ""));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/");
  assert.match(url.searchParams.get("text"), /DEMOSTRACIÓN.*Agrocenter.*DEMO-TRA.*cantidad 3/);
  assert.throws(() => quotationLink(product, 0, ""));
  assert.throws(() => quotationLink(product, 1.5, ""));
  assert.equal(quotationLink({ ...product, demo: false }, 1, ""), null);
  assert.equal(new URL(quotationLink({ ...product, demo: false }, 1, "12345678901")).pathname, "/12345678901");
});
