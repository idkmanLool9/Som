import { refreshSession } from './auth';
import type { Session } from './types';

/** Marge (ms) waarmee we een token vroegtijdig als verlopen beschouwen. */
const EXPIRY_MARGIN = 60_000;

/**
 * Authenticated client rond de Somtoday REST API. Vernieuwt het access token
 * automatisch wanneer het (bijna) verlopen is en bij een 401.
 */
export class SomtodayClient {
  private session: Session;
  private onSessionChange: (s: Session) => void;
  private refreshing: Promise<Session> | null = null;

  constructor(session: Session, onSessionChange: (s: Session) => void) {
    this.session = session;
    this.onSessionChange = onSessionChange;
  }

  getSession(): Session {
    return this.session;
  }

  private setSession(s: Session) {
    this.session = s;
    this.onSessionChange(s);
  }

  /** Zorgt voor een geldig access token (vernieuwt indien nodig). */
  private async ensureValidToken(): Promise<void> {
    if (Date.now() < this.session.expiresAt - EXPIRY_MARGIN) return;
    await this.doRefresh();
  }

  private async doRefresh(): Promise<void> {
    // Voorkom parallelle refreshes.
    if (!this.refreshing) {
      this.refreshing = refreshSession(this.session).finally(() => {
        this.refreshing = null;
      });
    }
    const next = await this.refreshing;
    this.setSession(next);
  }

  /** Voert het verzoek uit met geldig token (vernieuwt bij een 401). */
  private async request(
    path: string,
    query?: Record<string, string>,
    range?: string
  ): Promise<Response> {
    await this.ensureValidToken();
    const doFetch = async (): Promise<Response> => {
      const url = new URL(path, this.session.apiUrl);
      if (query) {
        for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
      }
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.session.accessToken}`,
        Accept: 'application/json',
      };
      if (range) headers['Range'] = range;
      return fetch(url.toString(), { headers });
    };

    let res = await doFetch();
    if (res.status === 401) {
      await this.doRefresh();
      res = await doFetch();
    }
    return res;
  }

  /** Doet een GET-request naar een REST-pad en parset JSON. */
  async get<T>(path: string, query?: Record<string, string>, range?: string): Promise<T> {
    const res = await this.request(path, query, range);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API-fout ${res.status} bij ${path}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  /**
   * Als `get`, maar geeft de statuscode terug i.p.v. te gooien bij 4xx/5xx.
   * Handig om meerdere kandidaat-endpoints te proberen.
   */
  async tryGet<T>(
    path: string,
    query?: Record<string, string>,
    range?: string
  ): Promise<{ ok: boolean; status: number; data: T | null }> {
    const res = await this.request(path, query, range);
    if (!res.ok) {
      await res.text().catch(() => '');
      return { ok: false, status: res.status, data: null };
    }
    return { ok: true, status: res.status, data: (await res.json()) as T };
  }
}
