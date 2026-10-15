"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readAuthSession } from "@/lib/cognito";
import { apiRequest } from "@/lib/api";
import { verifyAdminAccess } from "@/lib/admin-access";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    verifyAdminAccess(readAuthSession(), () => apiRequest("/api/bff/admin/dashboard", {
      signal: controller.signal,
      cache: "no-store",
    })).then((allowed) => {
      if (active) setStatus(allowed ? "allowed" : "denied");
      window.clearTimeout(timeout);
    });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  if (status === "allowed") return children;
  return (
    <main className="shell section" style={{ paddingBlock: 80 }}>
      <h1>{status === "checking" ? "Verificando acceso…" : "Acceso restringido"}</h1>
      <p role="status" style={{ marginBlock: 24 }}>
        {status === "checking"
          ? "Estamos comprobando tus permisos de administración."
          : "No pudimos autorizar el acceso. Inicia sesión con una cuenta administradora desde Mi cuenta. Si ya lo hiciste, verifica la conexión e inténtalo de nuevo."}
      </p>
      <Link className="solid-cta" href="/">Volver al inicio</Link>
    </main>
  );
}
