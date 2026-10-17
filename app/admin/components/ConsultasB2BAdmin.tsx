"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api";

type EstadoConsulta = "PENDIENTE" | "RESPONDIDO" | "ARCHIVADO";

type ConsultaB2B = {
  id: number;
  skuProducto: string | null;
  nombreProducto: string | null;
  cantidad: number;
  nombreCliente: string;
  correoContacto: string;
  mensaje: string;
  origen: string;
  estado: EstadoConsulta;
  fechaCreacion: string;
};

const ESTADOS: Array<"TODOS" | EstadoConsulta> = [
  "TODOS",
  "PENDIENTE",
  "RESPONDIDO",
  "ARCHIVADO",
];

const ORIGENES: Record<string, string> = {
  PRODUCTO_MAYORISTA: "Producto mayorista",
  CONTACTO_HOME: "Contacto Home",
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line-soft)",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--line)",
  fontSize: 13,
  background: "var(--surface)",
};

function estadoBadge(estado: string) {
  const mapa: Record<string, { bg: string; color: string }> = {
    PENDIENTE: { bg: "#fef3c7", color: "#92400e" },
    RESPONDIDO: { bg: "#dcfce7", color: "#166534" },
    ARCHIVADO: { bg: "#e5e7eb", color: "#374151" },
  };
  const tono = mapa[estado] || { bg: "#eef2f6", color: "#334155" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 750,
        background: tono.bg,
        color: tono.color,
      }}
    >
      {estado}
    </span>
  );
}

function formatFecha(valor: string) {
  if (!valor) return "—";
  try {
    return new Date(valor).toLocaleString("es-CL", { hour12: false });
  } catch {
    return valor;
  }
}

export default function ConsultasB2BAdmin() {
  const [consultas, setConsultas] = useState<ConsultaB2B[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filtro, setFiltro] = useState<"TODOS" | EstadoConsulta>("TODOS");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConsultas = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = filtro === "TODOS" ? "" : `?estado=${filtro}`;
      const data = await apiRequest<ConsultaB2B[]>(
        `/api/bff/admin/consultas${query}`,
      );
      setConsultas(data || []);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    const timeout = window.setTimeout(loadConsultas, 0);
    return () => window.clearTimeout(timeout);
  }, [loadConsultas]);

  const cambiarEstado = async (consulta: ConsultaB2B, estado: EstadoConsulta) => {
    if (consulta.estado === estado) return;
    setFeedback(null);
    setError(null);
    setUpdatingId(consulta.id);
    try {
      const actualizada = await apiRequest<ConsultaB2B>(
        `/api/bff/admin/consultas/${consulta.id}/estado`,
        { method: "PATCH", body: JSON.stringify({ estado }) },
      );
      setConsultas((prev) =>
        filtro === "TODOS"
          ? prev.map((c) => (c.id === actualizada.id ? actualizada : c))
          : prev.filter((c) => c.id !== actualizada.id),
      );
      setFeedback(`Consulta #${consulta.id} actualizada a ${estado}.`);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--green-950)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Mail size={20} /> Consultas y Cotizaciones B2B
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, marginBottom: 0 }}>
            Solicitudes de cotización mayorista y mensajes de contacto persistidos en db_ventas.consulta_b2b.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={filtro}
            onChange={(event) =>
              setFiltro(event.target.value as "TODOS" | EstadoConsulta)
            }
            style={inputStyle}
          >
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadConsultas}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--green-800)",
              fontSize: 13,
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} /> Refrescar
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            background: "var(--green-100)",
            border: "1px solid #c4dec9",
            borderRadius: 8,
            color: "var(--green-950)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} color="var(--green-700)" /> {feedback}
        </div>
      )}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <section style={cardStyle}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  color: "var(--muted)",
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                <th style={{ padding: "8px 10px" }}>Cliente</th>
                <th style={{ padding: "8px 10px" }}>Correo</th>
                <th style={{ padding: "8px 10px" }}>Producto / Origen</th>
                <th style={{ padding: "8px 10px" }}>Cantidad</th>
                <th style={{ padding: "8px 10px" }}>Mensaje</th>
                <th style={{ padding: "8px 10px" }}>Fecha</th>
                <th style={{ padding: "8px 10px" }}>Estado</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {consultas.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 14, color: "var(--muted)", fontSize: 13 }}>
                    {isLoading
                      ? "Cargando consultas…"
                      : "Aún no hay consultas B2B registradas."}
                  </td>
                </tr>
              )}
              {consultas.map((consulta) => (
                <tr key={consulta.id} style={{ borderTop: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "10px" }}>
                    <div style={{ fontWeight: 650, color: "var(--green-950)" }}>
                      {consulta.nombreCliente}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      #{consulta.id}
                    </div>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <a href={`mailto:${consulta.correoContacto}`} style={{ color: "var(--green-800)" }}>
                      {consulta.correoContacto}
                    </a>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <div>{consulta.nombreProducto || "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {consulta.skuProducto ? `${consulta.skuProducto} · ` : ""}
                      {ORIGENES[consulta.origen] || consulta.origen}
                    </div>
                  </td>
                  <td style={{ padding: "10px" }}>{consulta.cantidad}</td>
                  <td
                    style={{
                      padding: "10px",
                      maxWidth: 280,
                      color: "var(--ink-soft)",
                      fontSize: 12,
                    }}
                  >
                    {consulta.mensaje}
                  </td>
                  <td style={{ padding: "10px", fontSize: 12, color: "var(--ink-soft)" }}>
                    {formatFecha(consulta.fechaCreacion)}
                  </td>
                  <td style={{ padding: "10px" }}>{estadoBadge(consulta.estado)}</td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    <select
                      value={consulta.estado}
                      disabled={updatingId === consulta.id}
                      onChange={(event) =>
                        cambiarEstado(consulta, event.target.value as EstadoConsulta)
                      }
                      style={{ ...inputStyle, width: "auto" }}
                    >
                      {(["PENDIENTE", "RESPONDIDO", "ARCHIVADO"] as EstadoConsulta[]).map(
                        (estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
