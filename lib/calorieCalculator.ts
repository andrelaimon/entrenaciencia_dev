export type Sex = 'male' | 'female';
export type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
export type Goal = 'leve_loss' | 'loss' | 'maintain' | 'leve_gain' | 'gain';
export type MacroSplit = 'balanced' | 'low_fat' | 'low_carb';
/** Protein target tier — user choice (spec v13 §6). */
export type ProteinLevel = 'high' | 'standard';
/** Soft notices (v14): shown next to the result, never stop the calculation. */
export type CalcWarning =
  | 'supervision_medica'
  | 'descontrol_alimentario'
  | 'deficit_limitado'
  | 'proyeccion_bajo_peso'
  | 'carbo_bajo'
  | 'carbo_alto';

/** Hard blocks (v14): stop the calculation / disable the option. */
export type CalcBlock =
  | 'bajo_peso'
  | 'perdida_no_disponible'
  | 'bloqueo_embarazo'
  | 'vlcd_menor_800'
  | 'validacion';

export const CALC_BLOCKS: readonly CalcBlock[] = [
  'bajo_peso',
  'perdida_no_disponible',
  'bloqueo_embarazo',
  'vlcd_menor_800',
  'validacion',
];

export interface CalcInput {
  sex: Sex;
  age: number;
  weight: number;
  height: number;
  activity: ActivityLevel;
  goal: Goal;
  macroSplit?: MacroSplit;
  proteinLevel?: ProteinLevel;
  pregnancyLactation?: boolean;
}

export interface CalcResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Recommendation interval (mín–máx) per macro — spec v13 §6/§7. */
  proteinMin: number;
  proteinMax: number;
  carbsMin: number;
  carbsMax: number;
  fatMin: number;
  fatMax: number;
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
  leve_gain:  0.0025,
  gain:       0.005,
};

export const LOSS_GOALS: Goal[] = ['leve_loss', 'loss'];

/** Daily kcal adjustment for a given user weight and goal (signed). */
export function goalAdjustment(weightKg: number, goal: Goal): number {
  return (weightKg * WEEKLY_GOAL_PCT[goal] * ENERGY_PER_KG) / DAYS_PER_WEEK;
}

export type ProjectionProfile = Pick<CalcInput, 'sex' | 'weight' | 'height' | 'age' | 'activity'>;

/** Projected 3-month weight change as a kg range (spec §3b — dynamic model).
 *  Intake is fixed at the goal's day-1 target; TDEE is recomputed each of the
 *  84 days as weight drifts, so the change decelerates instead of staying
 *  linear. Returns null for maintenance (no projection). */
/** Dynamic 3-month weight simulation under a FIXED daily intake. TDEE is
 *  recomputed each day as weight drifts, so the change decelerates (not linear).
 *  v13 — projections are driven by the SERVED calories (after the floor), so a
 *  floored deficit projects the real, slower pace. */
function simulateWeightKg(profile: ProjectionProfile, intake: number, days: number): number {
  const { sex, weight: weight0, height, age, activity } = profile;
  let w = weight0;
  for (let i = 0; i < days; i++) {
    const tdee = bmrMifflin({ sex, weight: w, height, age }) * activity;
    w += (intake - tdee) / ENERGY_PER_KG;
  }
  return w;
}

/** Projected weight after `days` (default 3 months) under a fixed daily intake. */
export function projectedWeightKgFromIntake(
  profile: ProjectionProfile,
  intake: number,
  days = WEEKS_PER_3_MONTHS * DAYS_PER_WEEK,
): number {
  return simulateWeightKg(profile, intake, days);
}

/** Served daily calories for a goal (v13 — pisar-y-servir). For loss goals the
 *  requested rate is floored to the composition floor: `max(target, piso)`. For
 *  non-loss goals there is no floor, so it returns the raw target. Used by the
 *  projection so the displayed kg reflect the real (possibly slower) pace. */
