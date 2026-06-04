import {
  DEFAULT_TARGET,
  gradeNeeded,
  maxPossibleAverage,
  minPossibleAverage,
  projectedAverage,
  standing,
} from '../src/logic/calculator';
import type { Grade } from '../src/logic/grades';

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

describe('gradeNeeded', () => {
  it('berekent het benodigde cijfer voor een voldoende', () => {
    // Huidig: één 5 (weging 1). Volgende toets weging 1, doel 5,5.
    // (5 + x) / 2 = 5.5 -> x = 6.0
    const r = gradeNeeded({ grades: [grade(5)], upcomingWeight: 1 });
    expect(r.needed).toBeCloseTo(6.0);
    expect(r.target).toBe(DEFAULT_TARGET);
    expect(r.possible).toBe(true);
    expect(r.alreadySecured).toBe(false);
  });

  it('houdt rekening met weging van de komende toets', () => {
    // Huidig: 4 (weging 1). Volgende toets weging 3, doel 5,5.
    // (4 + 3x)/4 = 5.5 -> 3x = 18 -> x = 6.0
    const r = gradeNeeded({ grades: [grade(4)], upcomingWeight: 3 });
    expect(r.needed).toBeCloseTo(6.0);
  });

  it('rondt naar boven af zodat je doel echt gehaald wordt', () => {
    // Huidig: 5 en 5 (weging 1 elk). Volgende weging 1, doel 5,5.
    // (10 + x)/3 = 5.5 -> x = 6.5
    const r = gradeNeeded({ grades: [grade(5), grade(5)], upcomingWeight: 1 });
    expect(r.needed).toBeCloseTo(6.5);
  });

  it('markeert onhaalbaar wanneer >10 nodig is', () => {
    // Huidig: 2 (weging 3). Volgende weging 1, doel 5,5.
    // (6 + x)/4 = 5.5 -> x = 16 -> niet haalbaar
    const r = gradeNeeded({ grades: [grade(2, 3)], upcomingWeight: 1 });
    expect(r.needed).toBeGreaterThan(10);
    expect(r.possible).toBe(false);
  });

  it('markeert al-binnen wanneer zelfs een 1 genoeg is', () => {
    // Huidig: 9 (weging 3). Volgende weging 1, doel 5,5.
    // (27 + x)/4 = 5.5 -> x = -5 -> al binnen
    const r = gradeNeeded({ grades: [grade(9, 3)], upcomingWeight: 1 });
    expect(r.alreadySecured).toBe(true);
    expect(r.possible).toBe(true);
  });

  it('ondersteunt een eigen streefcijfer', () => {
    // Huidig: 7 (weging 1). Volgende weging 1, doel 8.
    // (7 + x)/2 = 8 -> x = 9
    const r = gradeNeeded({ grades: [grade(7)], upcomingWeight: 1, target: 8 });
    expect(r.needed).toBeCloseTo(9.0);
  });

  it('werpt een fout bij weging <= 0', () => {
    expect(() => gradeNeeded({ grades: [grade(5)], upcomingWeight: 0 })).toThrow();
  });
});

describe('projectedAverage', () => {
  it('voorspelt het nieuwe gemiddelde', () => {
    // Huidig: 6 (weging 1). Haal 8 met weging 1 -> (6+8)/2 = 7
    expect(projectedAverage([grade(6)], 8, 1)).toBeCloseTo(7);
  });
});

describe('min/max mogelijke gemiddelde', () => {
  const grades = [grade(7, 2)];
  it('max met een 10 op resterend gewicht', () => {
    // (14 + 10)/3 = 8
    expect(maxPossibleAverage(grades, 1)).toBeCloseTo(8);
  });
  it('min met een 1 op resterend gewicht', () => {
    // (14 + 1)/3 = 5
    expect(minPossibleAverage(grades, 1)).toBeCloseTo(5);
  });
});

describe('standing', () => {
  it('geeft huidig gemiddelde en benodigd cijfer voor voldoende', () => {
    const s = standing([grade(5)], 1);
    expect(s.currentAverage).toBeCloseTo(5);
    expect(s.neededForPass.needed).toBeCloseTo(6.0);
    expect(s.neededForTarget).toBeUndefined();
  });

  it('voegt een eigen streefcijfer toe wanneer afwijkend', () => {
    const s = standing([grade(5)], 1, 7);
    expect(s.neededForTarget?.target).toBe(7);
  });
});
