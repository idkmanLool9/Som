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
