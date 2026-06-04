import {
  AUTHORIZE_URL,
  CLIENT_ID,
  DEFAULT_API_URL,
  ORGANISATIES_URL,
  REDIRECT_URI,
  SCOPE,
  TOKEN_URL,
} from './constants';
import { createPkcePair, generateState } from './pkce';
import type { School, Session, TokenResponse } from './types';

/** Haalt de lijst met scholen op en sorteert op naam. */
export async function fetchSchools(): Promise<School[]> {
  const res = await fetch(ORGANISATIES_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Kon scholenlijst niet laden (HTTP ${res.status})`);
  }
  const data = await res.json();
  // organisaties.json is een array van { instellingen: School[] } of een platte lijst.
  const scholen: School[] = [];
  const push = (s: any) => {
    if (s && s.uuid && s.naam) {
      scholen.push({ uuid: s.uuid, naam: s.naam, plaats: s.plaats ?? '' });
    }
  };
  if (Array.isArray(data)) {
    for (const entry of data) {
      if (Array.isArray(entry?.instellingen)) entry.instellingen.forEach(push);
      else push(entry);
    }
  }
  return scholen.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
}

/** Resultaat van het opzetten van een login-poging. */
export interface AuthRequest {
  authorizeUrl: string;
  verifier: string;
  state: string;
  tenantUuid: string;
  redirectUri: string;
}

/**
 * Bouwt de authorize-URL die je in een WebView laadt. Bewaar `verifier` en
 * `state`: die heb je nodig bij `exchangeCode`.
 */
export async function createAuthRequest(tenantUuid: string): Promise<AuthRequest> {
  const { verifier, challenge } = await createPkcePair();
  const state = generateState();
  const params = new URLSearchParams({
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: SCOPE,
    state,
    tenant_uuid: tenantUuid,
    session: 'no_session',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'login',
  });
  return {
    authorizeUrl: `${AUTHORIZE_URL}?${params.toString()}`,
    verifier,
    state,
    tenantUuid,
    redirectUri: REDIRECT_URI,
  };
}

/**
 * Haalt `code` (en optioneel `state`) uit een redirect-URL.
 * Geeft null als dit geen geldige callback is.
 */
export function parseCallbackUrl(
  url: string
): { code: string; state: string | null } | null {
  if (!url.startsWith(REDIRECT_URI.split('?')[0])) return null;
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  const code = params.get('code');
  if (!code) return null;
  return { code, state: params.get('state') };
}

function sessionFromToken(token: TokenResponse, tenantUuid: string): Session {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    apiUrl: token.somtoday_api_url ?? DEFAULT_API_URL,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
    tenantUuid: token.somtoday_tenant ?? tenantUuid,
  };
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token-aanvraag mislukt (HTTP ${res.status}): ${text}`);
  }
  return JSON.parse(text) as TokenResponse;
}

/** Wisselt de authorization code in voor tokens. */
export async function exchangeCode(
  code: string,
  verifier: string,
  tenantUuid: string
): Promise<Session> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    code_verifier: verifier,
    redirect_uri: REDIRECT_URI,
    tenant_uuid: tenantUuid,
    session: 'no_session',
    scope: SCOPE,
  });
  return sessionFromToken(await postToken(body), tenantUuid);
}

/** Vernieuwt een verlopen sessie met het refresh token. */
export async function refreshSession(session: Session): Promise<Session> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
    client_id: CLIENT_ID,
    scope: SCOPE,
  });
  const token = await postToken(body);
  const next = sessionFromToken(token, session.tenantUuid);
  // Somtoday geeft soms geen nieuw refresh token terug; hergebruik het oude.
  if (!token.refresh_token) next.refreshToken = session.refreshToken;
  return next;
}
