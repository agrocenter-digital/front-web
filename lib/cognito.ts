export type AuthSession = {
  accessToken: string;
  idToken?: string;
  name: string;
  email?: string;
  role: string;
  demo?: boolean;
  groups?: string[];
};

const SESSION_KEY = "agrocenter.auth";
const VERIFIER_KEY = "agrocenter.pkce.verifier";
const STATE_KEY = "agrocenter.pkce.state";
const CONSUMED_CODE_KEY = "agrocenter.pkce.consumed_code";

const config = {
  domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.replace(/\/$/, "") ?? "",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  redirectUri:
    process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ??
    (typeof window === "undefined" ? "" : window.location.origin),
};

let signInPromise: Promise<AuthSession | null> | null = null;
let inFlightCode: string | null = null;

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomValue(size = 48) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

function decodeClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(payload))));
  } catch {
    return {};
  }
}

export function cognitoIsConfigured() {
  return Boolean(config.domain && config.clientId && config.redirectUri);
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const stored =
    sessionStorage.getItem(SESSION_KEY) ||
    (typeof localStorage !== "undefined" ? localStorage.getItem(SESSION_KEY) : null);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as AuthSession;
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, stored);
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
    }
    return null;
  }
}

export function persistAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(session);
  sessionStorage.setItem(SESSION_KEY, serialized);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SESSION_KEY, serialized);
  }
}

const HANDOFF_PARAMS = ["token", "accessToken", "access_token", "jwt", "idToken", "id_token", "name", "email", "role"];

function isUsableToken(token?: string) {
  if (!token) return false;
  const claims = decodeClaims(token);
  // Si el proveedor entrega tokens opacos (sin exp) se acepta el valor tal cual.
  return typeof claims.exp !== "number" || claims.exp * 1000 > Date.now();
}

/**
 * Adopta la sesión enviada desde otro entorno (V1/V2) a través de la URL.
 *
 * El token viaja como `?token=...` (y opcionalmente `idToken`, `name`, `email`,
 * `role`) para que el administrador no tenga que volver a iniciar sesión. Una vez
 * persistida la sesión se limpia la URL para no dejar credenciales en el historial.
 */
export function adoptSessionFromUrl(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const query = new URLSearchParams(url.search);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const param = (key: string) => query.get(key) ?? hash.get(key);

  const token = param("token") ?? param("accessToken") ?? param("access_token") ?? param("jwt");
  const idToken = param("idToken") ?? param("id_token") ?? undefined;
  if (!token) return null;

  const claims = decodeClaims(idToken ?? token);
  const groups = Array.isArray(claims["cognito:groups"])
    ? (claims["cognito:groups"] as unknown[]).filter((group): group is string => typeof group === "string")
    : [];
  const roleFromGroups = groups.some((group) => {
    const value = group.toUpperCase();
    return value === "ADMIN" || value === "ROLE_ADMIN";
  })
    ? "ADMIN"
    : groups[0];

  const session: AuthSession = {
    accessToken: token,
    idToken,
    name: param("name") || String(claims.name ?? claims.email ?? "Usuario AgroCenter"),
    email: param("email") || (claims.email ? String(claims.email) : undefined),
    role: param("role") || roleFromGroups || "Usuario operativo",
    demo: false,
    groups,
  };

  // La credencial se retira de la URL incluso si resulta inválida o expirada.
  HANDOFF_PARAMS.forEach((key) => query.delete(key));
  url.search = query.toString();
  if (HANDOFF_PARAMS.some((key) => hash.has(key))) {
    HANDOFF_PARAMS.forEach((key) => hash.delete(key));
    url.hash = hash.toString();
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

  if (!isUsableToken(session.accessToken) || (session.idToken && !isUsableToken(session.idToken))) {
    return null;
  }

  try {
    persistAuthSession(session);
  } catch {
    // Si el navegador bloquea el almacenamiento, la sesión no se conserva.
  }

  return session;
}

export function createDemoSession(): AuthSession {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("El modo demo no está disponible en producción.");
  }
  const session: AuthSession = {
    accessToken: "demo-access-token",
    name: "Camila Muñoz",
    email: "camila@agrocenter.cl",
    role: "ADMIN",
    demo: true,
    groups: ["ADMIN"],
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function isUserAdmin(session: AuthSession | null): boolean {
  if (!session) return false;
  if (session.demo) return false;
  if (session.role?.toUpperCase() === "ADMIN" || session.role?.toUpperCase() === "ROLE_ADMIN") {
    return true;
  }
  if (session.groups?.some((g) => g.toUpperCase() === "ADMIN" || g.toUpperCase() === "ROLE_ADMIN")) {
    return true;
  }
  const checkToken = (token?: string) => {
    if (!token) return false;
    const claims = decodeClaims(token);
    const groups = Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] : [];
    return groups.some((g: unknown) => {
      const val = String(g).toUpperCase();
      return val === "ADMIN" || val === "ROLE_ADMIN";
    });
  };
  return checkToken(session.idToken) || checkToken(session.accessToken);
}

export async function beginCognitoSignIn() {
  if (!cognitoIsConfigured()) throw new Error("AWS Cognito aún no está configurado.");
  const verifier = randomValue(64);
  const state = randomValue(24);
  const nonce = randomValue(24);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(VERIFIER_KEY, verifier);
    localStorage.setItem(STATE_KEY, state);
  }

  const query = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: config.redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    nonce,
  });
  window.location.assign(`${config.domain}/oauth2/authorize?${query}`);
}

