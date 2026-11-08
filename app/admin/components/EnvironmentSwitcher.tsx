"use client";

import { useSyncExternalStore } from "react";
import { Server } from "lucide-react";
import { readAuthSession } from "@/lib/cognito";
import type { EnvironmentTarget } from "@/lib/environments";
import {
  buildEnvironmentUrl,
  environmentTargets,
  hostnameOf,
} from "@/lib/environments";

function subscribeToLocation() {
  // El hostname no cambia durante la vida de la pestaña; no hace falta suscribirse.
  return () => {};
}

export default function EnvironmentSwitcher() {
  const currentHost = useSyncExternalStore(
    subscribeToLocation,
    () => window.location.hostname,
    () => ""
  );

  function openEnvironment(target: EnvironmentTarget) {
    // Se relee la sesión al momento del clic para propagar el token más reciente.
    window.location.assign(buildEnvironmentUrl(target.url, readAuthSession()));
  }

  return (
    <nav
      aria-label="Cambiar entorno de administración"
      className="flex items-center gap-1.5"
    >
      <span className="hidden items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#d9e9df]/75 sm:flex">
        <Server aria-hidden="true" className="h-3 w-3 text-[var(--lime)]" />
        Cambiar entorno
      </span>

      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-0.5">
        {environmentTargets.map((target) => {
          const isCurrent = currentHost !== "" && currentHost === hostnameOf(target.url);

          return (
            <button
              key={target.id}
              type="button"
              onClick={() => openEnvironment(target)}
              title={`Abrir ${target.label}: ${target.description}`}
              aria-label={`Abrir entorno ${target.label} (${target.description})`}
              aria-current={isCurrent ? "true" : undefined}
              className={[
                "inline-flex h-6 min-w-8 items-center justify-center rounded-full px-2 text-[10px] font-extrabold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lime)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--green-950)]",
                isCurrent
                  ? "bg-[var(--lime)] text-[var(--green-950)]"
                  : "text-[#d9e9df] hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {target.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
