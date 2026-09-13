import { readAuthSession } from "./cognito";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/$/, "");

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = readAuthSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Se prioriza el idToken porque contiene los claims de grupos (cognito:groups: ["CLIENTE"])
  const token = session?.idToken || session?.accessToken;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Garantizar idempotency-key para solicitudes POST hacia el BFF si no viene provista
  const method = (options.method || "GET").toUpperCase();
  if (method === "POST" && !headers["Idempotency-Key"] && !headers["idempotency-key"]) {
    headers["Idempotency-Key"] =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.message ||
      errorData?.error ||
      `Error ${response.status}: ${response.statusText || "Forbidden"}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}