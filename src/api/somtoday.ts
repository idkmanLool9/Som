import type { SomtodayClient } from './client';
import type {
  ItemsResponse,
  RawHomework,
  RawResult,
  Student,
} from './types';

/** Haalt de ingelogde leerling(en) op. */
export async function getStudents(client: SomtodayClient): Promise<Student[]> {
  const data = await client.get<ItemsResponse<Student>>('/rest/v1/leerlingen');
  return data.items ?? [];
}

/**
 * Bepaalt het leerling-id. Somtoday zet dit meestal niet in een veld, maar in
 * de "self"-link (`links`). We vallen terug op andere voor de hand liggende
 * velden voor de zekerheid.
 */
export function getStudentId(student: Student): number | undefined {
  if (typeof student.leerlingId === 'number') return student.leerlingId;
  const self = student.links?.find((l) => l.rel === 'self');
  if (self?.id) return self.id;
  // Laatste redmiddel: de eerste link met een id.
  return student.links?.find((l) => typeof l.id === 'number')?.id;
}

/**
 * Haalt alle huidige cijfers (resultaten) van een leerling op.
 * De API geeft max. 100 items per request terug; we pagineren via de Range-header.
 */
/** Bouwt de query (met herhaalde type=/additional=) voor het cijfer-endpoint. */
function resultQuery(): string {
  const p = new URLSearchParams();
  for (const t of ['Toetskolom', 'DeeltoetsKolom', 'Werkstukcijferkolom', 'Advieskolom']) {
    p.append('type', t);
  }
  for (const a of ['vaknaam', 'resultaatkolom', 'naamalternatiefniveau', 'vakuuid', 'lichtinguuid']) {
    p.append('additional', a);
  }
  p.set('sort', 'desc-geldendResultaatCijferInvoer');
  return p.toString();
}

export async function getResults(
  client: SomtodayClient,
  leerlingId: number
): Promise<RawResult[]> {
  // Somtoday levert cijfers via het "geldend ... dossier resultaten"-endpoint.
  // Een leerling heeft een voortgangsdossier (onderbouw) of examendossier
  // (bovenbouw); we halen beide op en voegen ze samen.
  const dossiers = [
    'geldendvoortgangsdossierresultaten',
    'geldendexamendossierresultaten',
    // fallback-spelling, voor de zekerheid:
    'geldendevoortgangsdossierresultaten',
  ];
  const query = resultQuery();
  const pageSize = 100;
  const all: RawResult[] = [];
  const tried: string[] = [];
  let anyOk = false;

  for (const dossier of dossiers) {
    let start = 0;
    for (let page = 0; page < 50; page++) {
      const path = `/rest/v1/${dossier}/leerling/${leerlingId}?${query}`;
      const res = await client.tryGet<ItemsResponse<RawResult>>(
        path,
        undefined,
        `items=${start}-${start + pageSize - 1}`
      );
      if (page === 0 && !res.ok) {
        tried.push(`${dossier} → ${res.status}`);
        break; // dit dossier bestaat niet voor deze leerling; volgende proberen
      }
      anyOk = true;
      if (!res.ok) break;
      const items = res.data?.items ?? [];
      all.push(...items);
      if (items.length < pageSize) break;
      start += pageSize;
    }
  }

  if (!anyOk) {
    throw new Error(`Kon cijfers niet laden. Geprobeerd: ${tried.join(' | ')}`);
  }
  return all;
}

/**
 * Diagnostische probe: test bekende endpoints en leest de HATEOAS-links uit het
 * leerling-/account-object. De hrefs verklappen vaak de juiste resultaten-URL.
 * Geeft een (kopieerbaar) tekstrapport terug.
 */
export async function diagnose(
  client: SomtodayClient,
  leerlingId: number
): Promise<string> {
  const lines: string[] = [];

  const probe = async (label: string, path: string, query?: Record<string, string>) => {
    try {
      const r = await client.tryGet<any>(path, query, 'items=0-0');
      let extra = '';
      if (r.ok && r.data) {
        if (Array.isArray(r.data.items)) extra = ` items=${r.data.items.length}`;
        else if (r.data.links) extra = ' obj';
      } else if (r.body) {
        // Toon de reden uit de foutrespons (bv. "geen rechten" vs "niet gevonden").
        extra = ` body=${r.body.replace(/\s+/g, ' ').slice(0, 120)}`;
      }
      lines.push(`${r.status} ${label}${extra}`);
    } catch (e) {
      lines.push(`ERR ${label}: ${e instanceof Error ? e.message.slice(0, 50) : ''}`);
    }
  };

  // Toont de volledige (ruwe) JSON van het eerste item van een endpoint.
  const dumpRaw = async (label: string, path: string, maxLen = 1400, range = 'items=0-0') => {
    try {
      const r = await client.tryGet<any>(path, undefined, range);
      if (!r.ok) {
        lines.push(`${label} → ${r.status}`);
        return;
      }
      const count = Array.isArray(r.data?.items) ? r.data.items.length : '?';
      const item = r.data?.items ? r.data.items[0] : r.data;
      lines.push(`${label} (n=${count}): ${JSON.stringify(item ?? {}).slice(0, maxLen)}`);
    } catch (e) {
      lines.push(`${label} ERR: ${e instanceof Error ? e.message.slice(0, 50) : ''}`);
    }
  };

  // Account-id ophalen (voor een extra poging met dat id).
  let accountId: number | undefined;
  try {
    const acc = await client.tryGet<any>('/rest/v1/account', undefined, 'items=0-0');
    const item = acc.data?.items ? acc.data.items[0] : acc.data;
    accountId = item?.links?.find((l: any) => l.rel === 'self')?.id;
  } catch {
    // negeren
  }

  lines.push('— endpoints —');
  await probe('huidigVoorLeerling(leerling)', `/rest/v1/resultaten/huidigVoorLeerling/${leerlingId}`);
  // Ook met het account-id proberen.
  if (accountId) {
    await probe('huidigVoorLeerling(account)', `/rest/v1/resultaten/huidigVoorLeerling/${accountId}`);
  }
  await probe('vakkeuzes', '/rest/v1/vakkeuzes');
  await probe('afspraken', '/rest/v1/afspraken');

  lines.push('— ruw cijfer-item —');
  const q = resultQuery();
  await dumpRaw('voortgang', `/rest/v1/geldendvoortgangsdossierresultaten/leerling/${leerlingId}?${q}`, 1900, 'items=0-4');
  await dumpRaw('examen', `/rest/v1/geldendexamendossierresultaten/leerling/${leerlingId}?${q}`, 1900, 'items=0-4');

  return lines.join('\n');
}

/** Haalt huiswerk/studiewijzer-items op binnen een datumbereik (yyyy-MM-dd). */
export async function getHomework(
  client: SomtodayClient,
  begindatum: string,
  einddatum: string
): Promise<RawHomework[]> {
  const data = await client.get<ItemsResponse<RawHomework>>(
    '/rest/v1/studiewijzeritemafspraaktoekenningen',
    { begindatum, einddatum, sort: 'asc-id' }
  );
  return data.items ?? [];
}
