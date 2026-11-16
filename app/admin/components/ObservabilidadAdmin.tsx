"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { consultarObservabilidad, type Resumen, type Evento, type Incidente, type Pagina, type EstadoConsumidor } from "@/lib/observabilidad";

const caja: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 12, padding: 18 };
const boton: React.CSSProperties = { padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer" };

export default function ObservabilidadAdmin() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [eventos, setEventos] = useState<Pagina<Evento> | null>(null);
  const [incidentes, setIncidentes] = useState<{ analiticas: Pagina<Incidente> | null; auditoria: Pagina<Incidente> | null; inventario: Pagina<Incidente> | null; compras: Pagina<Incidente> | null }>({ analiticas: null, auditoria: null, inventario: null, compras: null });
  const [consumidores, setConsumidores] = useState<{ analiticas: EstadoConsumidor | null; auditoria: EstadoConsumidor | null }>({ analiticas: null, auditoria: null });
  const [errores, setErrores] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrores([]);
    setResumen(null);
    setEventos(null);
    setIncidentes({ analiticas: null, auditoria: null, inventario: null, compras: null });
    setConsumidores({ analiticas: null, auditoria: null });
    const resultado = await consultarObservabilidad(apiRequest);
    setResumen(resultado.resumen);
    setEventos(resultado.eventos);
    setIncidentes(resultado.incidentes);
    setConsumidores(resultado.consumidores);
    setErrores(resultado.errores);
    setCargando(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void cargar(); }, 0); return () => window.clearTimeout(timer); }, [cargar]);

  return <section style={{ display: "grid", gap: 16 }} aria-label="Analíticas y auditoría">
    <div style={caja}>
      <h2>Analíticas y auditoría</h2>
      <p>Datos procesados de forma asíncrona. Pueden estar retrasados; la última alerta no representa necesariamente el stock actual.</p>
      <button type="button" style={boton} onClick={() => void cargar()} disabled={cargando}>{cargando ? "Cargando…" : "Actualizar"}</button>
      {errores.length > 0 && <div role="alert"><p>No fue posible consultar algunos servicios:</p><ul>{errores.map(error => <li key={error}>{error}</li>)}</ul></div>}
    </div>
    <div style={caja}>
      <h3>Lectura local de consumidores</h3>
      <p>Señales de cada instancia de analíticas y auditoría, no del estado global de Kinesis ni confirmación de eventos nuevos.</p>
      <ul>{(["analiticas", "auditoria"] as const).map(servicio => <li key={servicio}>
        {servicio === "analiticas" ? "Analíticas" : "Auditoría"}: {consumidores[servicio]?.estado ?? (cargando ? "consultando…" : "no disponible")}
      </li>)}</ul>
    </div>
    <div style={caja}>
      <h3>Resumen de eventos</h3>
      {resumen ? <>
        <p>Desde {resumen.desde} hasta antes de {resumen.hastaExclusivo} ({resumen.zona})</p>
        <ul><li>Ventas confirmadas: {resumen.ventas}</li><li>Monto vendido: {resumen.monto}</li>
          <li>Consultas B2B creadas: {resumen.consultasCreadas}</li><li>Cambios de estado B2B: {resumen.cambiosEstado}</li>
          <li>Alertas de stock emitidas: {resumen.alertasEmitidas}</li></ul>
      </> : <p>{cargando ? "Consultando…" : "Resumen no disponible."}</p>}
    </div>
    <div style={caja}>
      <h3>Eventos de auditoría recientes</h3>
      {eventos ? eventos.elementos.length ? <><ul>{eventos.elementos.map(evento => <li key={evento.eventId}>
        {evento.occurredAt} — {evento.eventType} — {evento.producer} — {evento.aggregateType} {evento.aggregateId}
        {evento.correlationId ? ` — correlación: ${evento.correlationId}` : ""}
      </li>)}</ul>{eventos.hayMas && <p>Se muestran los primeros 10 eventos.</p>}</> : <p>No hay eventos en la página consultada.</p>
        : <p>{cargando ? "Consultando…" : "Auditoría no disponible."}</p>}
    </div>
    {(["analiticas", "auditoria", "inventario", "compras"] as const).map(servicio => <div style={caja} key={servicio}>
      <h3>Cuarentena de {servicio === "analiticas" ? "analíticas" : servicio === "auditoria" ? "auditoría" : servicio}</h3>
      {(servicio === "inventario" || servicio === "compras") && <p>Se muestran incidentes pendientes; un checkpoint avanzado no implica que el efecto de negocio se haya aplicado.</p>}
      {incidentes[servicio] ? incidentes[servicio]!.elementos.length ? <>
        <ul>{incidentes[servicio]!.elementos.map(incidente => <li key={incidente.id}>
          {incidente.createdAt} — {incidente.tipoError} — {incidente.stream} / {incidente.shard} / {incidente.sequenceNumber}
        </li>)}</ul>{incidentes[servicio]!.hayMas && <p>Se muestran los primeros 10 incidentes.</p>}
        <p>Solo metadatos; la resolución requiere el procedimiento administrativo correspondiente.</p>
      </> : <p>No hay incidentes en la página consultada.</p> : <p>{cargando ? "Consultando…" : "Cuarentena no disponible."}</p>}
    </div>)}
  </section>;
}
