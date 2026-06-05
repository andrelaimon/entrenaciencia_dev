import type {
  CalcResult,
  Goal,
  ActivityLevel,
  MacroSplit,
  ProteinLevel,
  Sex,
} from '@/lib/calorieCalculator';
import {
  goalAdjustment,
  goalLabels,
  activityLabels,
  macroSplitLabels,
  proteinLevelLabels,
  warningCopy,
  CALIBRATION_NOTE,
} from '@/lib/calorieCalculator';

// v14: soft-notice copy lives in the calculator (sex-aware) and renders green.
export { warningCopy };

export interface ReportInputs {
  sex: Sex;
  age: number;
  weight: number;   // kg
  height: number;   // cm
  activity: ActivityLevel;
  goal: Goal;
  macroSplit: MacroSplit;
  proteinLevel?: ProteinLevel;
  units: 'metric' | 'imperial';
  pregnancyLactation?: boolean;
}

export interface ReportProps {
  name: string;
  inputs: ReportInputs;
  result: CalcResult;
}

/** Fixed calibration message shown in every report (spec v13 §7). */
export const CALIBRATION_MESSAGE = CALIBRATION_NOTE;

/** Estimate disclaimer (bold, centered) — matches the report template. */
export const ESTIMATE_DISCLAIMER =
  'Estos resultados son una estimación basada en ecuaciones predictivas y modelos poblacionales. Úsalos como punto de partida y ajústalos según tu progreso real durante las próximas 2–3 semanas.';

export function goalAdjustmentLabel(goal: Goal, weightKg: number): string {
  const adj = Math.round(goalAdjustment(weightKg, goal));
  if (adj === 0) return 'sin ajuste';
  return adj > 0 ? `+${adj} kcal/día` : `${adj} kcal/día`;
}

/**
 * Adjustment broken into an operator + magnitude for the
 * "Gasto Calórico + Ajuste = Calorías" breakdown badge.
 */
export function goalAdjustmentParts(goal: Goal, weightKg: number): { operator: '+' | '−'; kcal: number } {
  const adj = Math.round(goalAdjustment(weightKg, goal));
  return { operator: adj < 0 ? '−' : '+', kcal: Math.abs(adj) };
}

/**
 * Round three fractions (that sum to 1) to integer percentages that sum to
 * exactly 100, using the largest-remainder method. Independently rounding each
 * macro can total 99 or 101; this keeps the displayed split at 100%.
 */
function integerPercents(fractions: number[]): number[] {
  const raw = fractions.map((f) => f * 100);
  const floor = raw.map(Math.floor);
  const used = floor.reduce((a, b) => a + b, 0);
  let remainder = Math.round(100 - used);
  const order = raw
    .map((p, i) => ({ i, frac: p - floor[i] }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floor];
  for (let k = 0; k < remainder && k < order.length; k++) out[order[k].i] += 1;
  return out;
}

export function macroRows(result: CalcResult): Array<{
  label: string;
  grams: number;
  min: number;
  max: number;
  pct: number;
  pctInt: number;
  color: string;
}> {
  const [pInt, cInt, fInt] = integerPercents([result.proteinPct, result.carbsPct, result.fatPct]);
  return [
    { label: 'Proteína',      grams: result.protein, min: result.proteinMin, max: result.proteinMax, pct: result.proteinPct, pctInt: pInt, color: '#23D3FF' },
    { label: 'Carbohidratos', grams: result.carbs,   min: result.carbsMin,   max: result.carbsMax,   pct: result.carbsPct,   pctInt: cInt, color: '#FFC300' },
    { label: 'Grasa',         grams: result.fat,     min: result.fatMin,     max: result.fatMax,     pct: result.fatPct,     pctInt: fInt, color: '#9CE2B6' },
  ];
}

export function inputsSummary(inputs: ReportInputs): Array<{ label: string; value: string }> {
  const units = inputs.units === 'imperial'
    ? { w: 'lb', h: 'in', wVal: (inputs.weight / 0.45359237).toFixed(0), hVal: (inputs.height / 2.54).toFixed(0) }
    : { w: 'kg', h: 'cm', wVal: inputs.weight.toFixed(0), hVal: inputs.height.toFixed(0) };

  return [
    { label: 'Sexo',          value: inputs.sex === 'male' ? 'Masculino' : 'Femenino' },
    { label: 'Edad',          value: `${inputs.age} años` },
    { label: 'Peso',          value: `${units.wVal} ${units.w}` },
    { label: 'Talla',         value: `${units.hVal} ${units.h}` },
    { label: 'Actividad',     value: activityLabels[inputs.activity].title },
    { label: 'Objetivo',      value: goalLabels[inputs.goal].title },
    { label: 'Proteína',      value: proteinLevelLabels[inputs.proteinLevel ?? 'standard'].title },
    { label: 'Reparto macros', value: macroSplitLabels[inputs.macroSplit].title },
  ];
}

export function pctLabel(p: number): string {
  return `${Math.round(p * 100)}%`;
}