export function servedCalories(profile: ProjectionProfile, goal: Goal): number {
  const { sex, weight, height, age, activity } = profile;
  const bmr = bmrMifflin({ sex, weight, height, age });
  const target = bmr * activity + goalAdjustment(weight, goal);
  if (!LOSS_GOALS.includes(goal)) return target;
  const piso = lossFloorKcal({ sex, bmiValue: bmi(weight, height), bmr });
  return Math.max(target, piso);
}

export function projectedKgRange(
  profile: ProjectionProfile,
  goal: Goal,
  days = WEEKS_PER_3_MONTHS * DAYS_PER_WEEK,
): { lo: number; hi: number; text: string } | null {
  if (goal === 'maintain') return null;
  // v13 — project from the SERVED calories (after the floor), not the raw rate.
  const w = projectedWeightKgFromIntake(profile, servedCalories(profile, goal), days);
  const changeKg = Math.abs(profile.weight - w);
  const lo = Math.floor(changeKg * 0.9);
  const hi = Math.ceil(changeKg);
  return { lo, hi, text: lo === hi ? `≈${Math.round(changeKg)} kg` : `${lo}–${hi} kg` };
}

/** Soft aviso: a currently normal-weight user (BMI ≥ 18.5) whose 3-month loss
 *  projection (from the SERVED calories) would dip below BMI 18.5. Current
 *  underweight is the hard block (`bajo_peso`); this only warns about the
 *  trajectory and never blocks. Re-checked on every input change, so once they
 *  actually cross 18.5 the gate upstream turns into the hard block. Returns
 *  false for non-loss goals. Mirrors the `proyeccion_bajo_peso` warning that
 *  `calculateCalories` emits for the report. */
export function projectsToUnderweight(
  profile: ProjectionProfile,
  goal: Goal,
  days = WEEKS_PER_3_MONTHS * DAYS_PER_WEEK,
): boolean {
  if (!LOSS_GOALS.includes(goal)) return false;
  const currentBmi = bmi(profile.weight, profile.height);
  if (currentBmi < UNDERWEIGHT_BMI) return false; // already underweight → hard block
  const projW = projectedWeightKgFromIntake(profile, servedCalories(profile, goal), days);
  return bmi(projW, profile.height) < UNDERWEIGHT_BMI;
}

/** Copy for the underweight-trajectory aviso (orange) shown under the loss
 *  projection when `projectsToUnderweight` is true (wizard) / the
 *  `proyeccion_bajo_peso` warning fires (report). */
export const UNDERWEIGHT_PROJECTION_NOTE =
  'A este ritmo llegarías a bajo peso. Reevalúa tu peso cada 2–4 semanas.';

/** v13 — the aggressive loss rate (`loss`, −0.7%) and the conservative rate
 *  (`leve_loss`, −0.5%) are both floored to the composition floor when their
 *  requested deficit is unviable. When BOTH collapse to the same served
 *  calories they project the SAME 3-month loss, so the bigger-deficit option is
 *  redundant — its extra deficit was clamped away and buys nothing. In that
 *  case we keep the conservative option open and disable the aggressive one.
 *  Returns true ONLY for the aggressive `loss` goal in that collapse case.
 *  served(loss) ≤ served(leve_loss) always (loss carries the bigger deficit →
 *  lower target); they are equal only when both hit the floor. */
export function lossGoalRedundant(profile: ProjectionProfile, goal: Goal): boolean {
  if (goal !== 'loss') return false;
  return servedCalories(profile, 'loss') >= servedCalories(profile, 'leve_loss') - 0.5;
}

/** Hint shown on the disabled aggressive-loss card when it collapses to the
 *  conservative rate (see `lossGoalRedundant`). */
export const LOSS_REDUNDANT_HINT =
  'No disponible: este ritmo te dejaría comiendo demasiado poco sin ningún beneficio extra. El conservador logra la misma pérdida en 3 meses, de manera más segura.';

/** BMI threshold separating normal-weight from obese protein coefficients. */
export const OBESITY_BMI = 30;

