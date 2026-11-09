import type { AuthSession } from "./cognito";

export type EnvironmentTarget = {
  id: "v1" | "v2";
  label: string;
  url: string;
  description: string;
};

// Las URLs pueden sobreescribirse en build-time sin tocar el código.
// NEXT_PUBLIC_ENV_V1_URL / NEXT_PUBLIC_ENV_V2_URL (ej. http://44.195.118.58:3000).
const v1Url = (process.env.NEXT_PUBLIC_ENV_V1_URL || "http://44.195.118.58:3000").replace(/\/$/, "");
const v2Url = (process.env.NEXT_PUBLIC_ENV_V2_URL || "http://34.195.64.174:3000").replace(/\/$/, "");

function describeEnvironment(label: string, url: string) {
  try {
    return `EC2 ${label} · ${new URL(url).host}`;
  } catch {
    return `Entorno ${label}`;
  }
}

export const environmentTargets: EnvironmentTarget[] = [
  {
    id: "v1",
    label: "V1",
    url: v1Url,
    description: describeEnvironment("V1", v1Url),
  },
  {
    id: "v2",
    label: "V2",
    url: v2Url,
    description: describeEnvironment("V2", v2Url),
  },
];

export function hostnameOf(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

/**
 * Construye la URL de destino propagando la sesión de Cognito.
 *
 * El access token y el id_token viajan en el **fragmento** (`#token=...`), no
 * en el query string. El fragmento no se envía al servidor Nginx, no queda en
 * logs de acceso y no se filtra por la cabecera `Referer`. El panel de la EC2
 * lee ambos formatos, pero el fragmento es el mecanismo preferido.
 *
 * `token` es el access token porque es el único que validan los Resource
 * Servers del BFF (`token_use=access`). `idToken` se conserva aparte para
 * reconstruir los grupos/rol del operador sin obligar a un nuevo login.
 */
export function buildEnvironmentUrl(baseUrl: string, session: AuthSession | null): string {
  let target: URL;
  try {
    target = new URL(baseUrl);
  } catch {
    return baseUrl;
  }

  // La vista de administración es el punto natural de entrada entre entornos.
  if (target.pathname === "/" || target.pathname === "") {
    target.pathname = "/admin";
  }

  if (session?.accessToken) {
    const handoff = new URLSearchParams();
    handoff.set("token", session.accessToken);
    if (session.idToken) handoff.set("idToken", session.idToken);
    if (session.name) handoff.set("name", session.name);
    if (session.email) handoff.set("email", session.email);
    if (session.role) handoff.set("role", session.role);

    // Sobrescribe cualquier hash previo: el panel limpia estas claves al
    // adoptar la sesión y conserva el resto de la navegación.
    target.hash = handoff.toString();
  }

  return target.toString();
}

/**
 * Detecta una solicitud de redirección a un entorno conocida
 * (`?env=v1`, `?environment=v2`). Solo acepta destinos de la allowlist; nunca
 * redirige a una URL arbitraria para evitar open redirects.
 */
export function pendingEnvironmentTarget(): EnvironmentTarget | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const raw =
    url.searchParams.get("env") ||
    url.searchParams.get("environment") ||
    url.searchParams.get("target");

  if (!raw) return null;

  const id = raw.trim().toLowerCase();
  return environmentTargets.find((target) => target.id === id) ?? null;
}

/**
 * Si el usuario llegó al sitio principal con `?env=v1|v2`, completa el login
 * y lo redirige a la EC2 inyectando el access token en el fragmento.
 *
 * Debe invocarse después de obtener una sesión válida (login o sesión previa).
 * Devuelve true si inició la redirección.
 */
export function redirectToEnvironmentIfRequested(session: AuthSession | null): boolean {
  if (typeof window === "undefined" || !session?.accessToken) return false;

  const target = pendingEnvironmentTarget();
  if (!target) return false;

  // Limpia `env`/`environment`/`target` del origen para que un refresh no
  // vuelva a redirigir accidentalmente.
  const url = new URL(window.location.href);
  url.searchParams.delete("env");
  url.searchParams.delete("environment");
  url.searchParams.delete("target");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

  window.location.assign(buildEnvironmentUrl(target.url, session));
  return true;
}
