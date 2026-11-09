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

function handoffOf(url) {
  return new URLSearchParams(url.hash.replace(/^#/, ""));
}

test("el cambio de entorno apunta a /admin y propaga la sesión en el fragmento", () => {
  const url = new URL(buildEnvironmentUrl("http://44.195.118.58:3000", session));
  const handoff = handoffOf(url);

  assert.equal(url.hostname, "44.195.118.58");
  assert.equal(url.port, "3000");
  assert.equal(url.pathname, "/admin");
  assert.equal(handoff.get("token"), session.accessToken);
  assert.equal(handoff.get("idToken"), session.idToken);
  assert.equal(handoff.get("name"), session.name);
  assert.equal(handoff.get("email"), session.email);
  assert.equal(handoff.get("role"), session.role);

  // Las credenciales no deben quedar en el query string (logs de Nginx/Referer).
  assert.equal(url.searchParams.get("token"), null);
  assert.equal(url.searchParams.get("idToken"), null);
});

test("sin sesión activa no se filtran credenciales", () => {
  const url = new URL(buildEnvironmentUrl("http://34.195.64.174:3000", null));

  assert.equal(url.pathname, "/admin");
  assert.equal([...url.searchParams].length, 0);
  assert.equal(url.hash, "");
});

test("respeta una ruta configurada explícitamente", () => {
  const url = new URL(buildEnvironmentUrl("http://34.195.64.174:3000/panel", session));

  assert.equal(url.pathname, "/panel");
  assert.equal(handoffOf(url).get("token"), session.accessToken);
});
