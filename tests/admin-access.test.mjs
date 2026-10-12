import assert from "node:assert/strict";
import test from "node:test";
import { verifyAdminAccess } from "../lib/admin-access.ts";

test("admin rechaza sesión ausente o demo sin consultar datos", async () => {
  let calls = 0;
  const authorize = async () => { calls++; };
  for (const session of [null, { accessToken: "" }, { accessToken: "demo-access-token" }, { accessToken: "token", demo: true }]) {
    assert.equal(await verifyAdminAccess(session, authorize), false);
  }
  assert.equal(calls, 0);
});
test("admin no confía en rol manipulado y bloquea rechazo o caída del backend", async () => {
  for (const reason of ["401", "403", "503", "timeout"]) {
    assert.equal(await verifyAdminAccess({ accessToken: "untrusted", role: "ADMIN" }, async () => { throw new Error(reason); }), false);
  }
});
test("admin permite acceso tras autorización del backend", async () => {
  let calls = 0;
  assert.equal(await verifyAdminAccess({ accessToken: "token" }, async () => { calls++; return {}; }), true);
  assert.equal(calls, 1);
});
