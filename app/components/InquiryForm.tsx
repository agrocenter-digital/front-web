"use client";
import { useEffect, useId, useState } from "react";
import { apiRequest } from "@/lib/api";
import { readAuthSession } from "@/lib/cognito";
import { company } from "@/lib/company";
import { whatsappUrl } from "@/lib/catalog";

export type InquiryOrigin = "CONTACTO_HOME" | "PRODUCTO_MAYORISTA";

type Inquiry = { id: number };

export default function InquiryForm({
  initialMessage = "",
  disabled = false,
  origin = "CONTACTO_HOME",
  productName,
  productSku,
  quantity,
}: {
  initialMessage?: string;
  disabled?: boolean;
  origin?: InquiryOrigin;
  productName?: string;
  productSku?: string;
  quantity?: number;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState({ source: initialMessage, value: initialMessage });
  const message = draft.source === initialMessage ? draft.value : initialMessage;
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const whatsapp = whatsappUrl(company.whatsapp, message);

  // Prefill del nombre y correo con la sesión autenticada si está disponible.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const session = readAuthSession();
    if (!session) return;
    setName((previous) => previous || session.name || "");
    setEmail((previous) => previous || session.email || "");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <form
      className="inquiry-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || disabled) return;
        setBusy(true);
        setError("");
        try {
          const created = await apiRequest<Inquiry>("/api/bff/consultas", {
            method: "POST",
            body: JSON.stringify({
              nombreCliente: name.trim(),
              correoContacto: email.trim(),
              mensaje: message.trim(),
              origen: origin,
              ...(productSku ? { skuProducto: productSku } : {}),
              ...(productName ? { nombreProducto: productName } : {}),
              ...(quantity && quantity > 0 ? { cantidad: quantity } : {}),
            }),
          });
          setReceipt(created.id);
          setToast("Consulta recibida y guardada. ¡Gracias por contactarnos!");
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "No pudimos conectar. Inténtalo de nuevo.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={`${id}-name`}>
        Nombre
        <input
          id={`${id}-name`}
          name="name"
          autoComplete="name"
          minLength={2}
          maxLength={150}
          required
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label htmlFor={`${id}-email`}>
        Correo de contacto
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={150}
          required
          value={email}
          disabled={busy}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label htmlFor={`${id}-message`}>
        Tu consulta
        <textarea
          id={`${id}-message`}
          name="message"
          rows={5}
          minLength={10}
          maxLength={4000}
          required
          value={message}
          disabled={busy}
          onChange={(event) => {
            setDraft({ source: initialMessage, value: event.target.value });
            setReceipt(null);
          }}
        />
      </label>
      <div className="contact-actions">
        <button className="solid-cta" type="submit" disabled={busy || disabled}>
          {busy ? "Enviando…" : "Enviar consulta"}
        </button>
        {whatsapp && (
          <a
            className="outline-cta"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir WhatsApp ↗
          </a>
        )}
      </div>
      {receipt !== null && (
        <p className="inquiry-success" role="status">
          Consulta recibida y guardada. Tu comprobante es{" "}
          <strong>#{receipt}</strong>. No se ha enviado un mensaje por WhatsApp.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            borderRadius: 10,
            background: "var(--green-800)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 650,
            boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
          }}
        >
          {toast}
        </div>
      )}
    </form>
  );
}
