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
 * Haalt alle huidige cijfers (resultaten) van een leerling op.
 * De API geeft max. 100 items per request terug; we pagineren via de Range-header.
 */
export async function getResults(
  client: SomtodayClient,
  leerlingId: number
): Promise<RawResult[]> {
  const all: RawResult[] = [];
  const pageSize = 100;
  let start = 0;
  // Veiligheidslimiet tegen oneindige loops.
  for (let page = 0; page < 50; page++) {
    const end = start + pageSize - 1;
    const data = await client.get<ItemsResponse<RawResult>>(
      `/rest/v1/resultaten/huidigVoorLeerling/${leerlingId}`,
      undefined,
      `items=${start}-${end}`
    );
    const items = data.items ?? [];
    all.push(...items);
    if (items.length < pageSize) break;
    start += pageSize;
  }
  return all;
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
