import { readAuthSession } from "./cognito";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new Error("La URL del BFF aún no está configurada.");
  const session = readAuthSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  if (response.status === 403) throw new Error("No tienes permisos para realizar esta acción.");
  if (!response.ok) throw new Error(`El servicio respondió con código ${response.status}.`);
  return (await response.json()) as T;
}
