import type {
  CalcResult,
  CalcWarning,
  Goal,
  ActivityLevel,
  MacroSplit,
  Sex,
} from '@/lib/calorieCalculator';
import {
  goalAdjustment,
  goalLabels,
  activityLabels,
  macroSplitLabels,
} from '@/lib/calorieCalculator';

export interface ReportInputs {
  sex: Sex;
  age: number;
  weight: number;   // kg
  height: number;   // cm
  activity: ActivityLevel;
  goal: Goal;
  macroSplit: MacroSplit;
  units: 'metric' | 'imperial';
}

export interface ReportProps {
  name: string;
  inputs: ReportInputs;
  result: CalcResult;
}

export const WARNING_COPY: Record<CalcWarning, { title: string; body: string; tone: 'warn' | 'danger' }> = {
  deficit_limitado: {
    title: 'Ajustamos tu objetivo al mínimo seguro',
    body:  'Tu déficit original quedaba por debajo de tu metabolismo basal (BMR). Por seguridad, fijamos tu objetivo al nivel de tu BMR. Si quieres avanzar más rápido, prioriza aumentar tu actividad antes que recortar más calorías.',
    tone:  'warn',
  },
  supervision_medica: {
    title: 'Estos valores requieren supervisión profesional',
    body:  'El objetivo calculado es muy bajo para sostenerse sin acompañamiento clínico. Te recomendamos validar este plan con tu médico o nutricionista antes de aplicarlo.',
    tone:  'danger',
  },
  bloqueo_embarazo: {
    title: 'Objetivo no disponible en embarazo o lactancia',
    body:  'Durante el embarazo y la lactancia los requerimientos energéticos aumentan; un déficit puede comprometer el aporte de nutrientes. Consulta con tu médico antes de cualquier ajuste.',
    tone:  'danger',
  },
};

export const CALIBRATION_MESSAGE =
  'Estos resultados son una estimación basada en ecuaciones predictivas y modelos poblacionales. Úsalos como punto de partida y ajústalos según tu progreso real (peso, energía, rendimiento) durante las próximas 2–3 semanas.';

export function goalAdjustmentLabel(goal: Goal, weightKg: number): string {
  const adj = Math.round(goalAdjustment(weightKg, goal));
  if (adj === 0) return 'sin ajuste';
  return adj > 0 ? `+${adj} kcal/día` : `${adj} kcal/día`;
}

export function macroRows(result: CalcResult): Array<{
  label: string;
  grams: number;
  pct: number;
  color: string;
}> {
  return [
    { label: 'Proteína',      grams: result.protein, pct: result.proteinPct, color: '#23D3FF' },
    { label: 'Carbohidratos', grams: result.carbs,   pct: result.carbsPct,   color: '#9CE2B6' },
    { label: 'Grasa',         grams: result.fat,     pct: result.fatPct,     color: '#FFC300' },
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
    { label: 'Reparto macros', value: macroSplitLabels[inputs.macroSplit].title },
  ];
}

export function pctLabel(p: number): string {
  return `${Math.round(p * 100)}%`;
}
