export type Sex = 'male' | 'female';
export type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
export type Goal = 'leve_loss' | 'loss' | 'maintain' | 'leve_gain' | 'gain';
export type MacroSplit = 'balanced' | 'low_fat' | 'low_carb';
export type CalcWarning = 'deficit_limitado' | 'supervision_medica' | 'bloqueo_embarazo';

export interface CalcInput {
  sex: Sex;
  age: number;
  weight: number;
  height: number;
  activity: ActivityLevel;
  goal: Goal;
  macroSplit?: MacroSplit;
  pregnancyLactation?: boolean;
}

export interface CalcResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  warnings: CalcWarning[];
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [1.2, 1.375, 1.55, 1.725, 1.9];

/** v12 — energy density of fat (kcal/kg) used to translate weekly weight-change
 *  goals into a daily kcal adjustment. */
export const ENERGY_PER_KG = 7700;
export const DAYS_PER_WEEK = 7;
export const WEEKS_PER_3_MONTHS = 12;

/** Signed weekly percentage of body weight per goal. The sign is part of the
 *  value so loss goals come out negative naturally. */
export const WEEKLY_GOAL_PCT: Record<Goal, number> = {
  leve_loss: -0.005,
  loss:      -0.007,
  maintain:   0,
  leve_gain:  0.005,
  gain:       0.007,
};

export const LOSS_GOALS: Goal[] = ['leve_loss', 'loss'];

/** Daily kcal adjustment for a given user weight and goal (signed). */
export function goalAdjustment(weightKg: number, goal: Goal): number {
  return (weightKg * WEEKLY_GOAL_PCT[goal] * ENERGY_PER_KG) / DAYS_PER_WEEK;
}

/** Projected weight change in 3 months (signed kg, rounded to nearest int). */
export function projectedKgIn3Months(weightKg: number, goal: Goal): number {
  return Math.round(weightKg * WEEKLY_GOAL_PCT[goal] * WEEKS_PER_3_MONTHS);
}

const PROTEIN_G_PER_KG = 1.6;

export const FAT_COEFFICIENT: Record<MacroSplit, number> = {
  balanced: 0.275,
  low_fat:  0.20,
  low_carb: 0.35,
};

export const macroSplitLabels: Record<MacroSplit, { title: string; hint: string }> = {
  balanced: { title: 'Equilibrado',                       hint: 'Reparto estándar recomendado.' },
  low_fat:  { title: 'Bajo en grasa / más carbohidratos', hint: 'Más carbohidratos, menos grasa.' },
  low_carb: { title: 'Bajo en carbohidratos / más grasa', hint: 'Menos carbohidratos, más grasa.' },
};

function bmrMifflin(input: Pick<CalcInput, 'sex' | 'age' | 'weight' | 'height'>): number {
  const { sex, age, weight, height } = input;
  return sex === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
}

/** BMR + TDEE pre-computed for the goal screen, no goal needed. */
export function computeBmrTdee(
  input: Pick<CalcInput, 'sex' | 'age' | 'weight' | 'height' | 'activity'>,
): { bmr: number; tdee: number } {
  const bmr = bmrMifflin(input);
  return { bmr, tdee: bmr * input.activity };
}

/** Whether a goal is selectable on the goal screen given the user's BMR/TDEE
 *  and weight. Per spec §5.2, only the BMR floor disables loss goals here;
 *  pregnancy/lactation is handled at calc time (§3), not on the screen. */
export function isGoalAvailable(
  goal: Goal,
  bmr: number,
  tdee: number,
  weightKg: number,
): boolean {
  if (LOSS_GOALS.includes(goal)) {
    return tdee + goalAdjustment(weightKg, goal) >= bmr;
  }
  return true;
}

/** Full calculation per spec §4. Returns a blocked result if pregnancy/lactation
 *  collides with a loss goal. */
