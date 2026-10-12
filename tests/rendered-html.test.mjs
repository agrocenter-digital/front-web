import assert from "node:assert/strict";
import test from "node:test";
const origin = process.env.TEST_BASE_URL;
test("admin no entrega el panel antes de verificar permisos", { skip: !origin }, async () => {
  const response = await fetch(new URL("/admin", origin));
  const html = await response.text();
  assert.match(html, /Verificando acceso/);
  assert.doesNotMatch(html, /Administrador Demo|Operador:|Consola de APIs/);
});
test("portada institucional y rutas públicas", { skip: !origin && "Configura TEST_BASE_URL con Next en ejecución" }, async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /La tierra nos une/);
  for (const id of ["nosotros", "soluciones", "contacto"]) assert.ok(html.includes('id="' + id + '"'));
  assert.ok(html.indexOf("La tierra nos une") < html.indexOf('id="productos"'));
  assert.doesNotMatch(html, /0[1-4] \/ (Nosotros|Nuestro catálogo|Soluciones)/);
  for (const path of ["/productos", "/productos/mayoristas", "/admin"]) assert.equal((await fetch(new URL(path, origin))).status, 200);
});

test("consulta rechaza datos inválidos sin guardar", { skip: !origin }, async () => {
  const response = await fetch(new URL("/api/consultas", origin), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "", email: "inválido", message: "" }) });
  assert.equal(response.status, 400);
});
