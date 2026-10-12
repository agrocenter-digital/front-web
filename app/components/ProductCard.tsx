"use client";
import { Heart } from "lucide-react";
import ProductAction from "./ProductAction";

export type Product = {
  demo?: boolean;
  id: number;
  name: string;
  category: string;
  price: number | null;
  image: string;
  unit: string;
  stock: number;
  description: string;
  sku: string;
  quoteOnly: boolean;
};
const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function ProductCard({
  product,
  saved,
  onSave,
  onSelect,
  onAdd,
}: {
  product: Product;
  saved: boolean;
  onSave: () => void;
  onSelect: () => void;
  onAdd: (quantity: number) => void;
}) {
  return (
    <article className="product-card">
      <div className="product-photo-wrap">
        <button
          className="product-image product-image-button"
          type="button"
          onClick={onSelect}
          aria-label={`Ver detalle de ${product.name}`}
        >
          {/* La imagen viene del catálogo; no se permite al optimizador descargar hosts arbitrarios. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={
              product.image === "/product-placeholder.svg"
                ? "Imagen de producto pendiente"
                : product.name
            }
            loading="lazy"
            width="400"
            height="300"
            onError={(event) => {
              event.currentTarget.src = "/product-placeholder.svg";
            }}
          />
          <span>{product.quoteOnly ? "Cotización" : "Compra minorista"}</span>
        </button>
        <button
          className="save-product"
          type="button"
          aria-label={`Guardar ${product.name}`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-info">
        <p>{product.category}</p>
        <button className="product-title" type="button" onClick={onSelect}>
          <h3>{product.name}</h3>
        </button>
        <small>
          SKU {product.sku} · {product.unit}
        </small>
        <p className="stock-label">
          {product.quoteOnly
            ? "Disponibilidad a confirmar"
            : product.stock > 0
              ? `${product.stock} unidades disponibles`
              : "Sin stock"}
        </p>
        <div className="product-price">
          <strong>
            {product.quoteOnly
              ? "Precio a cotizar"
              : product.price === null
                ? "Precio no disponible"
                : money.format(product.price)}
          </strong>
        </div>
        <ProductAction product={product} onAdd={onAdd} />
      </div>
    </article>
  );
}