/** Protein bands (g/kg of TOTAL body weight) — [mín, media, máx] per level.
 *  The media is the recommended figure; the band feeds the mín–máx interval
 *  shown in the report. Always capped at 40% of calories. Two tables: one for
 *  IMC < 30, one for IMC ≥ 30 (clinically realistic range 1.2–1.6 for obese). */
export const PROTEIN_BANDS_NORMAL: Record<ProteinLevel, readonly [number, number, number]> = {
  high:     [2.0, 2.2, 2.4],
  standard: [1.4, 1.6, 1.8],
};

export const PROTEIN_BANDS_OBESE: Record<ProteinLevel, readonly [number, number, number]> = {
  high:     [1.4, 1.6, 1.8],
  standard: [1.2, 1.4, 1.6],
};

export function proteinBandsFor(
  bmiValue: number,
): Record<ProteinLevel, readonly [number, number, number]> {
  return bmiValue >= OBESITY_BMI ? PROTEIN_BANDS_OBESE : PROTEIN_BANDS_NORMAL;
}

/** Fat bands (fraction of calories to fat) — [mín, media, máx] per split
 *  (spec v13 §6). Each value is floored at 40 g and capped at 35% of calories. */
export const FAT_BANDS: Record<MacroSplit, readonly [number, number, number]> = {
  low_fat:  [0.20, 0.20,  0.22],
  balanced: [0.25, 0.275, 0.30],
  low_carb: [0.33, 0.35,  0.35],
};

/** Absolute minimum dietary fat (spec v13 §1) — 40 g/day, replaces the old
 *  0.5 g/kg floor. */
export const FAT_FLOOR_G = 40;
/** Fat ceiling as a fraction of calories (AMDR, spec v13 §1). */
export const FAT_CEILING_PCT = 0.35;
/** Protein cap as a fraction of calories (spec v13 §6). */
export const PROTEIN_CAP_PCT = 0.40;
/** Carbohydrate ceiling as a fraction of calories (spec v13 §9). */
export const CARB_CEILING_PCT = 0.65;
/** Carbohydrate floor (g/kg): 2.0 in a surplus (gain), 1.0 otherwise (spec v13 §9). */
export const CARB_FLOOR_G_PER_KG = { surplus: 2.0, default: 1.0 } as const;

export const GAIN_GOALS: Goal[] = ['leve_gain', 'gain'];

/** Default protein tier when the user hasn't chosen one.
 *  Loss + IMC < 30 → Alto; Loss + IMC ≥ 30 → Estándar (realistic for obese);
 *  maintenance/gain → Estándar. */
export function defaultProteinLevel(goal: Goal, bmiValue = 0): ProteinLevel {
  if (!LOSS_GOALS.includes(goal)) return 'standard';
  return bmiValue >= OBESITY_BMI ? 'standard' : 'high';
}

/** Sex-based safe-calorie floors (v15 §"piso"). Used as the loss floor ONLY for
 *  overweight+ users (BMI ≥ 25), who carry fat reserves and may eat below BMR.
 *  See `lossFloorKcal`. Normal/lean users floor at their BMR instead. */
export const SAFETY_MIN_KCAL = { female: 1200, male: 1500 } as const;

/** BMI threshold below which weight loss is not offered (v14 §1 — bajo_peso). */
export const UNDERWEIGHT_BMI = 18.5;

/** BMI at/above which the loss floor is the sex floor (1200/1500) instead of
 *  BMR (v15). Below it (normal/lean, 18.5–25) the floor is BMR — we never tell
 *  a non-overweight person to eat below their basal metabolism. */
export const OVERWEIGHT_BMI = 25;

/** Very-low-calorie-diet backstop (v14): served calories under this are blocked.
 *  Almost never triggers since the floors keep served calories high. */
export const VLCD_FLOOR_KCAL = 800;

/** Minimum real deficit (kcal/día) to offer a loss option (v13 §DEFICIT_MIN).
 *  If even at the floor `TDEE − served < DEFICIT_MIN`, the option is blocked
 *  (`perdida_no_disponible`) — there is no meaningful deficit to be had. */
