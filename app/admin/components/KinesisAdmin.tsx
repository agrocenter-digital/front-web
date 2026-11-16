"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api";

type Stream = { nombre: string; estado: string; shards: number; retencionHoras: number; modo: string };
type Result = { mensaje: string };
const base = "/api/bff/admin/kinesis/streams";

export default function KinesisAdmin() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("agrocenter-");
  const [shards, setShards] = useState(1);
  const [selected, setSelected] = useState("");
  const [retention, setRetention] = useState(24);
  const [newShards, setNewShards] = useState(1);
  const [confirmation, setConfirmation] = useState("");
  const current = streams.find(s => s.nombre === selected);
  const protectedStream = selected === "agrocenter-kinesis-negocio" || selected === "agrocenter-kinesis-stock";

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setStreams(await apiRequest<Stream[]>(base)); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudieron consultar los streams."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function submit(path: string, method: string, body?: object) {
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = await apiRequest<Result>(base + path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setMessage(result.mensaje); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo confirmar la operación. Comprueba el estado antes de reintentar."); }
    finally { setBusy(false); }
  }
  const target = encodeURIComponent(selected);
  return <section className="kinesis-panel" aria-label="Administración de Kinesis">
    <div className="obs-card">
      <div className="kinesis-heading"><div><span className="admin-eyebrow">PLATAFORMA DE EVENTOS</span><h2><Database size={20} /> Administración de streams</h2><p>Consulta y gestiona streams de AgroCenter en AWS Kinesis. Los cambios pueden generar costos y tardar en aplicarse.</p></div>
        <button className="obs-button" type="button" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={15} /> {loading ? "Consultando…" : "Actualizar"}</button></div>
      <p>Las operaciones de escritura requieren habilitación del operador. Los streams de negocio y stock están protegidos contra eliminación.</p>
      {error && <div className="admin-warning" role="alert">{error}. Si la respuesta fue interrumpida, consulta el estado antes de reintentar.</div>}
      {message && <div className="kinesis-notice" role="status">{message}</div>}
    </div>
    <div className="obs-card"><h3>Streams disponibles</h3><p>Estado consultado en AWS; CREATING, UPDATING y DELETING indican una operación en curso.</p>
      {loading ? <p>Consultando streams…</p> : streams.length ? <div className="kinesis-list">{streams.map(s => <button type="button" key={s.nombre} className={`kinesis-stream ${selected === s.nombre ? "selected" : ""}`} onClick={() => { setSelected(s.nombre); setRetention(s.retencionHoras); setNewShards(s.shards); setConfirmation(""); }}>
        <span><strong>{s.nombre}</strong><small>{s.modo} · {s.shards} shard(s) · {s.retencionHoras} h de retención</small></span><span className="kinesis-status">{s.estado}</span></button>)}</div> : <p>{error ? "No hay resultados disponibles." : "No se encontraron streams con prefijo agrocenter-."}</p>}
    </div>
    <div className="obs-card"><h3>Crear stream</h3><p>Se crea en modo provisionado con retención inicial de AWS. La creación requiere permisos y puede generar cargos.</p>
      <form className="kinesis-form" onSubmit={e => { e.preventDefault(); if (window.confirm(`¿Solicitar la creación de ${name} con ${shards} shard(s)? Puede generar costos.`)) void submit("", "POST", { nombre: name, shards }); }}>
        <label>Nombre<input required pattern="agrocenter-[A-Za-z0-9_.-]{1,100}" value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Shards<input required type="number" min={1} max={10} value={shards} onChange={e => setShards(Number(e.target.value))} /></label>
        <button className="obs-button" disabled={busy}>Solicitar creación</button>
      </form>
    </div>
    <div className="obs-card"><h3>Modificar o eliminar</h3>{!current ? <p>Selecciona un stream de la lista para consultar sus opciones.</p> : <>
      <p><strong>{current.nombre}</strong> · {current.estado}. Solo modifica configuraciones tras evaluar impacto y costos.</p>
      <div className="kinesis-form"><label>Retención en horas<input type="number" min={24} max={8760} value={retention} onChange={e => setRetention(Number(e.target.value))} /></label>
        <button className="obs-button" type="button" disabled={busy || current.estado !== "ACTIVE" || retention < 24 || retention > 8760 || !Number.isInteger(retention)} onClick={() => { if (window.confirm(`¿Cambiar retención de ${selected} a ${retention} horas? Reducirla puede descartar eventos anteriores.`)) void submit(`/${target}/retencion`, "PATCH", { retencionHoras: retention }); }}>Cambiar retención</button></div>
      <div className="kinesis-form"><label>Cantidad de shards<input type="number" min={1} max={10} value={newShards} onChange={e => setNewShards(Number(e.target.value))} /></label>
        <button className="obs-button" type="button" disabled={busy || current.estado !== "ACTIVE" || current.modo !== "PROVISIONED" || newShards < 1 || newShards > 10 || !Number.isInteger(newShards)} onClick={() => { if (window.confirm(`¿Solicitar ${newShards} shard(s) para ${selected}? Puede generar costos y afectar consumidores.`)) void submit(`/${target}/shards`, "PATCH", { shards: newShards }); }}>Cambiar shards</button></div>
      <div className="kinesis-danger"><strong>Eliminar stream</strong><p>{protectedStream ? "Este stream de negocio está protegido contra eliminación." : "Escribe el nombre exacto para confirmar. Esta acción puede afectar consumidores y datos."}</p>
        <div className="kinesis-form"><label>Confirmación<input value={confirmation} disabled={protectedStream} onChange={e => setConfirmation(e.target.value)} /></label><button className="kinesis-delete" type="button" disabled={busy || protectedStream || confirmation !== selected} onClick={() => { if (window.confirm(`¿Eliminar definitivamente ${selected}?`)) void submit(`/${target}?confirmacion=${encodeURIComponent(confirmation)}`, "DELETE"); }}>Solicitar eliminación</button></div>
      </div>
    </>}</div>
  </section>;
}
