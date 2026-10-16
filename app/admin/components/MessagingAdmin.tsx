"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Network,
  Plus,
  RefreshCw,
  Route,
  Send,
  Server,
  Trash2,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type TopicPartition = {
  particion: number;
  lider: number | null;
  replicas: number[];
  sincronizadas: number[];
  offsetFinal: number | null;
};

type TopicStatus = {
  nombre: string;
  estado: string;
  totalParticiones: number;
  factorReplicacion: number;
  mensajesTotales: number;
  detalle: string;
  particiones: TopicPartition[];
};

type RoutingRule = {
  id: string;
  nombre: string;
  topicoOrigen: string;
  topicoDestino: string | null;
  condicion: string | null;
  estado: string;
  descripcion: string | null;
  fechaCreacion: string;
};

type EventTrace = {
  id: number;
  fecha: string;
  servicio: string;
  topico: string;
  direccion: string;
  clave: string;
  estado: string;
  detalle: string;
};

type Trazabilidad = {
  eventos: EventTrace[];
  advertencias: string[];
};

const ESTADOS_EVENTO = ["TODOS", "EXITO", "REINTENTO", "ERROR"];

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line-soft)",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

function estadoBadge(estado: string) {
  const mapa: Record<string, { bg: string; color: string }> = {
    ACTIVO: { bg: "#dcfce7", color: "#166534" },
    EXITO: { bg: "#dcfce7", color: "#166534" },
    DEGRADADO: { bg: "#fef3c7", color: "#92400e" },
    REINTENTO: { bg: "#fef3c7", color: "#92400e" },
    ERROR: { bg: "#fee2e2", color: "#991b1b" },
    PAUSADA: { bg: "#e5e7eb", color: "#374151" },
  };
  const tono = mapa[estado] || { bg: "#eef2f6", color: "#334155" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
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

export default function MessagingAdmin() {
  const [topicos, setTopicos] = useState<TopicStatus[]>([]);
  const [reglas, setReglas] = useState<RoutingRule[]>([]);
  const [eventos, setEventos] = useState<EventTrace[]>([]);
  const [advertencias, setAdvertencias] = useState<string[]>([]);

  const [isLoadingTopicos, setIsLoadingTopicos] = useState(false);
  const [isLoadingReglas, setIsLoadingReglas] = useState(false);
  const [isLoadingEventos, setIsLoadingEventos] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Formulario de reglas de encaminamiento
  const [ruleNombre, setRuleNombre] = useState("");
  const [ruleOrigen, setRuleOrigen] = useState("ordenes-compras");
  const [ruleDestino, setRuleDestino] = useState("");
  const [ruleCondicion, setRuleCondicion] = useState("");
  const [ruleDescripcion, setRuleDescripcion] = useState("");
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  // Filtro del visor de eventos
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const loadTopicos = useCallback(async () => {
    setIsLoadingTopicos(true);
    try {
      setTopicos(await apiRequest<TopicStatus[]>("/api/bff/admin/mensajeria/topicos"));
    } catch (error) {
      setErrorFeedback((error as Error).message);
    } finally {
      setIsLoadingTopicos(false);
    }
  }, []);

  const loadReglas = useCallback(async () => {
    setIsLoadingReglas(true);
    try {
      setReglas(await apiRequest<RoutingRule[]>("/api/bff/admin/mensajeria/reglas"));
    } catch (error) {
      setErrorFeedback((error as Error).message);
    } finally {
      setIsLoadingReglas(false);
    }
  }, []);

  const loadEventos = useCallback(async (silencioso = false) => {
    if (!silencioso) setIsLoadingEventos(true);
    try {
      const data = await apiRequest<Trazabilidad>("/api/bff/admin/mensajeria/eventos?limite=80");
      setEventos(data.eventos || []);
      setAdvertencias(data.advertencias || []);
    } catch (error) {
      setErrorFeedback((error as Error).message);
    } finally {
      if (!silencioso) setIsLoadingEventos(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadTopicos();
      loadReglas();
      loadEventos();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadTopicos, loadReglas, loadEventos]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      loadEventos(true);
      loadTopicos();
    }, 6000);
    return () => window.clearInterval(id);
  }, [autoRefresh, loadEventos, loadTopicos]);

  const handleCreateRule = async (event: FormEvent) => {
    event.preventDefault();
    setRuleError(null);
    setFeedback(null);
    setErrorFeedback(null);

    if (!ruleNombre.trim()) {
      setRuleError("El nombre de la regla es obligatorio.");
      return;
    }
    if (!ruleOrigen.trim()) {
      setRuleError("El tópico de origen es obligatorio.");
      return;
    }

    setIsCreatingRule(true);
    try {
      const nueva = await apiRequest<RoutingRule>("/api/bff/admin/mensajeria/reglas", {
        method: "POST",
        body: JSON.stringify({
          nombre: ruleNombre.trim(),
          topicoOrigen: ruleOrigen.trim(),
          topicoDestino: ruleDestino.trim() || null,
          condicion: ruleCondicion.trim() || null,
          estado: "ACTIVA",
          descripcion: ruleDescripcion.trim() || null,
        }),
      });
      setReglas((prev) => [nueva, ...prev]);
      setFeedback(`Regla "${nueva.nombre}" registrada correctamente.`);
      setRuleNombre("");
      setRuleDestino("");
      setRuleCondicion("");
      setRuleDescripcion("");
    } catch (error) {
      setRuleError((error as Error).message);
    } finally {
      setIsCreatingRule(false);
    }
  };

  const handleDeleteRule = async (regla: RoutingRule) => {
    setFeedback(null);
    setErrorFeedback(null);
    try {
      await apiRequest<void>(`/api/bff/admin/mensajeria/reglas/${regla.id}`, { method: "DELETE" });
      setReglas((prev) => prev.filter((r) => r.id !== regla.id));
      setFeedback(`Regla "${regla.nombre}" eliminada.`);
    } catch (error) {
      setErrorFeedback((error as Error).message);
    }
  };

  const eventosFiltrados =
    filtroEstado === "TODOS" ? eventos : eventos.filter((e) => e.estado === filtroEstado);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid var(--line)",
    fontSize: 13,
    background: "var(--surface)",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
    color: "var(--green-950)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--green-950)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Network size={20} /> Administración de Mensajería (Kafka)
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, marginBottom: 0 }}>
            Gestión de tópicos y destinos, reglas de encaminamiento y trazabilidad de eventos asíncronos.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresco
          </label>
          <button
            type="button"
            onClick={() => {
              loadTopicos();
              loadReglas();
              loadEventos();
            }}
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--green-100)", border: "1px solid #c4dec9", borderRadius: 8, color: "var(--green-950)", fontSize: 13, fontWeight: 600 }}>
          <CheckCircle2 size={16} color="var(--green-700)" /> {feedback}
        </div>
      )}
      {errorFeedback && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13, fontWeight: 600 }}>
          <AlertTriangle size={16} /> {errorFeedback}
        </div>
      )}

      {/* Gestor de tópicos */}
      <section style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--green-950)", margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <Server size={17} /> Gestor de Tópicos y Destinos
          {isLoadingTopicos && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>cargando…</span>}
        </h3>
        <div style={{ display: "grid", gap: 12 }}>
          {topicos.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No hay tópicos disponibles para consultar.</p>
          )}
          {topicos.map((topico) => (
            <div key={topico.nombre} style={{ border: "1px solid var(--line-soft)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <code style={{ fontSize: 14, fontWeight: 700, color: "var(--green-900)" }}>{topico.nombre}</code>
                  {estadoBadge(topico.estado)}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--ink-soft)" }}>
                  <span>Particiones: <strong>{topico.totalParticiones}</strong></span>
                  <span>Replicación: <strong>{topico.factorReplicacion}</strong></span>
                  <span>Mensajes: <strong>{topico.mensajesTotales.toLocaleString("es-CL")}</strong></span>
                </div>
              </div>
              {topico.particiones.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {topico.particiones.map((p) => (
                    <span key={p.particion} style={{ fontSize: 11, fontFamily: "monospace", background: "#f0f4f1", padding: "3px 8px", borderRadius: 6, color: "var(--green-950)" }}>
                      P{p.particion} · líder={p.lider ?? "-"} · offset={p.offsetFinal ?? "-"}
                    </span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>{topico.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reglas de encaminamiento */}
      <section style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--green-950)", margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <Route size={17} /> Reglas de Distribución y Encaminamiento
        </h3>

        <form onSubmit={handleCreateRule} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 6 }}>
          <label style={labelStyle}>
            Nombre de la regla *
            <input style={{ ...inputStyle, marginTop: 4 }} value={ruleNombre} maxLength={80} onChange={(e) => setRuleNombre(e.target.value)} placeholder="Ej: Reabastecer semillas" />
          </label>
          <label style={labelStyle}>
            Tópico de origen *
            <select style={{ ...inputStyle, marginTop: 4 }} value={ruleOrigen} onChange={(e) => setRuleOrigen(e.target.value)}>
              {topicos.length > 0 ? (
                topicos.map((t) => <option key={t.nombre} value={t.nombre}>{t.nombre}</option>)
              ) : (
                <>
                  <option value="ordenes-compras">ordenes-compras</option>
                  <option value="inventario-critico">inventario-critico</option>
                </>
              )}
            </select>
          </label>
          <label style={labelStyle}>
            Tópico de destino (canal)
            <input style={{ ...inputStyle, marginTop: 4 }} value={ruleDestino} maxLength={120} onChange={(e) => setRuleDestino(e.target.value)} placeholder="Ej: alertas-criticas" />
          </label>
          <label style={labelStyle}>
            Condición
            <input style={{ ...inputStyle, marginTop: 4 }} value={ruleCondicion} maxLength={200} onChange={(e) => setRuleCondicion(e.target.value)} placeholder="Ej: stockActual <= stockMinimo" />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            Descripción
            <input style={{ ...inputStyle, marginTop: 4 }} value={ruleDescripcion} maxLength={300} onChange={(e) => setRuleDescripcion(e.target.value)} placeholder="Detalle del propósito de la regla" />
          </label>
          {ruleError && (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 6, color: "#991b1b", fontSize: 12, fontWeight: 600 }}>
              <AlertTriangle size={14} /> {ruleError}
            </div>
          )}
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={isCreatingRule || !ruleNombre.trim() || !ruleOrigen.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--green-700)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: isCreatingRule || !ruleNombre.trim() || !ruleOrigen.trim() ? "not-allowed" : "pointer",
                opacity: isCreatingRule || !ruleNombre.trim() || !ruleOrigen.trim() ? 0.6 : 1,
              }}
            >
              <Plus size={15} /> {isCreatingRule ? "Registrando…" : "Registrar regla"}
            </button>
          </div>
        </form>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "8px 10px" }}>Regla</th>
                <th style={{ padding: "8px 10px" }}>Origen</th>
                <th style={{ padding: "8px 10px" }}>Destino</th>
                <th style={{ padding: "8px 10px" }}>Condición</th>
                <th style={{ padding: "8px 10px" }}>Estado</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reglas.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: "var(--muted)", fontSize: 13 }}>
                    {isLoadingReglas ? "Cargando reglas…" : "Aún no hay reglas de encaminamiento registradas."}
                  </td>
                </tr>
              )}
              {reglas.map((regla) => (
                <tr key={regla.id} style={{ borderTop: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "10px" }}>
                    <div style={{ fontWeight: 650, color: "var(--green-950)" }}>{regla.nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{regla.descripcion || regla.id}</div>
                  </td>
                  <td style={{ padding: "10px" }}><code style={{ fontSize: 12 }}>{regla.topicoOrigen}</code></td>
                  <td style={{ padding: "10px" }}><code style={{ fontSize: 12 }}>{regla.topicoDestino || "—"}</code></td>
                  <td style={{ padding: "10px", fontSize: 12, color: "var(--ink-soft)" }}>{regla.condicion || "—"}</td>
                  <td style={{ padding: "10px" }}>{estadoBadge(regla.estado)}</td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(regla)}
                      title="Eliminar regla"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff5f5", color: "#b91c1c", fontSize: 12, fontWeight: 650, cursor: "pointer" }}
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Visor de logs / monitor de eventos */}
      <section style={cardStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--green-950)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={17} /> Visor de Logs / Monitor de Eventos
            {isLoadingEventos && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>actualizando…</span>}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Estado:</span>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
              {ESTADOS_EVENTO.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        {advertencias.length > 0 && (
          <div style={{ marginBottom: 12, padding: "8px 14px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
            {advertencias.map((a) => <div key={a}>⚠ {a}</div>)}
          </div>
        )}

        <div
          style={{
            background: "#0f1c14",
            borderRadius: 10,
            padding: 14,
            maxHeight: 380,
            overflowY: "auto",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            color: "#d1fae5",
          }}
        >
          {eventosFiltrados.length === 0 && (
            <div style={{ color: "#6b8f7a" }}>Sin eventos registrados todavía. Los eventos aparecerán aquí a medida que fluyan por Kafka.</div>
          )}
          {eventosFiltrados.map((evento) => {
            const colorEstado = evento.estado === "ERROR" ? "#fca5a5" : evento.estado === "REINTENTO" ? "#fcd34d" : "#86efac";
            const Icono = evento.estado === "ERROR" ? XCircle : evento.estado === "REINTENTO" ? AlertTriangle : CheckCircle2;
            return (
              <div key={`${evento.servicio}-${evento.id}`} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(209,250,229,0.08)" }}>
                <Icono size={14} color={colorEstado} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ color: "#6b8f7a", flexShrink: 0 }}>
                  <Clock size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  {formatFecha(evento.fecha)}
                </span>
                <span style={{ color: colorEstado, flexShrink: 0 }}>[{evento.estado}]</span>
                <span style={{ color: "#5eead4", flexShrink: 0 }}>{evento.servicio}</span>
                <span style={{ color: "#93c5fd", flexShrink: 0 }}>{evento.direccion}</span>
                <span style={{ color: "#e2e8f0", flexShrink: 0 }}>{evento.topico}</span>
                <span style={{ color: "#94a3b8" }}>clave={evento.clave} · {evento.detalle}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
