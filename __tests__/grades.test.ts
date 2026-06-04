import type { RawResult } from '../src/api/types';
import {
  formatGrade,
  groupBySubject,
  normalizeResults,
  overallAverage,
  parseDutchNumber,
  weightedAverage,
  type Grade,
} from '../src/logic/grades';

function grade(value: number | null, weight = 1, extra: Partial<Grade> = {}): Grade {
  return {
    id: Math.random().toString(),
    subject: 'NE',
    subjectName: 'Nederlands',
    period: 1,
    value,
    rawValue: value === null ? '' : String(value),
    weight,
    description: 'Toets',
    date: '2026-01-01',
    counts: true,
    kind: 'toets',
    ...extra,
  };
}

describe('parseDutchNumber', () => {
  it('parst komma-decimalen', () => {
    expect(parseDutchNumber('7,5')).toBe(7.5);
  });
  it('parst punt-decimalen en gehele getallen', () => {
    expect(parseDutchNumber('8.0')).toBe(8);
    expect(parseDutchNumber('10')).toBe(10);
  });
  it('geeft null bij letters of leeg', () => {
    expect(parseDutchNumber('G')).toBeNull();
    expect(parseDutchNumber('')).toBeNull();
    expect(parseDutchNumber(undefined)).toBeNull();
  });
  it('accepteert getallen direct', () => {
    expect(parseDutchNumber(6.7)).toBe(6.7);
  });
});

describe('formatGrade', () => {
  it('gebruikt een komma', () => {
    expect(formatGrade(7.5)).toBe('7,5');
    expect(formatGrade(8, 2)).toBe('8,00');
  });
  it('toont een streepje bij null', () => {
    expect(formatGrade(null)).toBe('–');
  });
});

describe('weightedAverage', () => {
  it('weegt cijfers correct', () => {
    // (6*1 + 9*3) / (1+3) = 33/4 = 8.25
    const avg = weightedAverage([grade(6, 1), grade(9, 3)]);
    expect(avg).toBeCloseTo(8.25);
  });
  it('negeert niet-meetellende en niet-numerieke cijfers', () => {
    const avg = weightedAverage([
      grade(8, 1),
      grade(2, 1, { counts: false }),
      grade(null, 1),
    ]);
    expect(avg).toBe(8);
  });
  it('geeft null zonder bruikbare cijfers', () => {
    expect(weightedAverage([grade(null, 1)])).toBeNull();
  });
});

describe('normalizeResults + groupBySubject', () => {
  const raws: RawResult[] = [
    {
      resultaatId: 1,
      type: 'Toetskolom',
      vak: { afkorting: 'NE', naam: 'Nederlands' },
      periode: 1,
      geldendResultaat: '6,0',
      weging: 1,
      omschrijving: 'SO',
      datumInvoer: '2026-01-10',
    },
    {
      resultaatId: 2,
      type: 'Toetskolom',
      vak: { afkorting: 'NE', naam: 'Nederlands' },
      periode: 1,
      geldendResultaat: '8,0',
      weging: 3,
      omschrijving: 'PW',
      datumInvoer: '2026-02-10',
    },
    {
      // Door Somtoday berekend gemiddelde -> mag NIET meetellen.
      resultaatId: 3,
      type: 'PeriodeGemiddeldeKolom',
      vak: { afkorting: 'NE', naam: 'Nederlands' },
      periode: 1,
      geldendResultaat: '7,5',
      weging: 1,
    },
    {
      resultaatId: 4,
      type: 'Toetskolom',
      vak: { afkorting: 'WI', naam: 'Wiskunde' },
      periode: 1,
      geldendResultaat: '4,0',
      weging: 1,
      datumInvoer: '2026-01-15',
    },
  ];

  it('groepeert per vak en negeert berekende gemiddeldes', () => {
    const subjects = groupBySubject(normalizeResults(raws));
    expect(subjects.map((s) => s.subject)).toEqual(['NE', 'WI']);

    const ne = subjects.find((s) => s.subject === 'NE')!;
    // Alleen de 2 toetsen, niet de PeriodeGemiddeldeKolom.
    expect(ne.grades).toHaveLength(2);
    // (6*1 + 8*3) / 4 = 30/4 = 7.5
    expect(ne.average).toBeCloseTo(7.5);
  });

  it('berekent een onafgerond gemiddelde over vakken', () => {
    const subjects = groupBySubject(normalizeResults(raws));
    // NE = 7.5, WI = 4.0 -> (7.5 + 4.0)/2 = 5.75
    expect(overallAverage(subjects)).toBeCloseTo(5.75);
  });

  it('sorteert cijfers per vak op datum', () => {
    const subjects = groupBySubject(normalizeResults(raws));
    const ne = subjects.find((s) => s.subject === 'NE')!;
    expect(ne.grades[0].date).toBe('2026-01-10');
    expect(ne.grades[1].date).toBe('2026-02-10');
  });
});
