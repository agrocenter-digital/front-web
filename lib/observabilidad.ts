export type Resumen = {
  desde: string; hastaExclusivo: string; zona: string; ventas: number; monto: number;
  consultasCreadas: number; cambiosEstado: number; alertasEmitidas: number;
};
export type Evento = {
  eventId: string; occurredAt: string; eventType: string; producer: string;
  aggregateType: string; aggregateId: string; correlationId: string | null;
};
export type Incidente = { id: string; stream: string; shard: string; sequenceNumber: string; tipoError: string; createdAt: string };
export type Pagina<T> = { elementos: T[]; pagina: number; tamano: number; hayMas: boolean };
export type EstadoConsumidor = { estado: "DESACTIVADO" | "DESCONOCIDO" | "LECTURAS_RECIENTES" | "NO_SALUDABLE" };

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
