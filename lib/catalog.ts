export type CatalogItem = {
  id: number;
  sku: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precioVenta: number | null;
  stockActual: number;
  activo: boolean;
  soloCotizacion?: boolean;
  imagenUrl?: string;
  presentacion?: string;
};

export function validQuantity(quantity: number) {
  return (
    Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 2147483647
  );
}

export function quoteMessage(
  product: { name: string; sku?: string; unit?: string },
  quantity: number,
) {
  if (!validQuantity(quantity))
    throw new Error("Ingresa una cantidad entera positiva.");
  return `Hola, quisiera solicitar una cotización en Agrocenter para el producto ${product.name}${product.sku ? `, SKU ${product.sku}` : ""}, cantidad ${quantity}${product.unit ? `, presentación ${product.unit}` : ""}. ¿Podrían indicarme precio y disponibilidad?`;
}

export function whatsappUrl(number: string, message: string) {
  const digits = number.trim().replace(/^\+/, "");
  return /^[1-9]\d{7,14}$/.test(digits)
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : null;
}

export function canBuy(
  product: { quoteOnly: boolean; price: number | null; stock: number },
  quantity: number,
) {
  return (
    !product.quoteOnly &&
    product.price !== null &&
    Number.isFinite(product.price) &&
    product.price >= 0 &&
    validQuantity(quantity) &&
    quantity <= product.stock
  );
}

export function quotationLink(
  product: { name: string; sku?: string; unit?: string; demo?: boolean },
  quantity: number,
  commercialNumber: string,
) {
  const message = quoteMessage(product, quantity);
  if (product.demo) {
    return `https://wa.me/?text=${encodeURIComponent("[DEMOSTRACIÓN — producto ficticio] " + message)}`;
  }
  return whatsappUrl(commercialNumber, message);
}
