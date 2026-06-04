import type { Grade } from './grades';
import { weightedAverage } from './grades';

/** Standaard streefcijfer voor een voldoende. */
export const DEFAULT_TARGET = 5.5;

/** Laagst en hoogst haalbare cijfer in NL. */
export const MIN_GRADE = 1;
export const MAX_GRADE = 10;

export interface NeededResult {
  /** Het cijfer dat je nodig hebt op de komende toets(en). */
  needed: number;
  /** Streefgemiddelde waarop dit gebaseerd is. */
  target: number;
  /** Huidig gewogen gemiddelde (null = nog geen cijfers). */
  currentAverage: number | null;
  /** Haalbaar? (needed <= 10) */
  possible: boolean;
  /** Al binnen, zelfs met het laagste cijfer (1)? */
  alreadySecured: boolean;
}

interface CalcInput {
  grades: Grade[];
  /** Gewicht van de komende toets(en) samen. */
  upcomingWeight: number;
  /** Streefgemiddelde (default 5,5). */
  target?: number;
}

function sumWeighted(grades: Grade[]): { sum: number; weight: number } {
  let sum = 0;
  let weight = 0;
  for (const g of grades) {
    if (g.value === null || !g.counts) continue;
    sum += g.value * g.weight;
    weight += g.weight;
  }
  return { sum, weight };
}

/**
 * Berekent welk (gemiddeld) cijfer je nodig hebt op de komende toets(en) met
 * gezamenlijk gewicht `upcomingWeight` om op streefgemiddelde `target` uit te komen.
 *
 *   (S + upcomingWeight * x) / (W + upcomingWeight) = target
 *   => x = (target * (W + upcomingWeight) - S) / upcomingWeight
 */
export function gradeNeeded({
  grades,
  upcomingWeight,
  target = DEFAULT_TARGET,
}: CalcInput): NeededResult {
  if (upcomingWeight <= 0) {
    throw new Error('Het gewicht van de komende toets moet groter dan 0 zijn.');
  }
  const { sum, weight } = sumWeighted(grades);
  const currentAverage = weight > 0 ? sum / weight : null;
  const needed = (target * (weight + upcomingWeight) - sum) / upcomingWeight;

  // Rond af op 1 decimaal naar boven: lager dan het echte minimum zou onvoldoende zijn.
  const neededRounded = Math.ceil(needed * 10) / 10;

  return {
    needed: neededRounded,
    target,
    currentAverage,
    possible: neededRounded <= MAX_GRADE,
    alreadySecured: neededRounded <= MIN_GRADE,
  };
}

/**
 * Voorspelt het nieuwe gemiddelde als je `value` haalt op een toets met
 * gewicht `upcomingWeight`.
 */
export function projectedAverage(
  grades: Grade[],
  value: number,
  upcomingWeight: number
): number {
  const { sum, weight } = sumWeighted(grades);
  return (sum + value * upcomingWeight) / (weight + upcomingWeight);
}

/** Hoogst haalbare gemiddelde als je op alle resterende gewicht een 10 haalt. */
export function maxPossibleAverage(grades: Grade[], remainingWeight: number): number {
  return projectedAverage(grades, MAX_GRADE, remainingWeight);
}

/** Laagst mogelijke gemiddelde als je op alle resterende gewicht een 1 haalt. */
export function minPossibleAverage(grades: Grade[], remainingWeight: number): number {
  return projectedAverage(grades, MIN_GRADE, remainingWeight);
}

/**
 * Handige samenvatting voor de UI: huidig gemiddelde + wat je nodig hebt voor
 * een voldoende en (optioneel) een eigen streefcijfer.
 */
export interface StandingSummary {
  currentAverage: number | null;
  neededForPass: NeededResult;
  neededForTarget?: NeededResult;
}

export function standing(
  grades: Grade[],
  upcomingWeight: number,
  customTarget?: number
): StandingSummary {
  const neededForPass = gradeNeeded({ grades, upcomingWeight, target: DEFAULT_TARGET });
  const summary: StandingSummary = {
    currentAverage: neededForPass.currentAverage,
    neededForPass,
  };
  if (customTarget !== undefined && customTarget !== DEFAULT_TARGET) {
    summary.neededForTarget = gradeNeeded({
      grades,
      upcomingWeight,
      target: customTarget,
    });
  }
  return summary;
}

export { weightedAverage };