export const DEFICIT_MIN = 150;

/** v13 loss floor by body composition (BMI proxy, valid at this extreme):
 *   - BMI ≥ 25 (overweight+):    floor = sex floor 1200/1500 (fat to spare → may
 *     eat below BMR).
 *   - BMI 18.5–25 (normal/lean): floor = max(BMR, 1200/1500) — never below basal
 *     metabolism, and never below the absolute safe minimum either.
 *   - BMI < 18.5 is handled upstream as a hard block (bajo_peso). */
export function lossFloorKcal(opts: { sex: Sex; bmiValue: number; bmr: number }): number {
  const base = SAFETY_MIN_KCAL[opts.sex];
  return opts.bmiValue >= OVERWEIGHT_BMI ? base : Math.max(opts.bmr, base);
}

/** Accepted input ranges (v14 §validacion). */
export const INPUT_RANGES = {
  age:    { min: 18,  max: 80 },
  weight: { min: 30,  max: 300 },  // kg
  height: { min: 120, max: 230 },  // cm
} as const;

/** Body Mass Index from kg + cm. */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Fat grams for a given fraction-of-calories coefficient, applying the 40 g
 *  floor and the 35% ceiling (spec v13 §6/§7). */
function fatGramsFor(coef: number, calories: number): number {
  let g = (coef * calories) / 9;
  if (g < FAT_FLOOR_G) g = FAT_FLOOR_G;
  const ceilingG = (FAT_CEILING_PCT * calories) / 9;
  if (g > ceilingG) g = ceilingG;
  return g;
}

/** Protein grams for a given g/kg coefficient, capped at 40% of calories. */
function proteinGramsFor(coef: number, weightKg: number, calories: number): number {
  return Math.min(coef * weightKg, (PROTEIN_CAP_PCT * calories) / 4);
}

/** Round half to even (banker's rounding), matching the verified reference
 *  values in spec §8 (e.g. 3510.5 → 3510, not 3511). */
