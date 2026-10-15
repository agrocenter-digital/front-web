// Fixtures only used on a failed catalog request in development.
export const demoCatalog = [
  { id: -1, sku: "DEMO-SEM", name: "Semillas para huerto · Demo", category: "Semillas", price: 2500, stock: 20, unit: "Sobre", quoteOnly: false, image: "/product-placeholder.svg", description: "Producto ficticio para probar cantidades y carrito." },
  { id: -2, sku: "DEMO-HER", name: "Pala de jardín · Demo", category: "Herramientas", price: 12900, stock: 8, unit: "Unidad", quoteOnly: false, image: "/product-placeholder.svg", description: "Producto ficticio para probar el flujo minorista." },
  { id: -3, sku: "DEMO-TRA", name: "Tractor agrícola · Demo", category: "Maquinaria", price: null, stock: 0, unit: "Unidad", quoteOnly: true, image: "/tractor-campo.jpg", description: "Maquinaria ficticia para probar la cotización. La fotografía es referencial." },
  { id: -4, sku: "DEMO-FER", name: "Fertilizante por mayor · Demo", category: "Fertilizantes", price: null, stock: 0, unit: "Saco de 25 kg", quoteOnly: true, image: "/product-placeholder.svg", description: "Producto ficticio: solicita la cantidad de sacos que quieras cotizar." },
].map((product) => ({ ...product, demo: true as const }));

export function demoFallback(environment: string | undefined) {
  return environment === "development" ? demoCatalog : [];
}