export async function completeCognitoSignIn(): Promise<AuthSession | null> {
  if (typeof window === "undefined") return null;

  // Si ya hay un intercambio en vuelo, esperamos la misma promesa
  if (signInPromise) {
    return signInPromise;
  }

  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  const returnedState = query.get("state");

  // Si no hay código en la URL, devolvemos cualquier sesión activa en almacenamiento
  if (!code) {
    return readAuthSession();
  }

  // Comprobar si el código ya fue consumido previamente (ej. re-render, StrictMode o refresh)
  const lastConsumedCode =
    sessionStorage.getItem(CONSUMED_CODE_KEY) ||
    (typeof localStorage !== "undefined" ? localStorage.getItem(CONSUMED_CODE_KEY) : null);

  if (code === lastConsumedCode || code === inFlightCode) {
    window.history.replaceState({}, "", window.location.pathname);
    return readAuthSession();
  }

  // Si ya existe una sesión válida guardada, limpiamos la URL y evitamos un segundo canje fallido
  const existingSession = readAuthSession();
  if (existingSession) {
    window.history.replaceState({}, "", window.location.pathname);
    sessionStorage.setItem(CONSUMED_CODE_KEY, code);
    return existingSession;
  }

  const expectedState =
    sessionStorage.getItem(STATE_KEY) ||
    (typeof localStorage !== "undefined" ? localStorage.getItem(STATE_KEY) : null);
  const verifier =
    sessionStorage.getItem(VERIFIER_KEY) ||
    (typeof localStorage !== "undefined" ? localStorage.getItem(VERIFIER_KEY) : null);

  // Limpiamos de inmediato los parámetros de la URL para que ningún ciclo secundario de React los reintente
  window.history.replaceState({}, "", window.location.pathname);
  sessionStorage.setItem(CONSUMED_CODE_KEY, code);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(CONSUMED_CODE_KEY, code);
  }

  // Validar state y verifier
  if (!expectedState || !verifier || (returnedState && returnedState !== expectedState)) {
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(VERIFIER_KEY);
      localStorage.removeItem(STATE_KEY);
    }
    const sessionAfterClear = readAuthSession();
    if (sessionAfterClear) {
      return sessionAfterClear;
    }
    throw new Error("La respuesta de autenticación no superó la validación de seguridad.");
  }

  inFlightCode = code;
  signInPromise = (async () => {
    try {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      });

      const response = await fetch(`${config.domain}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        // Si el canje falla (ej. invalid_grant porque fue canjeado concurrentemente), verificamos si ya hay sesión
        const fallback = readAuthSession();
        if (fallback) return fallback;
        throw new Error("Cognito no pudo completar el intercambio del código.");
      }

      const tokens = (await response.json()) as { access_token: string; id_token?: string };
      const claims = decodeClaims(tokens.id_token ?? tokens.access_token);
      const groups = Array.isArray(claims["cognito:groups"]) ? (claims["cognito:groups"] as string[]) : [];
      const hasAdminGroup = groups.some((g) => g.toUpperCase() === "ADMIN" || g.toUpperCase() === "ROLE_ADMIN");

      const session: AuthSession = {
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        name: String(claims.name ?? claims.email ?? "Usuario AgroCenter"),
        email: claims.email ? String(claims.email) : undefined,
        role: hasAdminGroup ? "ADMIN" : String(groups[0] ?? "Usuario operativo"),
        groups,
      };

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(VERIFIER_KEY);
        localStorage.removeItem(STATE_KEY);
      }

      return session;
    } finally {
      signInPromise = null;
      inFlightCode = null;
    }
  })();

  return signInPromise;
}

export function signOut() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(CONSUMED_CODE_KEY);
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(VERIFIER_KEY);
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(CONSUMED_CODE_KEY);
  }

  if (config.domain && config.clientId) {
    const logoutUri = encodeURIComponent(config.redirectUri);
    window.location.assign(
      `${config.domain}/logout?client_id=${config.clientId}&logout_uri=${logoutUri}`
    );
  }
}
