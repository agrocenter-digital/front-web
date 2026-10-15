"use client";
import { useId, useState } from "react";
import { company } from "@/lib/company";
import { whatsappUrl } from "@/lib/catalog";

export default function InquiryForm({
  initialMessage = "",
  disabled = false,
}: {
  initialMessage?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState({ source: initialMessage, value: initialMessage });
  const message = draft.source === initialMessage ? draft.value : initialMessage;
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [receiptMessage, setReceiptMessage] = useState("");
  const currentReceipt = receiptMessage === message ? receipt : "";
  const [error, setError] = useState("");
  const whatsapp = whatsappUrl(company.whatsapp, message);
  return (
    <form
      className="inquiry-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || disabled) return;
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        setError("");
        setReceipt("");
        try {
          const response = await fetch("/api/consultas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: values.get("name"),
              email: values.get("email"),
              message,
            }),
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.message || "No pudimos guardar tu consulta.");
          setReceipt(data.id);
          setReceiptMessage(message);
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
          maxLength={120}
          required
          disabled={busy}
        />
      </label>
      <label htmlFor={`${id}-email`}>
        Correo de contacto
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          disabled={busy}
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
            setReceipt("");
          }}
        />
      </label>
      <div className="contact-actions">
        <button
          className="solid-cta"
          type="submit"
          disabled={busy || disabled || !!currentReceipt}
        >
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
      {currentReceipt && (
        <p className="inquiry-success" role="status">
          Consulta recibida y guardada. Tu comprobante es{" "}
          <strong>{currentReceipt}</strong>. No se ha enviado un mensaje por WhatsApp.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
