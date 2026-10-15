// Solo QA local. Nunca se importa desde la aplicación ni se incluye en producción.
import { createServer } from "node:http";
const products = [
  { id: 1, sku: "QA-SEM", nombre: "Semilla de prueba QA", categoria: "Semillas QA", descripcion: "Fixture exclusiva de pruebas", precioVenta: 1500, stockActual: 5, activo: true, soloCotizacion: false },
  { id: 2, sku: "QA-EQ", nombre: "Equipo de prueba QA", categoria: "Equipos QA", descripcion: "Fixture exclusiva de pruebas", precioVenta: 120000, stockActual: 2, activo: true, soloCotizacion: true },
  { id: 3, sku: "QA-AGOTADO", nombre: "Producto agotado QA", categoria: "Semillas QA", descripcion: "Fixture exclusiva de pruebas", precioVenta: 2000, stockActual: 0, activo: true, soloCotizacion: false },
];
createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Idempotency-Key");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (request.method === "GET" && request.url === "/api/bff/catalogo") { response.end(JSON.stringify(products)); return; }
  response.writeHead(403); response.end(JSON.stringify({ message: "Servidor de fixtures: no admite transacciones" }));
}).listen(4010, "127.0.0.1", () => console.log("Fixtures QA en http://localhost:4010; sin transacciones"));
