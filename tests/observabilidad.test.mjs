import assert from "node:assert/strict";
import test from "node:test";
import { consultarObservabilidad, formatearFecha } from "../lib/observabilidad.ts";

test("formatea fechas de Jackson y de ISO en UTC sin concatenar arreglos", () => {
  assert.equal(formatearFecha([2026, 10, 18], true), "2026-10-18");
  assert.equal(formatearFecha(1794789539.783051), "2026-11-16 00:38:59 UTC");
  assert.equal(formatearFecha("2026-11-16T00:38:59Z"), "2026-11-16 00:38:59 UTC");
  assert.equal(formatearFecha([2026, 2, 30]), "Fecha no disponible");
  assert.equal(formatearFecha(null), "Fecha no disponible");
});

test("consulta las ocho rutas y conserva páginas vacías exitosas", async () => {
  const rutas = [];
  const vacia = { elementos: [], pagina: 0, tamano: 10, hayMas: false };
  const resumen = { ventas: 0, monto: 0 };
  const resultado = await consultarObservabilidad(async url => {
    rutas.push(url);
    if (url.endsWith("/estado-consumidor")) return { estado: "DESACTIVADO" };
    return url.endsWith("/resumen") ? resumen : vacia;
  });
  assert.deepEqual(rutas, ["/api/bff/admin/analiticas/resumen", "/api/bff/admin/auditoria/eventos?tamano=10", "/api/bff/admin/analiticas/cuarentena?tamano=10", "/api/bff/admin/auditoria/cuarentena?tamano=10", "/api/bff/admin/analiticas/estado-consumidor", "/api/bff/admin/auditoria/estado-consumidor", "/api/bff/admin/inventario/cuarentena?tamano=10", "/api/bff/admin/compras/cuarentena?tamano=10"]);
  assert.equal(resultado.resumen, resumen);
  assert.equal(resultado.eventos, vacia);
  assert.equal(resultado.incidentes.analiticas, vacia);
  assert.equal(resultado.consumidores.analiticas.estado, "DESACTIVADO");
  assert.deepEqual(resultado.errores, []);
});

test("una caída parcial no convierte el error en una página vacía", async () => {
  const vacia = { elementos: [], pagina: 0, tamano: 10, hayMas: false };
  const resultado = await consultarObservabilidad(async url => {
    if (url.includes("auditoria/eventos")) throw new Error("503");
    if (url.includes("analiticas/cuarentena")) throw "sin conexión";
    if (url.includes("auditoria/estado-consumidor")) throw new Error("403");
    if (url.endsWith("/estado-consumidor")) return { estado: "DESACTIVADO" };
    return url.endsWith("/resumen") ? { ventas: 2 } : vacia;
  });
  assert.equal(resultado.eventos, null);
  assert.equal(resultado.incidentes.analiticas, null);
  assert.equal(resultado.incidentes.auditoria, vacia);
  assert.equal(resultado.consumidores.auditoria, null);
  assert.equal(resultado.consumidores.analiticas.estado, "DESACTIVADO");
  assert.equal(resultado.resumen.ventas, 2);
  assert.deepEqual(resultado.errores, ["Eventos de auditoría: 503", "Cuarentena de analíticas: servicio no disponible", "Consumidor de auditoría: 403"]);
});
