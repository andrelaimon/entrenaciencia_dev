export type Sex = 'male' | 'female';
export type ActivityLevel = 1.375 | 1.55 | 1.725 | 1.9 | 2.0;
export type Goal = 'leve_loss' | 'loss' | 'maintain' | 'leve_gain' | 'gain';

export interface CalcInput {
  sex: Sex;
  age: number;
  weight: number;
  height: number;
  activity: ActivityLevel;
  goal: Goal;
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
}

const goalAdjustments: Record<Goal, number> = {
  leve_loss: -250,
  loss: -500,
  maintain: 0,
  leve_gain: 250,
  gain: 500,
};

function defaultProteinPct(goal: Goal): number {
  if (goal === 'leve_loss' || goal === 'loss') return 0.35;
  return 0.30;
}

export function calculateCalories(input: CalcInput): CalcResult {
  const { sex, age, weight, height, activity, goal } = input;

  const bmr =
    sex === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * activity;
  const calories = Math.round(tdee + goalAdjustments[goal]);

  const proteinPct = defaultProteinPct(goal);
  const fatPct = 0.25;
  const carbsPct = 1 - proteinPct - fatPct;

  return {
    calories,
    protein: Math.round((calories * proteinPct) / 4),
    carbs: Math.round((calories * carbsPct) / 4),
    fat: Math.round((calories * fatPct) / 9),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    proteinPct,
    carbsPct,
    fatPct,
  };
}

export const activityLabels: Record<ActivityLevel, string> = {
  1.375: 'Ligera — ejercicio 1–3 veces por semana (15–30 min de frecuencia cardíaca elevada)',
  1.55: 'Moderada — ejercicio 4–5 veces por semana',
  1.725: 'Activo — ejercicio intenso todos los días o 3–4 veces por semana (45–120 min)',
  1.9: 'Muy activo — ejercicio intenso 6–7 veces por semana',
  2.0: 'Extra activo — ejercicio muy intenso a diario (2+ horas)',
};

export type MacroPreset = 'high_protein' | 'balanced' | 'high_carb';

export const macroPresets: Record<MacroPreset, { protein: number; carbs: number; fat: number; label: string }> = {
  high_protein: { protein: 0.40, carbs: 0.35, fat: 0.25, label: 'Alta proteína' },
  balanced:     { protein: 0.30, carbs: 0.45, fat: 0.25, label: 'Equilibrado' },
  high_carb:    { protein: 0.20, carbs: 0.55, fat: 0.25, label: 'Alto en carbos' },
};

export const goalLabels: Record<Goal, { title: string; hint: string }> = {
  leve_loss: {
    title: 'Leve pérdida de peso — 0.25 kg/semana',
    hint: 'A este ritmo, en 3 meses podrías perder 3 kg de grasa mientras conservas masa muscular.',
  },
  loss: {
    title: 'Pérdida de peso — 0.5 kg/semana',
    hint: 'A este ritmo, en 3 meses podrías perder 6 kg de grasa mientras conservas masa muscular.',
  },
  maintain: {
    title: 'Mantenimiento',
    hint: 'Mantén tu composición corporal actual.',
  },
  leve_gain: {
    title: 'Leve ganancia de masa — 0.25 kg/semana',
    hint: 'A este ritmo, en 3 meses podrías ganar 3 kg de masa muscular con mínima grasa acumulada.',
  },
  gain: {
    title: 'Ganancia de masa — 0.5 kg/semana',
    hint: 'A este ritmo, en 3 meses podrías ganar 6 kg de masa con un superávit controlado.',
  },
};

export const lbToKg = (lb: number): number => lb * 0.45359237;
export const inToCm = (inches: number): number => inches * 2.54;

/** Katch-McArdle: requires lean body mass (kg). More accurate when body fat % is known. */
export function calculateCaloriesKatch(
  lbm: number,
  activity: ActivityLevel,
  goal: Goal,
  macroPreset: MacroPreset = 'balanced',
): CalcResult {
  const bmr = 370 + 21.6 * lbm;
  const tdee = bmr * activity;
  const calories = Math.round(tdee + goalAdjustments[goal]);

  const { protein: proteinPct, carbs: carbsPct, fat: fatPct } = macroPresets[macroPreset];

  return {
    calories,
    protein: Math.round((calories * proteinPct) / 4),
    carbs: Math.round((calories * carbsPct) / 4),
    fat: Math.round((calories * fatPct) / 9),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    proteinPct,
    carbsPct,
    fatPct,
  };
}

/** Standard Mifflin-St Jeor with custom macro preset support. */
export function calculateCaloriesWithPreset(
  input: CalcInput,
  macroPreset: MacroPreset = 'balanced',
): CalcResult {
  const { sex, age, weight, height, activity, goal } = input;

  const bmr =
    sex === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * activity;
  const calories = Math.round(tdee + goalAdjustments[goal]);

  const { protein: proteinPct, carbs: carbsPct, fat: fatPct } = macroPresets[macroPreset];

  return {
    calories,
    protein: Math.round((calories * proteinPct) / 4),
    carbs: Math.round((calories * carbsPct) / 4),
    fat: Math.round((calories * fatPct) / 9),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    proteinPct,
    carbsPct,
    fatPct,
  };
}
