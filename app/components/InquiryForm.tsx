"use client";
import { useEffect, useId, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { readAuthSession } from "@/lib/cognito";
import { company } from "@/lib/company";
import { whatsappUrl } from "@/lib/catalog";

export type InquiryOrigin = "CONTACTO_HOME" | "PRODUCTO_MAYORISTA";

type Inquiry = { id: number };

const CONFIRMATIONS: Record<InquiryOrigin, string> = {
  CONTACTO_HOME: "Gracias por tomarte el tiempo de escribirnos",
  PRODUCTO_MAYORISTA: "Nos contactaremos con usted a la brevedad",
};

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
  const [emailLocked, setEmailLocked] = useState(false);
  const [draft, setDraft] = useState({ source: initialMessage, value: initialMessage });
  const message = draft.source === initialMessage ? draft.value : initialMessage;
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const whatsapp = whatsappUrl(company.whatsapp, message);

  // El nombre siempre inicia vacío. Solo el correo se prellena y bloquea cuando
  // existe una sesión activa con correo conocido.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const sessionEmail = readAuthSession()?.email?.trim();
    if (!sessionEmail) return;
    setEmail(sessionEmail);
    setEmailLocked(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!confirmation) return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmation("");
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [confirmation]);

  return (
    <>
      <form
        className="inquiry-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || disabled) return;
          setBusy(true);
          setError("");
          try {
            await apiRequest<Inquiry>("/api/bff/consultas", {
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
            setConfirmation(CONFIRMATIONS[origin]);
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
            disabled={busy || emailLocked}
            readOnly={emailLocked}
            aria-readonly={emailLocked || undefined}
            style={
              emailLocked
                ? {
                    background: "#eef1ee",
                    color: "var(--muted)",
                    cursor: "not-allowed",
                  }
                : undefined
            }
            onChange={(event) => setEmail(event.target.value)}
          />
          {emailLocked && (
            <small style={{ display: "block", marginTop: 6, color: "var(--muted)", fontWeight: 400 }}>
              Se usará el correo de tu cuenta para responder esta consulta.
            </small>
          )}
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
            onChange={(event) =>
              setDraft({ source: initialMessage, value: event.target.value })
            }
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
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>

      {confirmation && (
        <div className="modal-backdrop">
          <section
            className="quote-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-confirmation-title`}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setConfirmation("")}
              aria-label="Cerrar confirmación"
            >
              <X />
            </button>
            <span className="eyebrow">Consulta enviada</span>
            <h2
              id={`${id}-confirmation-title`}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <CheckCircle2 color="var(--green-700)" aria-hidden="true" />
              ¡Gracias!
            </h2>
            <p>{confirmation}</p>
            <button
              className="solid-cta"
              type="button"
              onClick={() => setConfirmation("")}
            >
              Entendido
            </button>
          </section>
        </div>
      )}
    </>
  );
}
