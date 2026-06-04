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
export async function getResults(
  client: SomtodayClient,
  leerlingId: number
): Promise<RawResult[]> {
  // Bekende varianten van het resultaten-endpoint. We proberen ze op volgorde
  // en gebruiken de eerste die werkt (zodat de app zich aanpast als Somtoday
  // het endpoint wijzigt).
  const pathCandidates = [
    // Token-gescoped (zoals /rest/v1/vakken en /huiswerk die wél werken).
    '/rest/v1/resultaten',
    `/rest/v1/resultaten/huidigVoorLeerling/${leerlingId}`,
    `/rest/v1/resultaten/recentVoorLeerling/${leerlingId}`,
    `/rest/v1/resultaten/leerling/${leerlingId}`,
  ];
  // Query-variant (id als parameter i.p.v. in het pad).
  const queryCandidates: { path: string; query: Record<string, string> }[] = [
    { path: '/rest/v1/resultaten', query: { leerling: String(leerlingId) } },
  ];

  const pageSize = 100;
  const tried: string[] = [];

  const paginate = async (
    path: string,
    query?: Record<string, string>
  ): Promise<RawResult[] | null> => {
    const all: RawResult[] = [];
    let start = 0;
    for (let page = 0; page < 50; page++) {
      const end = start + pageSize - 1;
      const res = await client.tryGet<ItemsResponse<RawResult>>(
        path,
        query,
        `items=${start}-${end}`
      );
      if (page === 0 && !res.ok) {
        tried.push(`${path} → ${res.status}`);
        return null; // endpoint bestaat niet; volgende kandidaat proberen
      }
      if (!res.ok) break;
      const items = res.data?.items ?? [];
      all.push(...items);
      if (items.length < pageSize) break;
      start += pageSize;
    }
    return all;
  };

  for (const path of pathCandidates) {
    const items = await paginate(path);
    if (items !== null) return items;
  }
  for (const { path, query } of queryCandidates) {
    const items = await paginate(path, query);
    if (items !== null) return items;
  }

  throw new Error(`Geen werkend cijfer-endpoint gevonden. Geprobeerd: ${tried.join(' | ')}`);
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
      }
      lines.push(`${r.status} ${label}${extra}`);
    } catch (e) {
      lines.push(`ERR ${label}: ${e instanceof Error ? e.message.slice(0, 50) : ''}`);
    }
  };

  // Toont de keys + (eerste) JSON van een item, om verborgen velden/links/ids
  // te vinden.
  const dumpItem = async (label: string, path: string) => {
    try {
      const r = await client.tryGet<any>(path, undefined, 'items=0-0');
      if (!r.ok) {
        lines.push(`${label} → ${r.status}`);
        return;
      }
      const item = r.data?.items ? r.data.items[0] : r.data;
      const keys = item ? Object.keys(item).join(',') : '(leeg)';
      lines.push(`${label} keys: ${keys}`);
      const links = item?.links ?? [];
      for (const l of links) lines.push(`  ${l.rel} → ${l.href}`);
      const json = JSON.stringify(item ?? {}).slice(0, 350);
      lines.push(`  json: ${json}`);
    } catch (e) {
      lines.push(`${label} ERR: ${e instanceof Error ? e.message.slice(0, 50) : ''}`);
    }
  };

  lines.push('— endpoints —');
  // Mogelijke namen voor de cijfers/resultaten-resource.
  await probe('resultaten', '/rest/v1/resultaten');
  await probe('huidigVoorLeerling', `/rest/v1/resultaten/huidigVoorLeerling/${leerlingId}`);
  await probe('cijfers', '/rest/v1/cijfers');
  await probe('cijferoverzicht', '/rest/v1/cijferoverzicht');
  await probe('toetsresultaten', '/rest/v1/toetsresultaten');
  await probe('voortgangsdossier', '/rest/v1/voortgangsdossier');
  await probe('resultaatkolommen', '/rest/v1/resultaatkolommen');
  await probe('vakkeuzes', '/rest/v1/vakkeuzes');
  await probe('lesgroepen', '/rest/v1/lesgroepen');
  await probe('afspraken', '/rest/v1/afspraken');

  lines.push('— inhoud —');
  await dumpItem('vakken', '/rest/v1/vakken');

  // Toegestane gegevenstypen uit accountPermissions: dit verklapt welke
  // resource(s) de cijfers bevatten.
  lines.push('— toegestane types —');
  try {
    const acc = await client.tryGet<any>('/rest/v1/account', undefined, 'items=0-0');
    const item = acc.data?.items ? acc.data.items[0] : acc.data;
    const perms: any[] = item?.accountPermissions ?? item?.permissions ?? [];
    const types = new Set<string>();
    for (const p of perms) {
      const full = typeof p === 'string' ? p : p?.full ?? p?.type ?? '';
      const type = String(full).split(':')[0];
      if (type) types.add(type);
    }
    lines.push([...types].sort().join('\n') || '(geen)');
  } catch (e) {
    lines.push(`ERR: ${e instanceof Error ? e.message.slice(0, 60) : ''}`);
  }

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