function roundHalfToEven(x: number): number {
  if (Math.abs(x - Math.trunc(x)) === 0.5) {
    const floor = Math.floor(x);
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.round(x);
}

export const macroSplitLabels: Record<MacroSplit, { title: string; hint: string }> = {
  balanced: {
    title: 'Balanceado',
    hint:  'Reparto equilibrado entre grasas y carbohidratos. La opción versátil y sostenible para la mayoría de las personas.',
  },
  low_fat: {
    title: 'Bajo en grasas',
    hint:  'Prioriza los carbohidratos como fuente principal de energía y reduce las grasas. Ideal si entrenas con alta intensidad o volumen.',
  },
  low_carb: {
    title: 'Bajo en carbohidratos',
    hint:  'Reduce los carbohidratos y aumenta las grasas. Útil si prefieres comidas más saciantes o controlas mejor el apetito así.',
  },
};

/** Protein-tier labels (no numbers, spec v13 §6). */
export const proteinLevelLabels: Record<ProteinLevel, { title: string }> = {
  high:     { title: 'Alto' },
  standard: { title: 'Estándar' },
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

/** v13 loss-availability rules (pisar-y-servir). A loss goal is disabled when:
 *   - pregnancy/lactation,
 *   - BMI < 18.5 (underweight → bajo_peso), or
 *   - even at the floor there is less than DEFICIT_MIN of real deficit, i.e.
 *     `TDEE − max(target, piso) < DEFICIT_MIN`.
 *  Otherwise we floor-and-serve `max(target, piso)` (so an overweight user whose
 *  requested rate dips below their BMR is still served at 1200/1500 instead of
 *  being blocked). Maintenance and gain are always available. */
export function isGoalAvailable(
  goal: Goal,
  opts: { sex: Sex; tdee: number; bmr: number; weightKg: number; heightCm: number; pregnancyLactation?: boolean },
): boolean {
  if (!LOSS_GOALS.includes(goal)) return true;
  const { sex, tdee, bmr, weightKg, heightCm, pregnancyLactation = false } = opts;
  if (pregnancyLactation) return false;
  const bmiValue = bmi(weightKg, heightCm);
  if (bmiValue < UNDERWEIGHT_BMI) return false;
  const piso = lossFloorKcal({ sex, bmiValue, bmr });
  const target = tdee + goalAdjustment(weightKg, goal);
  const served = Math.max(target, piso);
  if (tdee - served < DEFICIT_MIN) return false;
  return true;
}

/** Full calculation per spec v14. Returns a blocked result (with the block
 *  code) when a loss rule, the VLCD backstop, or input validation fails. */
export function calculateCalories(input: CalcInput): CalcResult | { blocked: true; warning: CalcBlock } {
  const {
    sex,
    age,
    height,
    activity,
    goal,
    weight,
    macroSplit = 'balanced',
    pregnancyLactation = false,
  } = input;

  // v14 §validacion — reject out-of-range inputs before any computation.
  if (
    !(age >= INPUT_RANGES.age.min && age <= INPUT_RANGES.age.max) ||
    !(weight >= INPUT_RANGES.weight.min && weight <= INPUT_RANGES.weight.max) ||
    !(height >= INPUT_RANGES.height.min && height <= INPUT_RANGES.height.max)
  ) {
    return { blocked: true, warning: 'validacion' };
  }

  const bmiValue = bmi(weight, height);
  const proteinLevel = input.proteinLevel ?? defaultProteinLevel(goal, bmiValue);

  const bmr = bmrMifflin(input);
  const tdee = bmr * activity;
  const isLoss = LOSS_GOALS.includes(goal);

  const warnings: CalcWarning[] = [];

  // v13 §"reglas de pérdida" — loss decision (pisar-y-servir), evaluated before
  // the macro pipeline. The floor depends on body composition: 1200/1500 for
  // overweight+ (≥25, fat to spare → may eat below BMR), max(BMR,1200/1500) for
  // normal/lean (18.5–25). We FLOOR-AND-SERVE: if the requested deficit lands
  // below the floor we serve the floor and flag `deficit_limitado`, instead of
  // disabling. The option is only blocked when even at the floor there is less
  // than DEFICIT_MIN of real deficit. The served value drives the macros and the
  // projection, so the projected pace reflects the real (possibly slower) loss.
  let targetCalories = tdee + goalAdjustment(weight, goal);
  if (isLoss) {
    if (pregnancyLactation) return { blocked: true, warning: 'bloqueo_embarazo' };
    if (bmiValue < UNDERWEIGHT_BMI) return { blocked: true, warning: 'bajo_peso' };
    const piso = lossFloorKcal({ sex, bmiValue, bmr });
    const served = Math.max(targetCalories, piso);
    if (tdee - served < DEFICIT_MIN) return { blocked: true, warning: 'perdida_no_disponible' };
    if (served > targetCalories) warnings.push('deficit_limitado'); // limitado al piso
    targetCalories = served;
    // Aviso (no bloquea): aun servido al piso, el plan te lleva a bajo peso a
    // 3 meses. Se calcula desde las calorías SERVIDAS.
    const projWeight = projectedWeightKgFromIntake({ sex, weight, height, age, activity }, targetCalories);
    if (bmi(projWeight, height) < UNDERWEIGHT_BMI) warnings.push('proyeccion_bajo_peso');
  }

  // VLCD backstop — served calories under 800 are blocked (rare: only reachable
  // for a normal/lean user whose BMR floor is itself under 800).
  if (targetCalories < VLCD_FLOOR_KCAL) {
    return { blocked: true, warning: 'vlcd_menor_800' };
  }

  // Bands [mín, media, máx]. The media values are the recommended figures; the
  // mín/máx feed the interval shown in the report (spec v13 §6).
  const [pMinC, pMedC, pMaxC] = proteinBandsFor(bmiValue)[proteinLevel];
  const proteinMinG = proteinGramsFor(pMinC, weight, targetCalories);
  const proteinMaxG = proteinGramsFor(pMaxC, weight, targetCalories);

  const [fMinC, fMedC, fMaxC] = FAT_BANDS[macroSplit];
  const fatMinG = fatGramsFor(fMinC, targetCalories);
  const fatMaxG = fatGramsFor(fMaxC, targetCalories);

  // Central macros — protein and fat are ROUNDED first; carbohydrate then
  // absorbs the rounding remainder so the displayed calories equal the exact
  // macro sum and the three percentages add up to 100% (no leftover kcal).
  //   proteina_g = round(coef_prot × peso, tope 40%)
  //   grasa_g    = round(grasa, piso 40 g)
  //   carbohidratos_g = round((calorías − proteina_g×4 − grasa_g×9) / 4)
  const proteinG = roundHalfToEven(proteinGramsFor(pMedC, weight, targetCalories));
  const fatG     = roundHalfToEven(fatGramsFor(fMedC, targetCalories));
  let   carbsG   = roundHalfToEven(Math.max(0, (targetCalories - proteinG * 4 - fatG * 9) / 4));

  // Interval carbohydrate bounds (inverse: carb-mín pairs the highest protein+fat).
  const carbFromRemainder = (protG: number, fG: number) =>
    Math.max(0, (targetCalories - protG * 4 - fG * 9) / 4);
  const carbsMinG = carbFromRemainder(proteinMaxG, fatMaxG);
  const carbsMaxG = carbFromRemainder(proteinMinG, fatMinG);

  // Paso 9 — carbohydrate warnings (evaluated on the rounded central values).
  // If protein+fat leave no room for carbs, carbs go to 0 (the resulting
  // carbo_bajo notice covers this edge). supervision_medica is now driven by
  // the medical screening flags, not by this case (v14).
  if (targetCalories - proteinG * 4 - fatG * 9 < 0) {
    carbsG = 0;
  }
  const carbFloorG = (GAIN_GOALS.includes(goal) ? CARB_FLOOR_G_PER_KG.surplus : CARB_FLOOR_G_PER_KG.default) * weight;
  if (carbsG < carbFloorG) warnings.push('carbo_bajo');
  if (carbsG * 4 > CARB_CEILING_PCT * targetCalories) warnings.push('carbo_alto');

  // calorias_mostradas = proteina_g×4 + grasa_g×9 + carbohidratos_g×4
  // (suma exacta de los macros redondeados → los % suman 100%).
  const calProtein = proteinG * 4;
  const calFat     = fatG * 9;
  const calCarbs   = carbsG * 4;
  const caloriesShown = calProtein + calFat + calCarbs;
  const denom = caloriesShown || 1;

  return {
    calories:   caloriesShown,
    protein:    proteinG,
    carbs:      carbsG,
    fat:        fatG,
    proteinMin: roundHalfToEven(proteinMinG),
    proteinMax: roundHalfToEven(proteinMaxG),
    carbsMin:   roundHalfToEven(carbsMinG),
    carbsMax:   roundHalfToEven(carbsMaxG),
    fatMin:     roundHalfToEven(fatMinG),
    fatMax:     roundHalfToEven(fatMaxG),
    bmr:        Math.round(bmr),
    tdee:       Math.round(tdee),
    proteinPct: calProtein / denom,
    carbsPct:   calCarbs / denom,
    fatPct:     calFat / denom,
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

/** Static goal titles. The per-card projection copy is built from projectedKgRange(). */
export const goalLabels: Record<Goal, { title: string }> = {
  leve_loss: { title: 'Pérdida de peso — ritmo conservador (0.50%)' },
  loss:      { title: 'Pérdida de peso — ritmo estándar (0.70%)' },
  maintain:  { title: 'Mantenimiento' },
  leve_gain: { title: 'Ganancia de masa — ritmo conservador (0.25%)' },
  gain:      { title: 'Ganancia de masa — ritmo estándar (0.50%)' },
};

/** Static copy for the maintenance goal card (no projection — spec §3b). */
export const MAINTAIN_HINT = 'Mantén tu peso actual con un margen calórico estable.';

/** Protein-optimality caveat (spec §6): lives in a tooltip, not the card body. */
export function goalProteinNote(goal: Goal): string | null {
  if (LOSS_GOALS.includes(goal)) {
    return 'Preservas masa muscular si tu consumo proteico es el óptimo.';
  }
  if (goal === 'leve_gain' || goal === 'gain') {
    return 'Priorizas masa muscular si tu entrenamiento y proteína son los óptimos.';
  }
  return null;
}

/** Fixed note shown under the goal cards (spec §3b). */
export const PROJECTION_NOTE =
  'Estimación inicial; el ritmo real se desacelera con el tiempo. Vuelve en 1–2 meses con tu nuevo peso para recalcular tu plan.';

/** Notice shown under maintenance/gain when pregnancy/lactation is flagged (spec §3). */
export const PREGNANCY_EXTRA_KCAL_NOTE =
  'Estas cifras no incluyen el aporte calórico adicional del embarazo o la lactancia. ' +
  'Consulta a tu profesional de salud.';

export const CLINICAL_NOTE_PCT_RANGE =
  'Dentro del rango 0.50%–0.70%, mientras más rápido pierdas peso, mayor el riesgo de perder masa muscular. ' +
  'Recomendación práctica: mientras más grasa tengas por perder, más te puedes acercar al 0.70%; mientras más delgado estés, más conviene quedarte cerca del 0.50%.';

/** Goal message shown for gain goals — spec §5.4 (yellow box). */
export const CLINICAL_NOTE_GAIN =
  'Ganar peso construye músculo solo si entrenas fuerza y comes suficiente proteína; ' +
  'si no, el excedente será grasa. A mayor velocidad (0.50%), más grasa acompaña al ' +
  'músculo; con el ritmo conservador (0.25%) la masa que ganas es más magra.';

/** Hint under the protein-tier row (spec v13 §6). */
export const PROTEIN_LEVEL_HINT =
  'Si tienes experiencia entrenando en el gimnasio, te recomendamos seleccionar alto en proteína.';

/** Shown for loss goals: justifies the default "Alto" protein tier in a deficit. */
export const PROTEIN_DEFICIT_NOTE =
  'Para proteger tu masa muscular durante un déficit calórico, recomendamos mantener un consumo de proteína alto.';

/** Renal-disease contraindication for high protein (spec v13 §6). */
export const PROTEIN_RENAL_NOTE =
  'Si tienes enfermedad renal, consulta con tu profesional de salud antes de elegir un consumo alto de proteína.';

/** Fixed calibration message shown in every report (spec v13 §7). */
export const CALIBRATION_NOTE =
  'Estas cifras son un punto de partida basado en ciencia, con un margen de ±10%. ' +
  'Síguelas 2–3 semanas y ajústalas según tu peso real: tu cuerpo siempre tiene la última palabra sobre la fórmula.';

/** Full block messages (v14) — shown when the calculation is stopped
 *  (e.g. the wizard's submit error banner). */
export const BLOCK_MESSAGES: Record<CalcBlock, string> = {
  bajo_peso:
    'Tu IMC está por debajo de 18.5 (bajo peso), así que no recomendamos perder peso. ' +
    'Puedes elegir mantenimiento o ganancia, o consultar a un profesional de salud.',
  perdida_no_disponible:
    'Estás muy cerca de tu mínimo calórico seguro y el margen para un déficit es muy pequeño. ' +
    'Aumentar tu actividad física te daría más espacio para perder grasa de forma saludable.',
  bloqueo_embarazo:
    'Durante el embarazo o la lactancia no entregamos objetivos de pérdida de peso: las ' +
    'necesidades de energía y nutrientes aumentan. Consulta a tu profesional de salud.',
  vlcd_menor_800:
    'El plan resultante es demasiado bajo en calorías (menos de 800/día) para seguirlo sin ' +
    'supervisión médica. Consulta a un profesional.',
  validacion:
    'Revisa tus datos: hay un valor fuera de rango (edad 18–80, peso 30–300 kg, altura 120–230 cm).',
};

/** Short, in-card hints (v14) — shown under a disabled goal option. */
export const BLOCK_GOAL_HINT: Record<CalcBlock, string> = {
  bajo_peso:
    'No disponible: tu IMC indica bajo peso (< 18.5); no se recomienda perder peso.',
  perdida_no_disponible:
    'No disponible: estás muy cerca de tu mínimo seguro. Aumenta tu actividad para tener más margen.',
  bloqueo_embarazo:
    'No disponible durante embarazo o lactancia por seguridad.',
  vlcd_menor_800:
    'No disponible: el plan resultante sería demasiado bajo en calorías.',
  validacion:
    'Revisa tus datos: hay un valor fuera de rango.',
};

/** Soft-notice copy (v14 avisos) for the report. Rendered in green (these never
 *  stop the calculation). `_ctx` is kept for call-site compatibility. */
export function warningCopy(w: CalcWarning, _ctx?: { sex?: Sex }): { title: string; body: string } {
  switch (w) {
    case 'carbo_bajo':
      return {
        title: 'Tus carbohidratos quedaron bajos',
        body:
          'A este nivel de calorías tus carbohidratos quedan bajos. Es normal en un déficit; ' +
          'prioriza fuentes con fibra (verduras, legumbres, fruta) para rendir y saciarte mejor.',
      };
    case 'carbo_alto':
      return {
        title: 'Tus carbohidratos quedaron altos',
        body:
          'Tus carbohidratos quedan altos respecto a la grasa. Si lo prefieres, elige el reparto ' +
          '«Bajo en carbohidratos» para equilibrarlo.',
      };
    case 'supervision_medica':
      return {
        title: 'Conviene revisarlo con un profesional',
        body: 'Con estos datos, tu plan conviene revisarlo con un profesional de salud antes de seguirlo.',
      };
    case 'descontrol_alimentario':
      return {
        title: 'Tu caso podría requerir supervisión profesional',
        body: 'Usa estas cifras solo como referencia.',
      };
    case 'deficit_limitado':
      return {
        title: 'Ajustamos tu déficit a un mínimo seguro',
        body:
          'Tu ritmo elegido quedaba por debajo de un mínimo seguro, así que servimos ese mínimo. ' +
          'Perderás algo más lento, pero de forma más sostenible.',
      };
    case 'proyeccion_bajo_peso':
      return {
        title: 'Riesgo de llegar a bajo peso',
        body: UNDERWEIGHT_PROJECTION_NOTE,
      };
  }
}

/** Red safety callout shown at the TOP of the report (before the figures) when
 *  the medical screening flags supervision AND the goal is loss (v14). Placed
 *  above the numbers so the user reads it before acting on the plan. */
export const MEDICAL_SUPERVISION_NOTE = {
  title: 'Recomendamos supervisión médica',
  body:
    'Indicaste una condición de salud que puede verse afectada por un déficit calórico. ' +
    'Te recomendamos evitar dietas restrictivas por tu cuenta y validar estas cifras con ' +
    'tu médico antes de seguirlas. Úsalas solo como referencia.',
} as const;

/** Persistent pregnancy/lactation callout shown at the TOP of the report
 *  whenever the user marked embarazo/lactancia (any goal). Renders yellow by
 *  default; escalates to red + `extra` when another screening flag also fired
 *  (i.e. `supervision_medica` is present in the result warnings). */
export const PREGNANCY_REPORT_NOTE = {
  title: 'Embarazo o lactancia',
  body:
    'En el embarazo y la lactancia tus necesidades de calorías y nutrientes son distintas y ' +
    'suelen ser mayores. Estas cifras no contemplan ese aporte adicional, así que tómalas solo ' +
    'como referencia y consulta a tu profesional de salud para un plan adecuado a tu etapa.',
  extra: 'Tu caso debe ser evaluado por un profesional antes de continuar.',
} as const;

export const lbToKg = (lb: number): number => lb * 0.45359237;
export const inToCm = (inches: number): number => inches * 2.54;
