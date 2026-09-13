export type AuthSession = {
  accessToken: string;
  idToken?: string;
  name: string;
  role: string;
  demo?: boolean;
};

const SESSION_KEY = "agrocenter.auth";
const VERIFIER_KEY = "agrocenter.pkce.verifier";
const STATE_KEY = "agrocenter.pkce.state";

const config = {
  domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.replace(/\/$/, "") ?? "",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  redirectUri:
    process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ??
    (typeof window === "undefined" ? "" : window.location.origin),
};

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
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthSession;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function createDemoSession(): AuthSession {
  const session: AuthSession = {
    accessToken: "demo-access-token",
    name: "Camila Muñoz",
    role: "Administradora de bodega",
    demo: true,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
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
  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  if (!code) return null;

  const returnedState = query.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!expectedState || returnedState !== expectedState || !verifier) {
    throw new Error("La respuesta de autenticación no superó la validación de seguridad.");
  }

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
  if (!response.ok) throw new Error("Cognito no pudo completar el intercambio del código.");

  const tokens = (await response.json()) as { access_token: string; id_token?: string };
  const claims = decodeClaims(tokens.id_token ?? tokens.access_token);
  const groups = Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] : [];
  const session: AuthSession = {
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    name: String(claims.name ?? claims.email ?? "Usuario AgroCenter"),
    role: String(groups[0] ?? "Usuario operativo"),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  window.history.replaceState({}, "", window.location.pathname);
  return session;
}

export function signOut() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);

  if (config.domain && config.clientId) {
    const logoutUri = encodeURIComponent(config.redirectUri);
    window.location.assign(
      `${config.domain}/logout?client_id=${config.clientId}&logout_uri=${logoutUri}`
    );
  }
}