import assert from "node:assert/strict";
import test from "node:test";
import { buildEnvironmentUrl } from "../lib/environments.ts";

const session = {
  accessToken: "access-token-de-prueba",
  idToken: "id-token-de-prueba",
  name: "Camila Muñoz",
  email: "camila@agrocenter.cl",
  role: "ADMIN",
};

test("el cambio de entorno apunta a /admin y propaga la sesión", () => {
  const url = new URL(buildEnvironmentUrl("http://44.195.118.58:3000", session));

  assert.equal(url.hostname, "44.195.118.58");
  assert.equal(url.port, "3000");
  assert.equal(url.pathname, "/admin");
  assert.equal(url.searchParams.get("token"), session.accessToken);
  assert.equal(url.searchParams.get("idToken"), session.idToken);
  assert.equal(url.searchParams.get("name"), session.name);
  assert.equal(url.searchParams.get("email"), session.email);
  assert.equal(url.searchParams.get("role"), session.role);
});

test("sin sesión activa no se filtran credenciales", () => {
  const url = new URL(buildEnvironmentUrl("http://34.195.64.174:3000", null));

  assert.equal(url.pathname, "/admin");
  assert.equal([...url.searchParams].length, 0);
});

test("respeta una ruta configurada explícitamente", () => {
  const url = new URL(buildEnvironmentUrl("http://34.195.64.174:3000/panel", session));

  assert.equal(url.pathname, "/panel");
  assert.equal(url.searchParams.get("token"), session.accessToken);
});