export function calculateCalories(input: CalcInput): CalcResult | { blocked: true; warning: 'bloqueo_embarazo' } {
  const { activity, goal, weight, macroSplit = 'balanced', pregnancyLactation = false } = input;

  if (pregnancyLactation && LOSS_GOALS.includes(goal)) {
    return { blocked: true, warning: 'bloqueo_embarazo' };
  }

  const warnings: CalcWarning[] = [];

  const bmr = bmrMifflin(input);
  const tdee = bmr * activity;
  let targetCalories = tdee + goalAdjustment(weight, goal);

  if (targetCalories < bmr) {
    targetCalories = bmr;
    warnings.push('deficit_limitado');
  }

  if (targetCalories < 800) {
    warnings.push('supervision_medica');
  }

  const proteinG = weight * PROTEIN_G_PER_KG;
  const calProtein = proteinG * 4;

  let fatCoef = FAT_COEFFICIENT[macroSplit];
  let calFat = targetCalories * fatCoef;
  let fatG = calFat / 9;

  let calCarbs = targetCalories - calProtein - calFat;
  let carbsG = calCarbs / 4;

  // Spec §9 — negative carbs retry with leanest fat coefficient.
  if (carbsG < 0) {
    fatCoef = FAT_COEFFICIENT.low_fat;
    calFat = targetCalories * fatCoef;
    fatG = calFat / 9;
    calCarbs = targetCalories - calProtein - calFat;
    carbsG = calCarbs / 4;
    if (carbsG < 0 && !warnings.includes('supervision_medica')) {
      warnings.push('supervision_medica');
    }
  }

  const calories = Math.round(targetCalories);

  return {
    calories,
    protein: Math.round(proteinG),
    carbs:   Math.round(carbsG),
    fat:     Math.round(fatG),
    bmr:     Math.round(bmr),
    tdee:    Math.round(tdee),
    proteinPct: calProtein / targetCalories,
    carbsPct:   calCarbs / targetCalories,
    fatPct:     calFat / targetCalories,
    warnings,
  };
}

/* ────────────────────────────── Labels ─────────────────────────────── */

export const activityLabels: Record<ActivityLevel, { title: string; hint: string }> = {
  1.2:   { title: 'Sedentario',           hint: 'Poco o ningún ejercicio; trabajo de escritorio.' },
  1.375: { title: 'Ligeramente activo',   hint: 'Ejercicio ligero 1–3 días/semana.' },
  1.55:  { title: 'Moderadamente activo', hint: 'Ejercicio moderado 3–5 días/semana.' },
  1.725: { title: 'Muy activo',           hint: 'Ejercicio intenso 6–7 días/semana.' },
  1.9:   { title: 'Extremadamente activo',hint: 'Ejercicio muy intenso a diario, o trabajo físico exigente.' },
};

/** v12 §2.2.1 — "test del habla" tooltips for the intensity terms used in
 *  the activity step. Keyed by the term we want the tooltip for. */
export const intensityTooltips: Record<'ligero' | 'moderado' | 'intenso', string> = {
  ligero:    'Puedes hablar y cantar sin esfuerzo. Ejemplos: caminar a paso tranquilo, estiramientos suaves.',
  moderado:  'Respiras más fuerte y puedes hablar, pero no cantar. Ejemplos: caminar a paso ligero, nadar, montar en bici, bailar.',
  intenso:   'Respiras con dificultad y solo puedes decir unas pocas palabras sin parar a respirar. Ejemplos: correr, una clase de aeróbic, entrenamiento exigente.',
};

/** Static goal titles. The hint copy depends on user weight — use goalHint(). */
export const goalLabels: Record<Goal, { title: string }> = {
  leve_loss: { title: 'Pérdida de peso — ritmo conservador (0.5%/semana)' },
  loss:      { title: 'Pérdida de peso — ritmo estándar (0.7%/semana)' },
  maintain:  { title: 'Mantenimiento' },
  leve_gain: { title: 'Ganancia de masa — ritmo conservador (0.5%/semana)' },
  gain:      { title: 'Ganancia de masa — ritmo estándar (0.7%/semana)' },
};

/** Per-card descriptive copy with the live 3-month projection substituted in.
 *  v12 §2.3 spec text. */
export function goalHint(goal: Goal, weightKg: number): string {
  if (goal === 'maintain') {
    return 'Mantén tu peso actual con un margen calórico estable.';
  }
  const n = Math.abs(projectedKgIn3Months(weightKg, goal));
  if (goal === 'leve_loss' || goal === 'loss') {
    return `Pierde aproximadamente ${n} kg en 3 meses mientras preservas músculo si tu consumo proteico es el óptimo.`;
  }
  return `Gana aproximadamente ${n} kg en 3 meses priorizando masa muscular si tu entrenamiento y proteína son los óptimos.`;
}

export const CLINICAL_NOTE_PCT_RANGE =
  'Dentro del rango 0.5%–0.7%, mientras más rápido pierdas peso, mayor el riesgo de perder masa muscular. ' +
  'Recomendación práctica: mientras más grasa tengas por perder, más te puedes acercar al 0.7%; mientras más delgado estés, más conviene quedarte cerca del 0.5%.';

export const lbToKg = (lb: number): number => lb * 0.45359237;
export const inToCm = (inches: number): number => inches * 2.54;
