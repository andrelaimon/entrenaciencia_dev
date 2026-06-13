'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { getTrackingContext } from '@/lib/tracking';
import { fireConversionEvent } from '@/lib/pixel';
import {
  ACTIVITY_LEVELS,
  activityLabels,
  intensityTooltips,
  goalLabels,
  projectedKgRange,
  projectsToUnderweight,
  UNDERWEIGHT_PROJECTION_NOTE,
  lossGoalRedundant,
  LOSS_REDUNDANT_HINT,
  MAINTAIN_HINT,
  goalProteinNote,
  PROJECTION_NOTE,
  PREGNANCY_EXTRA_KCAL_NOTE,
  CLINICAL_NOTE_PCT_RANGE,
  CLINICAL_NOTE_GAIN,
  PROTEIN_LEVEL_HINT,
  PROTEIN_DEFICIT_NOTE,
  PROTEIN_RENAL_NOTE,
  LOSS_GOALS,
  GAIN_GOALS,
  macroSplitLabels,
  proteinLevelLabels,
  defaultProteinLevel,
  lbToKg,
  inToCm,
  calculateCalories,
  bmi,
  OBESITY_BMI,
  BLOCK_MESSAGES,
  BLOCK_GOAL_HINT,
  type ActivityLevel,
  type Goal,
  type Sex,
  type MacroSplit,
  type ProteinLevel,
  type CalcWarning,
  type CalcBlock,
  type CalcResult,
} from '@/lib/calorieCalculator';

type Step = 'intro' | 'screening' | 'form';

type ScreeningFlags = {
  medical: boolean;
  weightChange: boolean;
  eatingControl: boolean;
  pregnancyLactation: boolean;
  restrictiveDiet: boolean;
  disclaimerAccepted: boolean;
};

type Obstacle =
  | 'no_time'
  | 'food_discipline'
  | 'training_discipline'
  | 'exercise_knowledge'
  | 'other';

type FormState = {
  units: 'metric' | 'imperial';
  age: string;
  sex: Sex;
  weight: string;
  height: string;
  activity: ActivityLevel | null;
  goal: Goal | null;
  macroSplit: MacroSplit;
  proteinLevel: ProteinLevel;
  obstacle: Obstacle | '';
  name: string;
  email: string;
  whatsapp: string;
  obstacleOther: string;
};

const GOAL_ORDER: Goal[] = ['leve_loss', 'loss', 'maintain', 'leve_gain', 'gain'];
const MACRO_SPLITS: MacroSplit[] = ['low_fat', 'balanced', 'low_carb'];
const PROTEIN_LEVELS: ProteinLevel[] = ['high', 'standard'];

/** Selected-state colour for every choice group (spec v13 §8 — verde claro). */
const SELECT_GREEN = '#9CE2B6';

const SCREENING_CHECKBOXES: { id: keyof ScreeningFlags; label: string; disclaimer?: string }[] = [
  {
    id: 'medical',
    label: 'Antecedentes de condiciones médicas (enfermedad tiroidea, hepática, renal, diabetes, etc.)',
  },
  {
    id: 'weightChange',
    label: 'He perdido más del 5% de mi peso corporal en los últimos 3 meses sin intentarlo',
  },
  {
    id: 'eatingControl',
    label: 'Dificultad para mantener una alimentación regular o sensación de poco control al comer',
  },
  {
    id: 'pregnancyLactation',
    label: 'Embarazo o lactancia',
  },
  {
    id: 'restrictiveDiet',
    label: 'He seguido una dieta muy restrictiva o baja en calorías en los últimos 3 meses',
  },
];

const OBSTACLES: { id: Obstacle; label: string }[] = [
  { id: 'no_time', label: 'No tengo tiempo para cocinar' },
  { id: 'food_discipline', label: 'Me cuesta ser disciplinado con lo que como' },
  { id: 'training_discipline', label: 'Me cuesta ser disciplinado con el entrenamiento' },
  { id: 'exercise_knowledge', label: 'No sé qué ejercicios son los más efectivos' },
  { id: 'other', label: 'Otro' },
];

const WARNING_MESSAGE =
  'Algunas de las situaciones que seleccionaste indican que tu caso puede requerir una evaluación más personalizada. Esta calculadora te dará un punto de partida útil, pero te recomendamos validar los resultados con un profesional de salud.';

const PREGNANCY_MESSAGE =
  'Durante el embarazo y la lactancia los requerimientos energéticos cambian de forma significativa y requieren supervisión profesional. Te recomendamos consultar directamente con tu médico o nutricionista antes de usar estos resultados.';

const DISCLAIMER_COPY =
  'Entiendo que mi caso puede requerir supervisión profesional, que esta herramienta no reemplaza una consulta médica o nutricional individualizada y que continúo bajo mi propia responsabilidad.';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialFlags(): ScreeningFlags {
  return {
    medical: false,
    weightChange: false,
    eatingControl: false,
    pregnancyLactation: false,
    restrictiveDiet: false,
    disclaimerAccepted: false,
  };
}

function initialForm(): FormState {
  return {
    units: 'metric',
    age: '',
    sex: 'male',
    weight: '',
    height: '',
    activity: null,
    goal: null,
    macroSplit: 'balanced',
    proteinLevel: 'standard',
    obstacle: '',
    name: '',
    email: '',
    whatsapp: '',
    obstacleOther: '',
  };
}

function warningLevel(flags: ScreeningFlags): 'none' | 'yellow' | 'red' | 'pregnancy' {
  if (flags.pregnancyLactation) return 'pregnancy';
  const count =
    (flags.medical ? 1 : 0) +
    (flags.weightChange ? 1 : 0) +
    (flags.eatingControl ? 1 : 0) +
    (flags.restrictiveDiet ? 1 : 0);
  if (count >= 2) return 'red';
  if (count === 1) return 'yellow';
  return 'none';
}

