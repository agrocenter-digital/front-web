"use client";
import { useState } from "react";
import { canBuy, quotationLink } from "@/lib/catalog";
import { company } from "@/lib/company";

export default function ProductAction({
  product,
  onAdd,
  onQuote,
}: {
  product: {
    name: string;
    sku?: string;
    unit: string;
    price: number | null;
    stock: number;
    quoteOnly: boolean;
    demo?: boolean;
  };
  onAdd: (quantity: number) => void;
  onQuote?: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  return (
    <form
      className="product-action"
      onSubmit={(event) => {
        event.preventDefault();
        if (product.quoteOnly) {
          try {
            const link = quotationLink(product, Number(quantity), company.whatsapp);
            if (link) {
              window.open(link, "_blank", "noopener,noreferrer");
              setError("");
              return;
            }
            window.dispatchEvent(
              new CustomEvent("agrocenter:quote", {
                detail: { product, quantity: Number(quantity) },
              }),
            );
            onQuote?.();
          } catch {
            setError("Ingresa una cantidad entera positiva.");
          }
        } else if (canBuy(product, Number(quantity))) {
          onAdd(Number(quantity));
          setError("");
        } else setError("Revisa la cantidad y el stock disponible.");
      }}
    >
      <label>
        Cantidad
        <input
          aria-label={`Cantidad de ${product.name}`}
          type="number"
          min="1"
          max={product.quoteOnly ? 2147483647 : product.stock}
          step="1"
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </label>
      <button
        className={`add-button ${product.quoteOnly ? "quote-button" : ""}`}
        disabled={!product.quoteOnly && !canBuy(product, 1)}
        type="submit"
      >
        {product.quoteOnly ? "Cotizar por WhatsApp" : "Agregar al carrito"}
      </button>
      {product.demo && product.quoteOnly && <small>Prueba: elige destinatario en WhatsApp. No se envía automáticamente.</small>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
