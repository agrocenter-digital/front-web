export type Fecha = string | number | number[];
export type Resumen = {
  desde: Fecha; hastaExclusivo: Fecha; zona: string; ventas: number; monto: number;
  consultasCreadas: number; cambiosEstado: number; alertasEmitidas: number;
};
export type Evento = {
  eventId: string; occurredAt: Fecha; eventType: string; producer: string;
  aggregateType: string; aggregateId: string; correlationId: string | null;
};
export type Incidente = { id: string; stream: string; shard: string; sequenceNumber: string; tipoError: string; createdAt: Fecha };
export type Pagina<T> = { elementos: T[]; pagina: number; tamano: number; hayMas: boolean };
export type LecturaShard = {
  stream: string | null; aplicacion: string; shard: string | null; lagMs: number | null;
  antiguedadMs: number | null; lecturaAntigua: boolean; reintentando: boolean; consumidorActivo: boolean;
};
// Opcional mientras los servicios anteriores sigan desplegados.
export type EstadoConsumidor = { estado: "DESACTIVADO" | "DESCONOCIDO" | "LECTURAS_RECIENTES" | "NO_SALUDABLE"; lecturas?: LecturaShard[] };

export function duracionMs(valor: number | null | undefined): string {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) return "No disponible";
  if (valor < 1000) return `${Math.round(valor)} ms`;
  if (valor < 60000) return `${(valor / 1000).toFixed(1)} s`;
  return `${(valor / 60000).toFixed(1)} min`;
}

export function formatearFecha(valor: Fecha | null | undefined, soloDia = false): string {
  if (Array.isArray(valor)) {
    if (valor.length !== 3 || !valor.every(Number.isInteger)) return "Fecha no disponible";
    const [ano, mes, dia] = valor;
    const fecha = new Date(Date.UTC(ano, mes - 1, dia));
    if (fecha.getUTCFullYear() !== ano || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return "Fecha no disponible";
    return fecha.toISOString().slice(0, 10);
  }
  if (typeof valor !== "string" && typeof valor !== "number") return "Fecha no disponible";
  const fecha = new Date(typeof valor === "number" ? valor * 1000 : valor);
  if (Number.isNaN(fecha.getTime())) return "Fecha no disponible";
  const iso = fecha.toISOString();
  return soloDia ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

export async function consultarObservabilidad(request: <T>(url: string) => Promise<T>) {
  const resultados = await Promise.allSettled([
    request<Resumen>("/api/bff/admin/analiticas/resumen"),
    request<Pagina<Evento>>("/api/bff/admin/auditoria/eventos?tamano=10"),
    request<Pagina<Incidente>>("/api/bff/admin/analiticas/cuarentena?tamano=10"),
    request<Pagina<Incidente>>("/api/bff/admin/auditoria/cuarentena?tamano=10"),
    request<EstadoConsumidor>("/api/bff/admin/analiticas/estado-consumidor"),
    request<EstadoConsumidor>("/api/bff/admin/auditoria/estado-consumidor"),
    request<Pagina<Incidente>>("/api/bff/admin/inventario/cuarentena?tamano=10"),
    request<Pagina<Incidente>>("/api/bff/admin/compras/cuarentena?tamano=10"),
  ] as const);
  const nombres = ["Resumen de analíticas", "Eventos de auditoría", "Cuarentena de analíticas", "Cuarentena de auditoría", "Consumidor de analíticas", "Consumidor de auditoría", "Cuarentena de inventario", "Cuarentena de compras"];
  return {
    resumen: resultados[0].status === "fulfilled" ? resultados[0].value : null,
    eventos: resultados[1].status === "fulfilled" ? resultados[1].value : null,
    incidentes: {
      analiticas: resultados[2].status === "fulfilled" ? resultados[2].value : null,
      auditoria: resultados[3].status === "fulfilled" ? resultados[3].value : null,
      inventario: resultados[6].status === "fulfilled" ? resultados[6].value : null,
      compras: resultados[7].status === "fulfilled" ? resultados[7].value : null,
    },
    consumidores: {
      analiticas: resultados[4].status === "fulfilled" ? resultados[4].value : null,
      auditoria: resultados[5].status === "fulfilled" ? resultados[5].value : null,
    },
    errores: resultados.flatMap((resultado, indice) => resultado.status === "rejected"
      ? [`${nombres[indice]}: ${resultado.reason instanceof Error ? resultado.reason.message : "servicio no disponible"}`] : []),
  };
}