/** v14 — supervision is flagged by any medical-history signal: a medical
 *  condition, a recent restrictive diet, poor eating control, or unintentional
 *  weight loss. Drives the screening risk-acceptance checkbox. */
function needsMedicalSupervision(flags: ScreeningFlags): boolean {
  return flags.medical || flags.restrictiveDiet || flags.eatingControl || flags.weightChange;
}

/** v15 — flags that inject the green `supervision_medica` notice in the report.
 *  Eating control was carved out: it now shows its own orange
 *  `descontrol_alimentario` aviso instead (never the green/red supervision). */
function needsReportSupervision(flags: ScreeningFlags): boolean {
  return flags.medical || flags.restrictiveDiet || flags.weightChange;
}

function requiresDisclaimer(flags: ScreeningFlags): boolean {
  return needsMedicalSupervision(flags) || flags.pregnancyLactation;
}

export default function CalculatorWizard() {
  const [step, setStep] = useState<Step>('intro');
  const [flags, setFlags] = useState<ScreeningFlags>(initialFlags);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<{
    name: string;
    inputs: Record<string, unknown>;
    result: CalcResult;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const wizardSessionId = useRef<string>(crypto.randomUUID());
  const startTime = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  // Scroll to top on initial mount and on every top-level step transition,
  // so each screen starts at the top instead of inheriting the previous Y.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, submitted]);

  useEffect(() => {
    const handleUnload = () => {
      if (submittedRef.current) return;
      const data = {
        wizard_session_id:        wizardSessionId.current,
        step_reached:             step,
        time_on_page_seconds:     Math.round((Date.now() - startTime.current) / 1000),
        email:                    form.email || null,
        goal_selected:            form.goal || null,
        obstacle_selected:        form.obstacle || null,
        flag_medical:             flags.medical,
        flag_weight_change:       flags.weightChange,
        flag_eating_control:      flags.eatingControl,
        flag_pregnancy_lactation: flags.pregnancyLactation,
        flag_restrictive_diet:    flags.restrictiveDiet,
        ...getTrackingContext(),
      };
      navigator.sendBeacon(
        '/api/calculator-sessions',
        new Blob([JSON.stringify(data)], { type: 'application/json' })
      );
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [step, form, flags]);

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <AnimatePresence mode="wait">
        {submitted && submittedReport ? (
          <ConfirmationStep key="done" report={submittedReport} />
        ) : step === 'intro' ? (
          <IntroStep key="intro" onNext={() => setStep('screening')} />
        ) : step === 'screening' ? (
          <ScreeningStep
            key="screening"
            flags={flags}
            setFlags={setFlags}
            onBack={() => setStep('intro')}
            onNext={() => setStep('form')}
          />
        ) : (
          <FormStep
            key="form"
            form={form}
            setForm={setForm}
            pregnancyLactation={flags.pregnancyLactation}
            submitting={submitting}
            submitError={submitError}
            onBack={() => setStep('screening')}
            onSubmit={async () => {
              setSubmitError(null);
              setSubmitting(true);
              try {
                const weightKg = form.units === 'imperial' ? lbToKg(Number(form.weight)) : Number(form.weight);
                const heightCm = form.units === 'imperial' ? inToCm(Number(form.height)) : Number(form.height);

                const calcInput = {
                  sex: form.sex,
                  age: Number(form.age),
                  weight: weightKg,
                  height: heightCm,
                  activity: form.activity as ActivityLevel,
                  goal: form.goal as Goal,
                  macroSplit: form.macroSplit,
                  proteinLevel: form.proteinLevel,
                  pregnancyLactation: flags.pregnancyLactation,
                };

                const calc = calculateCalories(calcInput);
                if ('blocked' in calc) {
                  setSubmitError(BLOCK_MESSAGES[calc.warning]);
                  setSubmitting(false);
                  return;
                }

                // v15 — screening-driven report avisos. A medical condition, a
                // recent restrictive diet, or unintentional weight loss inject the
                // green supervision_medica notice; eating control injects its own
                // orange descontrol_alimentario aviso instead.
                const extraWarnings: CalcWarning[] = [];
                if (needsReportSupervision(flags)) extraWarnings.push('supervision_medica');
                if (flags.eatingControl) extraWarnings.push('descontrol_alimentario');
                const warningsOut: CalcWarning[] = [
                  ...calc.warnings,
                  ...extraWarnings.filter((w) => !calc.warnings.includes(w)),
                ];
                const result = { ...calc, warnings: warningsOut };

                const payload = {
                  inputs: { ...calcInput, units: form.units },
                  result,
                  warnings: result.warnings,
                  obstacle: form.obstacle,
                  obstacle_other: form.obstacle === 'other' ? form.obstacleOther.trim() || null : null,
                  name: form.name.trim(),
                  email: form.email.trim(),
                  whatsapp: form.whatsapp.trim() || null,
                  flags,
                  klaviyoProps: { obstacle: form.obstacle, restrictive_diet: flags.restrictiveDiet },
                  ...getTrackingContext(),
                };

                // Save to DB in the background — don't block the report on it
                fetch('/api/calculator-submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                }).catch(() => {});

                setSubmittedReport({
                  name:   form.name.trim(),
                  inputs: { ...calcInput, units: form.units } as Record<string, unknown>,
                  result,
                });

                submittedRef.current = true;
                fireConversionEvent('CompleteRegistration', 'CompleteRegistration', {
                  content_name: 'Calculadora',
                  goal: form.goal,
                  calories: result.calories,
                });
                setSubmitted(true);
              } catch {
                setSubmitError('Ocurrió un error inesperado. Intenta de nuevo.');
              } finally {
                setSubmitting(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────── Shared ──────────────────────────────── */

function StepIndicator({ current }: { current: Step }) {
  const order: Step[] = ['intro', 'screening', 'form'];
  const activeIndex = order.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {order.map((s, i) => {
        const active = i === activeIndex;
        const done = i < activeIndex;
        return (
          <div key={s} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
              style={{
                background: active ? '#23D3FF' : done ? '#017FA7' : 'rgba(255,255,255,0.12)',
                color: active ? '#010d15' : done ? '#ffffff' : 'rgba(255,255,255,0.4)',
              }}
            >
              {i + 1}
            </div>
            {i < order.length - 1 && (
              <div
                className="w-8 h-px"
                style={{ background: done ? '#017FA7' : 'rgba(255,255,255,0.15)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const stepMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25 },
};

const cardStyle = {
  background: 'linear-gradient(180deg, rgba(1,127,167,0.15) 0%, rgba(1,13,21,0.55) 100%)',
  border: '1px solid rgba(35,211,255,0.18)',
  borderRadius: '12px',
  backdropFilter: 'blur(12px)',
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...stepMotion} style={cardStyle} className="p-5 sm:p-8 md:p-10">
      {children}
    </motion.div>
  );
}

function PrimaryButton({ children, onClick, disabled, type }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      className="px-5 sm:px-8 py-3.5 text-sm font-bold rounded-md inline-flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: '#FFC300',
        color: '#010d15',
        fontWeight: 700,
        boxShadow: '0 4px 14px rgba(255, 195, 0, 0.25)',
      }}
    >
      {children}
    </button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-medium transition-colors hover:text-white"
      style={{ color: '#ffffff' }}
    >
      ← Atrás
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-3 mt-6" style={{ color: '#23D3FF' }}>
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#ffffff' }}>
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

function PillButton({ active, onClick, children, disabled }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className="px-5 py-2.5 rounded-full text-sm font-bold transition-colors disabled:cursor-not-allowed"
      style={{
        background: active ? SELECT_GREEN : 'rgba(255,255,255,0.07)',
        color: active ? '#010d15' : 'rgba(255,255,255,0.8)',
        border: `1px solid ${active ? SELECT_GREEN : 'rgba(255,255,255,0.15)'}`,
        fontWeight: 700,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function RadioCard({ active, onClick, title, hint, accent, hintItalic, disabled }: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint?: React.ReactNode;
  accent: string;
  hintItalic?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className="text-left p-4 rounded-xl transition-all disabled:cursor-not-allowed"
      style={{
        background: active ? `${accent}18` : 'rgba(255,255,255,0.04)',
        border: `2px solid ${active ? accent : 'rgba(255,255,255,0.08)'}`,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <p className="text-sm font-bold leading-snug" style={{ color: '#ffffff', fontWeight: 700 }}>
        {title}
      </p>
      {hint && (
        <p
          className={`text-xs mt-1 leading-relaxed${hintItalic ? ' italic' : ''}`}
          style={{ color: '#ffffff' }}
        >
          {hint}
        </p>
      )}
    </button>
  );
}

/* ─────────────────────── Intensity tooltip (§2.2.1) ─────────────────── */

function IntensityInfo({ term }: { term: 'ligero' | 'moderado' | 'intenso' }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 4 }}>
      <span
        role="button"
        tabIndex={0}
        aria-label={`Definición de ${term}`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          display: 'inline-flex',
          width: 14, height: 14, borderRadius: 7,
          background: 'rgba(35,211,255,0.25)',
          color: '#23D3FF',
          fontSize: 9, fontStyle: 'normal', fontWeight: 700,
          alignItems: 'center', justifyContent: 'center',
          verticalAlign: 'middle', cursor: 'pointer',
          border: '1px solid rgba(35,211,255,0.45)',
        }}
      >
        i
      </span>
      {open && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '100%', left: 0, marginBottom: 8,
            background: '#011a2a',
            color: '#ffffff',
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 11, lineHeight: 1.45, fontStyle: 'normal',
            width: 260, zIndex: 20,
            boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
            border: '1px solid rgba(35,211,255,0.25)',
          }}
        >
          {intensityTooltips[term]}
        </span>
      )}
    </span>
  );
}

/** Generic info bubble carrying arbitrary tooltip text (e.g. the protein
 *  caveat on goal cards — spec §6). */
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 4 }}>
      <span
        role="button"
        tabIndex={0}
        aria-label="Más información"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          display: 'inline-flex',
          width: 14, height: 14, borderRadius: 7,
          background: 'rgba(35,211,255,0.25)',
          color: '#23D3FF',
          fontSize: 9, fontStyle: 'normal', fontWeight: 700,
          alignItems: 'center', justifyContent: 'center',
          verticalAlign: 'middle', cursor: 'pointer',
          border: '1px solid rgba(35,211,255,0.45)',
        }}
      >
        i
      </span>
      {open && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '100%', left: 0, marginBottom: 8,
            background: '#011a2a',
            color: '#ffffff',
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 11, lineHeight: 1.45, fontStyle: 'normal',
            width: 240, zIndex: 20,
            boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
            border: '1px solid rgba(35,211,255,0.25)',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** v12 §2.2.1 — inject an info icon after the intensity term in the activity hint. */
function activityHintWithTooltip(tier: ActivityLevel): React.ReactNode {
  const termMap: Partial<Record<ActivityLevel, 'ligero' | 'moderado' | 'intenso'>> = {
    1.375: 'ligero',
    1.55:  'moderado',
    1.725: 'intenso',
    1.9:   'intenso',
  };
  const hint = activityLabels[tier].hint;
  const term = termMap[tier];
  if (!term) return hint;
  const idx = hint.toLowerCase().indexOf(term);
  if (idx < 0) return hint;
  return (
    <>
      {hint.slice(0, idx + term.length)}
      <IntensityInfo term={term} />
      {hint.slice(idx + term.length)}
    </>
  );
}

/* ────────────────────────────── Intro ──────────────────────────────── */

function IntroStep({ onNext }: { onNext: () => void }) {
  const steps = [
    'Responde el screening médico inicial (< 1 min).',
    'Ingresa tus datos antropométricos y tu nivel de actividad física real (30 seg).',
    'Selecciona tu objetivo.',
    'Te enviamos tu reporte personalizado con tus macros y calorías objetivo.',
    'Los resultados sostenibles vienen de cambios graduales.',
  ];

  return (
    <Card>
      <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#23D3FF' }}>
        Paso 1 · Introducción
      </p>
      <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight" style={{ color: '#ffffff', fontWeight: 800 }}>
        Calculadora de calorías y macronutrientes
      </h1>
      <p className="leading-relaxed mb-8" style={{ color: '#ffffff' }}>
        Estimación basada en modelos clínicos validados para calcular tu ingesta calórica según tus objetivos.
      </p>

      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#23D3FF' }}>
        ¿Cómo funciona?
      </p>
      <ol className="flex flex-col gap-2 sm:gap-3 mb-8">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex gap-3 items-start p-3 sm:p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-sm font-bold"
              style={{
                clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                background: '#23D3FF',
                color: '#010d15',
                fontWeight: 800,
              }}
            >
              {i + 1}
            </div>
            <p className="text-sm leading-relaxed pt-1" style={{ color: '#ffffff' }}>{s}</p>
          </li>
        ))}
      </ol>

      <p className="text-sm mb-8" style={{ color: '#ffffff' }}>
        ¿Quieres entender la ciencia detrás de la pérdida de peso?{' '}
        <Link href="/#recursos" className="font-bold underline" style={{ color: '#23D3FF' }}>
          Descarga nuestra guía aquí
        </Link>
        .
      </p>

      <div className="flex justify-end">
        <PrimaryButton onClick={onNext}>
          Comenzar evaluación <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    </Card>
  );
}

/* ──────────────────────────── Screening ────────────────────────────── */

function ScreeningStep({ flags, setFlags, onBack, onNext }: {
  flags: ScreeningFlags;
  setFlags: (f: ScreeningFlags) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const level = warningLevel(flags);
  const needsDisclaimer = requiresDisclaimer(flags);
  const canContinue = !needsDisclaimer || flags.disclaimerAccepted;

  const toggle = (id: keyof ScreeningFlags) => setFlags({ ...flags, [id]: !flags[id] });

  return (
    <Card>
      <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#23D3FF' }}>
        Paso 2 · Screening médico
      </p>
      <h2 className="text-2xl md:text-3xl font-extrabold mb-3 leading-tight" style={{ color: '#ffffff', fontWeight: 800 }}>
        Antes de comenzar
      </h2>
      <p className="leading-relaxed mb-6" style={{ color: '#ffffff' }}>
        Selecciona las condiciones que apliquen; puedes dejarlo en blanco si ninguna aplica.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {SCREENING_CHECKBOXES.map((c) => (
          <div key={c.id}>
            <label
              className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all"
              style={{
                background: flags[c.id] ? 'rgba(35,211,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${flags[c.id] ? 'rgba(35,211,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(flags[c.id])}
                onChange={() => toggle(c.id)}
                className="mt-1 w-4 h-4 accent-[#23D3FF] flex-shrink-0"
              />
              <span className="text-sm leading-relaxed" style={{ color: '#ffffff' }}>
                {c.label}
              </span>
            </label>
            {c.disclaimer && flags[c.id] && (
              <div
                className="mt-1 px-4 py-3 rounded-xl text-sm leading-relaxed"
                style={{ background: 'rgba(255,195,0,0.1)', color: 'rgba(255,195,0,0.9)', borderLeft: '3px solid #FFC300' }}
              >
                {c.disclaimer}
              </div>
            )}
          </div>
        ))}
      </div>

      {level !== 'none' && <WarningBox level={level} />}

      {needsDisclaimer && (
        <label
          className="flex items-start gap-3 p-4 rounded-xl cursor-pointer mt-4"
          style={{ background: 'rgba(255,195,0,0.1)', border: '1px solid #FFC300' }}
        >
          <input
            type="checkbox"
            checked={flags.disclaimerAccepted}
            onChange={() => toggle('disclaimerAccepted')}
            className="mt-1 w-4 h-4 accent-[#FFC300] flex-shrink-0"
          />
          <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,195,0,0.9)' }}>
            {DISCLAIMER_COPY}
          </span>
        </label>
      )}

      <div className="flex items-center justify-between mt-10">
        <BackLink onClick={onBack} />
        <PrimaryButton onClick={onNext} disabled={!canContinue}>
          Continuar <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    </Card>
  );
}

function WarningBox({ level }: { level: 'yellow' | 'red' | 'pregnancy' }) {
  const palettes = {
    yellow: { bg: 'rgba(255,195,0,0.1)', bar: '#FFC300', text: 'rgba(255,195,0,0.9)' },
    red: { bg: 'rgba(239,68,68,0.1)', bar: '#EF4444', text: 'rgba(239,100,100,0.95)' },
    pregnancy: { bg: 'rgba(239,68,68,0.1)', bar: '#EF4444', text: 'rgba(239,100,100,0.95)' },
  } as const;
  const p = palettes[level];
  const message = level === 'pregnancy' ? PREGNANCY_MESSAGE : WARNING_MESSAGE;
  return (
    <div
      className="p-4 rounded-xl flex gap-3 items-start mb-4"
      style={{ background: p.bg, borderLeft: `4px solid ${p.bar}` }}
    >
      <AlertTriangle size={20} color={p.bar} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed" style={{ color: p.text }}>
        {message}
      </p>
    </div>
  );
}

/* ──────────────────────────────── Form ──────────────────────────────── */

const FORM_SUB_STEP_TITLES = ['Tus medidas', 'Tu actividad', 'Tu objetivo', 'Tu dieta', 'Tus datos'];
const FORM_SUB_STEPS = FORM_SUB_STEP_TITLES.length;

function FormStep({ form, setForm, pregnancyLactation, submitting, submitError, onBack, onSubmit }: {
  form: FormState;
  setForm: (f: FormState) => void;
  pregnancyLactation: boolean;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const [subStep, setSubStep] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  // Each form sub-step (Tus medidas → Tu actividad → Tu objetivo → Tus datos)
  // can render at a different height, so scroll to top on every transition.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [subStep]);

  // Spec §3 — pregnancy/lactation fixes biological sex to female.
  useEffect(() => {
    if (pregnancyLactation && form.sex !== 'female') {
      setForm({ ...form, sex: 'female' });
    }
  }, [pregnancyLactation, form, setForm]);

  const metric = form.units === 'metric';

  const ageNum = form.age === '' ? NaN : Number(form.age);
  const ageValid = Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 80;
  const ageTouched = form.age !== '';

  const weightNum = Number(form.weight);
  const [weightMin, weightMax] = metric ? [30, 300] : [66, 661];
  const weightValid = form.weight !== '' && weightNum >= weightMin && weightNum <= weightMax;
  const weightTouched = touched.weight || false;

  const heightNum = Number(form.height);
  const [heightMin, heightMax] = metric ? [120, 230] : [47, 91];
  const heightValid = form.height !== '' && heightNum >= heightMin && heightNum <= heightMax;
  const heightTouched = touched.height || false;

  const emailValid = EMAIL_REGEX.test(form.email);
  const nameValid = form.name.trim().length > 0;

  // Goal-screen live feasibility (spec v13): once measures are entered we run the
  // real calculator for each goal/protein/macro combo and disable any option that
  // would break a normality rule (below BMR, below the sex safety floor, negative
  // carbs, carbs too low/too high). Only feasible options stay clickable.
  const measuresReady = ageValid && weightValid && heightValid && form.activity !== null;

  const weightKgForGoal = measuresReady ? (metric ? weightNum : lbToKg(weightNum)) : 0;

  // Full profile for the dynamic weight projection (spec §3b) — recomputed on
  // every render, so it tracks any change to sex/age/weight/height/activity.
  const goalProfile = measuresReady
    ? {
        sex:    form.sex,
        age:    ageNum,
        weight: weightKgForGoal,
        height: metric ? heightNum : inToCm(heightNum),
        activity: form.activity as ActivityLevel,
      }
    : null;

  // The outcome of a concrete goal + protein + macro combo. v14: hard blocks
  // disable the option; soft notices (supervision_medica, carbo_*) never
  // disable anything — they only surface in the report.
  const comboOutcome = (g: Goal, lvl: ProteinLevel, split: MacroSplit): { block: CalcBlock | null; warnings: CalcWarning[] } => {
    if (!goalProfile) return { block: null, warnings: [] };
    const res = calculateCalories({
      ...goalProfile,
      goal: g,
      proteinLevel: lvl,
      macroSplit: split,
      pregnancyLactation,
    });
    return 'blocked' in res ? { block: res.warning, warnings: [] } : { block: null, warnings: res.warnings };
  };

  // Macro/protein options no longer gate on soft notices (v14): a combo is
  // feasible unless it is hard-blocked (which only happens at goal level).
  const macroSplitFeasible = (g: Goal, lvl: ProteinLevel, split: MacroSplit) =>
    comboOutcome(g, lvl, split).block === null;

  const proteinLevelFeasible = (g: Goal, lvl: ProteinLevel) =>
    MACRO_SPLITS.some((s) => macroSplitFeasible(g, lvl, s));

  const firstFeasibleSplit = (g: Goal, lvl: ProteinLevel): MacroSplit =>
    (['balanced', 'low_fat', 'low_carb'] as MacroSplit[]).find((s) =>
      macroSplitFeasible(g, lvl, s),
    ) ?? 'balanced';

  // The block reason for a goal (null = available). `maintain` is always offered.
  const goalBlock = (g: Goal): CalcBlock | null => {
    if (g === 'maintain') return null;
    if (pregnancyLactation && LOSS_GOALS.includes(g)) return 'bloqueo_embarazo';
    if (!goalProfile) return null;
    return comboOutcome(g, defaultProteinLevel(g, bmi(goalProfile.weight, goalProfile.height)), 'balanced').block;
  };

  // v13 — the aggressive loss rate is disabled when it collapses to the same
  // served calories (and thus the same 3-month loss) as the conservative rate.
  const goalRedundant = (g: Goal): boolean =>
    goalProfile ? lossGoalRedundant(goalProfile, g) : false;

  const goalAvailable = (g: Goal): boolean =>
    goalBlock(g) === null && !goalRedundant(g);

  const goalIsValid =
    form.goal !== null &&
    goalAvailable(form.goal) &&
    macroSplitFeasible(form.goal, form.proteinLevel, form.macroSplit);

  // Auto-correct the macro selection when the measures change so the user is never
  // left on a now-infeasible protein/macro combo. We only move to a feasible option;
  // if a feasible alternative exists we switch to it (never the other way around),
  // so this converges and can't loop.
  useEffect(() => {
    if (!goalProfile || form.goal === null || !goalAvailable(form.goal)) return;
    const g = form.goal;
    let lvl = form.proteinLevel;
    let split = form.macroSplit;
    if (!proteinLevelFeasible(g, lvl)) {
      const fallbackLvl = (['high', 'standard'] as ProteinLevel[]).find((p) =>
        proteinLevelFeasible(g, p),
      );
      if (fallbackLvl) lvl = fallbackLvl;
    }
    if (!macroSplitFeasible(g, lvl, split)) split = firstFeasibleSplit(g, lvl);
    if (lvl !== form.proteinLevel || split !== form.macroSplit) {
      setForm({ ...form, proteinLevel: lvl, macroSplit: split });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalProfile?.sex, goalProfile?.age, goalProfile?.weight, goalProfile?.height, goalProfile?.activity, form.goal, form.proteinLevel, form.macroSplit, pregnancyLactation]);

  // Spec v13 §8 — "¿Cuál es tu mayor obstáculo?" is obligatory to advance.
  const obstacleValid =
    form.obstacle !== '' && (form.obstacle !== 'other' || form.obstacleOther.trim().length > 0);

  const subStepValid = [
    ageValid && weightValid && heightValid,
    form.activity !== null,
    goalIsValid,
    goalIsValid,
    obstacleValid && nameValid && emailValid,
  ];

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm({ ...form, [key]: value });

  function handleNext() {
    if (subStep < FORM_SUB_STEPS - 1) setSubStep(subStep + 1);
    else onSubmit();
  }

  function handleBack() {
    if (subStep > 0) setSubStep(subStep - 1);
    else onBack();
  }

  return (
    <Card>
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-5">
        {Array.from({ length: FORM_SUB_STEPS }).map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full" style={{
            background: i <= subStep ? '#23D3FF' : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <h2 className="text-2xl md:text-3xl font-extrabold mb-6 leading-tight" style={{ color: '#ffffff', fontWeight: 800 }}>
        {FORM_SUB_STEP_TITLES[subStep]}
      </h2>

      {subStep === 0 && (
        <>
          <SectionLabel>Sistema de unidades</SectionLabel>
          <div className="flex gap-2 mb-8">
            {(['metric', 'imperial'] as const).map((u) => (
              <PillButton key={u} active={form.units === u} onClick={() => setForm({ ...form, units: u, weight: '', height: '' })}>
                {u === 'metric' ? 'Métrico (kg/cm)' : 'Imperial (lb/in)'}
              </PillButton>
            ))}
          </div>

          <SectionLabel>Datos personales</SectionLabel>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Field label="Edad">
              <input
                type="number" min={18} max={80} step={1}
                value={form.age} onChange={(e) => update('age', e.target.value)}
                className="calc-input" placeholder="30"
              />
              {ageTouched && !ageValid && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Ingresa una edad entre 18 y 80 años.</p>
              )}
            </Field>

            <Field label="Sexo">
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((s) => {
                  const disabled = pregnancyLactation && s === 'male';
                  return (
                    <PillButton
                      key={s}
                      active={form.sex === s}
                      disabled={disabled}
                      onClick={() => !disabled && update('sex', s)}
                    >
                      {s === 'male' ? 'Masculino' : 'Femenino'}
                    </PillButton>
                  );
                })}
              </div>
            </Field>

            <Field label={`Peso (${metric ? 'kg' : 'lb'})`}>
              <input
                type="number" min={weightMin} max={weightMax}
                value={form.weight}
                onChange={(e) => update('weight', e.target.value)}
                onBlur={() => touch('weight')}
                className="calc-input" placeholder={metric ? '70' : '155'}
              />
              {weightTouched && !weightValid && form.weight !== '' && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                  Ingresa un peso entre {weightMin} y {weightMax} {metric ? 'kg' : 'lb'}.
                </p>
              )}
              {weightTouched && form.weight === '' && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Este campo es obligatorio.</p>
              )}
            </Field>

            <Field label={`Talla (${metric ? 'cm' : 'in'})`}>
              <input
                type="number" min={heightMin} max={heightMax}
                value={form.height}
                onChange={(e) => update('height', e.target.value)}
                onBlur={() => touch('height')}
                className="calc-input" placeholder={metric ? '175' : '69'}
              />
              {heightTouched && !heightValid && form.height !== '' && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                  Ingresa una talla entre {heightMin} y {heightMax} {metric ? 'cm' : 'in'}.
                </p>
              )}
              {heightTouched && form.height === '' && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Este campo es obligatorio.</p>
              )}
            </Field>
          </div>
        </>
      )}

      {subStep === 1 && (
        <>
          <SectionLabel>Nivel de actividad</SectionLabel>
          <p className="text-sm italic mb-4 leading-relaxed" style={{ color: '#ffffff' }}>
            Selecciona el nivel que mejor represente tu actividad física habitual.
          </p>
          <div className="flex flex-col gap-2 mb-3">
            {ACTIVITY_LEVELS.map((tier) => (
              <RadioCard
                key={tier} accent={SELECT_GREEN}
                active={form.activity === tier} onClick={() => update('activity', tier)}
                title={activityLabels[tier].title}
                hint={activityHintWithTooltip(tier)}
                hintItalic
              />
            ))}
          </div>
          <p className="text-xs italic mb-8 leading-relaxed" style={{ color: '#ffffff' }}>
            Si dudas entre dos niveles, elige el más bajo.
          </p>
        </>
      )}

      {subStep === 2 && (
        <>
          <SectionLabel>Objetivo</SectionLabel>
          {pregnancyLactation && (
            <p className="text-xs mb-3 leading-relaxed" style={{ color: '#FFC300' }}>
              Marcaste embarazo o lactancia: los objetivos de pérdida no están disponibles por seguridad. Elige mantenimiento o ganancia.
            </p>
          )}
          <div className="flex flex-col gap-2 mt-3">
            {GOAL_ORDER.map((g) => {
              const block = goalBlock(g);
              const redundant = goalRedundant(g);
              const available = block === null && !redundant;
              const isLoss = LOSS_GOALS.includes(g);
              const disabledHint = block
                ? BLOCK_GOAL_HINT[block]
                : redundant
                  ? LOSS_REDUNDANT_HINT
                  : undefined;
              const range = goalProfile && g !== 'maintain' ? projectedKgRange(goalProfile, g) : null;
              const liveHint: React.ReactNode = !goalProfile
                ? ''
                : g === 'maintain'
                  ? MAINTAIN_HINT
                  : range && (
                      <>
                        {isLoss ? 'Pierde' : 'Gana'} aproximadamente{' '}
                        <span className="font-extrabold text-sm" style={{ color: '#FFC300' }}>
                          {range.text}
                        </span>{' '}
                        en 3 meses
                      </>
                    );
              const note = goalProteinNote(g);
              const hint = !available
                ? disabledHint
                : (
                    <>
                      {liveHint}
                      {note && <InfoTooltip text={note} />}
                    </>
                  );
              return (
                <RadioCard
                  key={g} accent={SELECT_GREEN}
                  active={form.goal === g}
                  disabled={!available}
                  onClick={() =>
                    available &&
                    setForm({
                      ...form,
                      goal: g,
                      // Default: loss+IMC<30 → Alto, loss+IMC≥30 → Estándar, resto → Estándar.
                      proteinLevel: defaultProteinLevel(g, goalProfile ? bmi(goalProfile.weight, goalProfile.height) : 0),
                      macroSplit: 'balanced',
                    })
                  }
                  title={goalLabels[g].title}
                  hint={hint}
                />
              );
            })}
          </div>

          <p className="text-xs italic leading-relaxed mt-3" style={{ color: '#ffffff' }}>
            {PROJECTION_NOTE}
          </p>

          {pregnancyLactation && (
            <p className="text-xs leading-relaxed mt-3" style={{ color: '#FFC300' }}>
              {PREGNANCY_EXTRA_KCAL_NOTE}
            </p>
          )}

          {form.goal !== null && LOSS_GOALS.includes(form.goal) ? (
            <>
              <div
                className="p-4 rounded-xl flex gap-3 items-start mt-3"
                style={{ background: 'rgba(156,226,182,0.1)', borderLeft: `4px solid ${SELECT_GREEN}` }}
              >
                <AlertTriangle size={20} color={SELECT_GREEN} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed" style={{ color: SELECT_GREEN }}>
                  {CLINICAL_NOTE_PCT_RANGE}
                </p>
              </div>
              {/* v15 — orange trajectory aviso: normal-weight now, but this rate
                  would dip below BMI 18.5 within 3 months. Not a block; the
                  IMC<18.5 hard gate re-checks on every input change. */}
              {goalProfile && projectsToUnderweight(goalProfile, form.goal) ? (
                <div
                  className="p-4 rounded-xl flex gap-3 items-start mb-8 mt-3"
                  style={{ background: 'rgba(249,115,22,0.1)', borderLeft: '4px solid #F97316' }}
                >
                  <AlertTriangle size={20} color="#F97316" className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed" style={{ color: '#F97316' }}>
                    {UNDERWEIGHT_PROJECTION_NOTE}
                  </p>
                </div>
              ) : (
                <div className="mb-8" />
              )}
            </>
          ) : form.goal !== null && GAIN_GOALS.includes(form.goal) ? (
            <div
              className="p-4 rounded-xl flex gap-3 items-start mb-8 mt-3"
              style={{ background: 'rgba(156,226,182,0.1)', borderLeft: `4px solid ${SELECT_GREEN}` }}
            >
              <AlertTriangle size={20} color={SELECT_GREEN} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed" style={{ color: SELECT_GREEN }}>
                {CLINICAL_NOTE_GAIN}
              </p>
            </div>
          ) : (
            <div className="mb-8" />
          )}
        </>
      )}

      {subStep === 3 && (
        <>
          <SectionLabel>
            Proteína
            {form.goal !== null && LOSS_GOALS.includes(form.goal) &&
              goalProfile && bmi(goalProfile.weight, goalProfile.height) < OBESITY_BMI && (
              <span className="normal-case">
                <InfoTooltip text={PROTEIN_DEFICIT_NOTE} />
              </span>
            )}
          </SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3">
            {PROTEIN_LEVELS.map((p) => {
              const pFeasible = form.goal === null || proteinLevelFeasible(form.goal, p);
              return (
                <PillButton
                  key={p}
                  active={form.proteinLevel === p}
                  disabled={!pFeasible}
                  onClick={() => {
                    if (form.goal !== null) {
                      setForm({ ...form, proteinLevel: p, macroSplit: firstFeasibleSplit(form.goal, p) });
                    } else {
                      update('proteinLevel', p);
                    }
                  }}
                >
                  {proteinLevelLabels[p].title}
                </PillButton>
              );
            })}
          </div>
          {form.goal !== null && !proteinLevelFeasible(form.goal, 'high') && (
            <p className="text-xs leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              El nivel Alto no es compatible con tus calorías para este objetivo; usa Estándar.
            </p>
          )}
          <p className="text-xs leading-relaxed mt-2 mb-3" style={{ color: '#ffffff' }}>
            {PROTEIN_LEVEL_HINT}
          </p>
          <div
            className="p-4 rounded-xl flex gap-3 items-start mb-8"
            style={{ background: 'rgba(156,226,182,0.1)', borderLeft: `4px solid ${SELECT_GREEN}` }}
          >
            <AlertTriangle size={20} color={SELECT_GREEN} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed" style={{ color: SELECT_GREEN }}>
              {PROTEIN_RENAL_NOTE}
            </p>
          </div>

          <SectionLabel>Grasas y carbohidratos</SectionLabel>
          <div className="flex flex-col gap-2 mb-8 mt-3">
            {MACRO_SPLITS.map((m) => (
              // v14: macro splits never disable — any carb imbalance surfaces as a
              // soft notice in the report, not as a blocked option.
              <RadioCard
                key={m} accent={SELECT_GREEN}
                active={form.macroSplit === m}
                onClick={() => update('macroSplit', m)}
                title={macroSplitLabels[m].title}
                hint={macroSplitLabels[m].hint}
              />
            ))}
          </div>

        </>
      )}

      {subStep === 4 && (
        <>
          <SectionLabel>¿Cuál es tu mayor obstáculo?</SectionLabel>
          <div className="flex flex-col gap-2 mt-3">
            {OBSTACLES.map((o) => (
              <RadioCard
                key={o.id} accent={SELECT_GREEN}
                active={form.obstacle === o.id} onClick={() => update('obstacle', o.id)}
                title={o.label}
              />
            ))}
          </div>
          {form.obstacle === 'other' && (
            <input
              type="text"
              value={form.obstacleOther}
              onChange={(e) => update('obstacleOther', e.target.value)}
              className="calc-input mt-3"
              placeholder="Cuéntanos cuál es tu mayor obstáculo"
            />
          )}

          <SectionLabel>Datos de contacto</SectionLabel>
          <div className="flex flex-col gap-4 mb-8 mt-3">
            <Field label="Nombre">
              <input
                type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                className="calc-input" placeholder="Tu nombre"
              />
            </Field>
            <Field label="Correo electrónico">
              <input
                type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                className="calc-input" placeholder="tu@correo.com"
              />
            </Field>
            <Field label="WhatsApp (opcional)">
              <input
                type="tel" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)}
                className="calc-input" placeholder="+1 555 123 4567"
              />
            </Field>
          </div>

          {submitError && (
            <div className="p-4 rounded-xl mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {submitError}
            </div>
          )}

          <div
            className="p-4 rounded-xl mb-6"
            style={{ background: 'rgba(156,226,182,0.1)', borderLeft: `4px solid ${SELECT_GREEN}` }}
          >
            <p className="text-xs italic leading-relaxed" style={{ color: SELECT_GREEN }}>
              Estimaciones derivadas de ecuaciones predictivas y modelos poblacionales. No constituyen diagnóstico ni reemplazan la valoración clínica individual.
            </p>
          </div>
        </>
      )}

      <div className="flex items-center justify-between mt-6">
        <BackLink onClick={handleBack} />
        <PrimaryButton
          onClick={handleNext}
          disabled={!subStepValid[subStep] || (subStep === FORM_SUB_STEPS - 1 && submitting)}
        >
          {subStep === FORM_SUB_STEPS - 1
            ? (submitting ? 'Enviando…' : 'Recibir mi reporte')
            : 'Continuar'}
          <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    </Card>
  );
}

/* ─────────────────────────── Confirmation ───────────────────────────── */

function ConfirmationStep({ report }: {
  report: { name: string; inputs: Record<string, unknown>; result: CalcResult };
}) {
  const [dlState, setDlState] = useState<'loading' | 'done' | 'error'>('loading');
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/calculator-report-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    })
      .then(async (res) => {
        if (!res.ok) { setDlState('error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte-entrenaconciencia.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDlState('done');
      })
      .catch(() => setDlState('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerDownload() {
    if (blobUrlRef.current) {
      const a = document.createElement('a');
      a.href = blobUrlRef.current;
      a.download = 'reporte-entrenaconciencia.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Re-fetch if blob is gone
      setDlState('loading');
      fetch('/api/calculator-report-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
        .then(async (res) => {
          if (!res.ok) { setDlState('error'); return; }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          const a = document.createElement('a');
          a.href = url;
          a.download = 'reporte-entrenaconciencia.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setDlState('done');
        })
        .catch(() => setDlState('error'));
    }
  }

  return (
    <motion.div {...stepMotion} style={cardStyle} className="p-10 md:p-14 text-center">
      <div
        className="w-20 h-20 mx-auto mb-6 flex items-center justify-center"
        style={{
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          background: 'rgba(156,226,182,0.15)',
          border: '1px solid rgba(156,226,182,0.3)',
        }}
      >
        <CheckCircle2 size={40} color="#9CE2B6" strokeWidth={2} />
      </div>
      <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: '#ffffff', fontWeight: 800 }}>
        Gracias.
      </h2>
      <p className="leading-relaxed max-w-md mx-auto mb-8" style={{ color: '#ffffff' }}>
        {dlState === 'loading' && 'Preparando tu reporte…'}
        {dlState === 'done'    && 'Tu reporte se está descargando.'}
        {dlState === 'error'   && 'Hubo un problema generando tu reporte.'}
      </p>
      {(dlState === 'done' || dlState === 'error') && (
        <button
          onClick={triggerDownload}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold transition mb-4"
          style={{ background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)', color: '#010d15', fontWeight: 700 }}
        >
          {dlState === 'error' ? 'Reintentar descarga' : 'Descargar de nuevo'}
        </button>
      )}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold transition"
          style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}
        >
          Volver al inicio
        </Link>
      </div>
    </motion.div>
  );
}
