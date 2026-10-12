import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseInquiry, saveInquiry } from "../lib/inquiries.ts";

test("consulta valida nombre, correo y mensaje en servidor", () => {
  assert.throws(() => parseInquiry({ name: "A", email: "sin-correo", message: "hola" }));
  assert.throws(() => parseInquiry({ name: "QA", email: "qa@example.test", message: "x".repeat(4001) }));
  assert.deepEqual(parseInquiry({ name: " QA ", email: "qa@example.test", message: " Necesito cotizar un equipo. " }), { name: "QA", email: "qa@example.test", message: "Necesito cotizar un equipo." });
});
test("consulta se persiste y el comprobante corresponde al archivo guardado", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agrocenter-consultas-test-"));
  try {
    const data = parseInquiry({ name: "Prueba QA", email: "qa@example.test", message: "Consulta de pruebas de persistencia." });
    const receipts = await Promise.all([saveInquiry(data, directory), saveInquiry(data, directory)]);
    assert.notEqual(receipts[0].id, receipts[1].id);
    assert.equal((await readdir(directory)).length, 2);
    const stored = JSON.parse(await readFile(join(directory, receipts[0].id + ".json"), "utf8"));
    assert.equal(stored.message, data.message);
    assert.equal(stored.email, data.email);
    assert.equal(stored.id, receipts[0].id);
    assert.equal(stored.status, "recibida");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
