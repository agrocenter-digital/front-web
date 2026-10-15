"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { quoteMessage, quotationLink, validQuantity } from "@/lib/catalog";
import { company } from "@/lib/company";
import type { Product } from "./ProductCard";
import InquiryForm from "./InquiryForm";

export default function QuoteDialog({
  product,
  initialQuantity,
  onClose,
}: {
  product: Pick<Product, "name" | "sku" | "unit" | "demo">;
  initialQuantity: number;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const panel = useRef<HTMLElement>(null);
  const valid = validQuantity(Number(quantity));
  const whatsapp = valid ? quotationLink(product, Number(quantity), company.whatsapp) : null;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const items = panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <section
        ref={panel}
        className="quote-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-title"
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Cerrar contacto"
        >
          <X />
        </button>
        <span className="eyebrow">Contacto comercial</span>
        <h2 id="quote-title">Cotizar {product.name}</h2>
        <p>
          SKU {product.sku} · {product.unit}. Solicita precio y disponibilidad;
          esto no genera una compra.
        </p>
        <label className="quote-quantity">
          Cantidad solicitada
          <input
            type="number"
            min={1}
            max={2147483647}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        {!valid && (
          <p role="alert">Ingresa una cantidad entera mayor que cero.</p>
        )}
        {whatsapp && <a className="solid-cta" href={whatsapp} target="_blank" rel="noopener noreferrer">Cotizar por WhatsApp ↗</a>}
        {product.demo ? (
          <p>Demostración con producto ficticio. WhatsApp abrirá el mensaje para que elijas un destinatario; no se envía automáticamente y no se genera una compra.</p>
        ) : <InquiryForm
          disabled={!valid}
          initialMessage={valid ? quoteMessage(product, Number(quantity)) : ""}
        />}
      </section>
    </div>
  );
}
