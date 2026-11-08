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
 * Construye la URL de destino propagando el JWT activo.
 *
 * Se envía `token` (access token) porque es el que validan los Resource Servers
 * del BFF; `idToken` y los datos del operador permiten reconstruir la sesión
 * completa en la EC2 de destino sin obligar a un nuevo login.
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
    target.searchParams.set("token", session.accessToken);
    if (session.idToken) target.searchParams.set("idToken", session.idToken);
    if (session.name) target.searchParams.set("name", session.name);
    if (session.email) target.searchParams.set("email", session.email);
    if (session.role) target.searchParams.set("role", session.role);
  }

  return target.toString();
}
