import type { RawResult } from '../api/types';

/** Soort cijferrij. Voor gemiddeldes tellen we alleen 'toets' mee. */
export type GradeKind = 'toets' | 'periodeGemiddelde' | 'rapport' | 'other';

/** Genormaliseerd cijfer, los van het ruwe API-formaat. */
export interface Grade {
  id: string;
  subject: string; // afkorting, bv. "NE"
  subjectName: string; // volledige naam, bv. "Nederlands"
  period: number | null;
  value: number | null; // numeriek cijfer, bv. 7.5; null bij letters (G/V/O)
  rawValue: string; // origineel, bv. "7,5" of "G"
  weight: number; // weging (default 1)
  description: string;
  date: string | null;
  counts: boolean; // telt mee voor het gemiddelde
  kind: GradeKind;
}

/** Cijfers gegroepeerd per vak. */
export interface SubjectGrades {
  subject: string;
  subjectName: string;
  grades: Grade[]; // alleen meetellende toetscijfers, gesorteerd op datum
  average: number | null; // gewogen gemiddelde over alle periodes
  periods: PeriodGrades[];
}

export interface PeriodGrades {
  period: number | null;
  grades: Grade[];
  average: number | null;
}

/**
 * Parset een Nederlands cijfer ("7,5", "8.0", "10") naar een getal.
 * Letters of lege waarden geven null.
 */
export function parseDutchNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Formatteert een cijfer Nederlands ("7,5"). */
export function formatGrade(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return '–';
  return value.toFixed(decimals).replace('.', ',');
}

function classifyKind(rawType: string | undefined): GradeKind {
  const t = (rawType ?? '').toLowerCase();
  if (t.includes('gemiddelde')) return 'periodeGemiddelde';
  if (t.includes('rapport')) return 'rapport';
  if (t.includes('toets')) return 'toets';
  return 'other';
}

/** Zet één ruwe resultaatrij om naar een Grade, of null als die onbruikbaar is. */
export function normalizeResult(raw: RawResult): Grade | null {
  const rawValue =
    raw.geldendResultaat ??
    raw.resultaat ??
    raw.resultaatLabelAfkorting ??
    raw.resultaatLabel ??
    '';
  const kind = classifyKind(raw.type);
  const value = parseDutchNumber(raw.geldendResultaat ?? raw.resultaat);
  const weight = typeof raw.weging === 'number' && raw.weging > 0 ? raw.weging : 1;
  if (rawValue === '' && value === null) return null;

  return {
    id: String(raw.resultaatId ?? `${raw.vak?.afkorting}-${raw.omschrijving}-${raw.datumInvoer}`),
    subject: raw.vak?.afkorting ?? '??',
    subjectName: raw.vak?.naam ?? raw.vak?.afkorting ?? 'Onbekend vak',
    period: typeof raw.periode === 'number' ? raw.periode : null,
    value,
    rawValue: String(rawValue),
    weight,
    description: raw.omschrijving ?? '',
    date: raw.datumInvoer ?? null,
    counts: raw.teltNietmee !== true,
    kind,
  };
}

export function normalizeResults(raws: RawResult[]): Grade[] {
  const out: Grade[] = [];
  for (const r of raws) {
    const g = normalizeResult(r);
    if (g) out.push(g);
  }
  return out;
}

/**
 * Gewogen gemiddelde over cijfers die meetellen en numeriek zijn.
 * Geeft null wanneer er geen bruikbare cijfers zijn.
 */
export function weightedAverage(grades: Grade[]): number | null {
  let sum = 0;
  let totalWeight = 0;
  for (const g of grades) {
    if (g.value === null || !g.counts) continue;
    sum += g.value * g.weight;
    totalWeight += g.weight;
  }
  if (totalWeight === 0) return null;
  return sum / totalWeight;
}

/** Alleen de meetellende toetscijfers (geen door Somtoday berekende rijen). */
export function toetsGrades(grades: Grade[]): Grade[] {
  return grades.filter((g) => g.kind === 'toets' && g.value !== null && g.counts);
}

function byDate(a: Grade, b: Grade): number {
  return (a.date ?? '').localeCompare(b.date ?? '');
}

/**
 * Groepeert cijfers per vak en berekent per vak (en per periode) het gewogen
 * gemiddelde. Alleen echte toetscijfers tellen mee.
 */
export function groupBySubject(grades: Grade[]): SubjectGrades[] {
  const toetsen = toetsGrades(grades);
  const bySubject = new Map<string, Grade[]>();
  for (const g of toetsen) {
    const list = bySubject.get(g.subject) ?? [];
    list.push(g);
    bySubject.set(g.subject, list);
  }

  const result: SubjectGrades[] = [];
  for (const [subject, list] of bySubject) {
    list.sort(byDate);
    const periodsMap = new Map<number | null, Grade[]>();
    for (const g of list) {
      const p = g.period;
      const arr = periodsMap.get(p) ?? [];
      arr.push(g);
      periodsMap.set(p, arr);
    }
    const periods: PeriodGrades[] = [...periodsMap.entries()]
      .map(([period, pg]) => ({
        period,
        grades: pg,
        average: weightedAverage(pg),
      }))
      .sort((a, b) => (a.period ?? 0) - (b.period ?? 0));

    result.push({
      subject,
      subjectName: list[0].subjectName,
      grades: list,
      average: weightedAverage(list),
      periods,
    });
  }

  result.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'nl'));
  return result;
}

/** Algemeen (onafgerond) gemiddelde over alle vakken — elk vak even zwaar. */
export function overallAverage(subjects: SubjectGrades[]): number | null {
  const avgs = subjects.map((s) => s.average).filter((a): a is number => a !== null);
  if (avgs.length === 0) return null;
  return avgs.reduce((a, b) => a + b, 0) / avgs.length;
}
