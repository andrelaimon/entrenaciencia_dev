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
  goalHint,
  CLINICAL_NOTE_PCT_RANGE,
  macroSplitLabels,
  lbToKg,
  inToCm,
  calculateCalories,
  computeBmrTdee,
  isGoalAvailable,
  type ActivityLevel,
  type Goal,
  type Sex,
  type MacroSplit,
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
  obstacle: Obstacle | '';
  name: string;
  email: string;
  whatsapp: string;
  obstacleOther: string;
};

const GOAL_ORDER: Goal[] = ['leve_loss', 'loss', 'maintain', 'leve_gain', 'gain'];
const MACRO_SPLITS: MacroSplit[] = ['balanced', 'low_fat', 'low_carb'];

const SCREENING_CHECKBOXES: { id: keyof ScreeningFlags; label: string; disclaimer?: string }[] = [
  {
    id: 'medical',
    label: 'Antecedentes de condiciones médicas (tiroides, diabetes, hígado, riñón, etc.) o uso de medicamentos en los últimos 3 meses',
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
  'Entiendo que esta herramienta no reemplaza una consulta médica o nutricional individualizada. Los resultados son orientativos. Deseo continuar.';

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

function requiresDisclaimer(flags: ScreeningFlags): boolean {
  const level = warningLevel(flags);
  return level === 'red' || level === 'pregnancy';
}

export default function CalculatorWizard() {
  const [step, setStep] = useState<Step>('intro');
  const [flags, setFlags] = useState<ScreeningFlags>(initialFlags);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
        {submitted ? (
          <ConfirmationStep key="done" />
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
                  pregnancyLactation: flags.pregnancyLactation,
                };

                const calc = calculateCalories(calcInput);
                if ('blocked' in calc) {
                  setSubmitError('Por seguridad, este objetivo no está disponible durante embarazo o lactancia. Elige mantenimiento o ganancia, o consulta con tu médico.');
                  setSubmitting(false);
                  return;
                }
                const result = calc;

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

                // Client-testing aid: trigger a PDF download with the user's
                // computed report so the team can verify numbers without
                // waiting on the email pipeline.
                fetch('/api/calculator-report-pdf', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name:   form.name.trim(),
                    inputs: { ...calcInput, units: form.units },
                    result,
                  }),
                })
                  .then(async (res) => {
                    if (!res.ok) return;
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'reporte-entrenaconciencia.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  })
                  .catch(() => {});

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

function PillButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-5 py-2.5 rounded-full text-sm font-bold transition-colors"
      style={{
        background: active ? '#23D3FF' : 'rgba(255,255,255,0.07)',
        color: active ? '#010d15' : 'rgba(255,255,255,0.8)',
        border: `1px solid ${active ? '#23D3FF' : 'rgba(255,255,255,0.15)'}`,
        fontWeight: 700,
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
    'Te enviamos tu reporte personalizado con tus macros, ejemplos de alimentos y un plan de acción inicial.',
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
        ¿Quieres entender la ciencia detrás?{' '}
        <Link href="/#recursos" className="font-bold underline" style={{ color: '#23D3FF' }}>
          Descarga la guía de pérdida de peso
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
        Antecedentes de condiciones médicas que puedan influir en tu peso o metabolismo. Selecciona las que apliquen; puedes dejarlo en blanco si ninguna aplica.
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
          style={{ background: 'rgba(255,195,0,0.08)', border: '1px solid rgba(255,195,0,0.35)' }}
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
    pregnancy: { bg: 'rgba(249,115,22,0.1)', bar: '#F97316', text: 'rgba(249,150,80,0.95)' },
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

const FORM_SUB_STEP_TITLES = ['Tus medidas', 'Tu actividad', 'Tu objetivo', 'Tus datos'];
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

  const metric = form.units === 'metric';

  const ageNum = form.age === '' ? NaN : Number(form.age);
  const ageValid = !Number.isNaN(ageNum) && ageNum >= 5 && ageNum <= 120;
  const ageTouched = form.age !== '';

  const weightNum = Number(form.weight);
  const [weightMin, weightMax] = metric ? [20, 400] : [44, 880];
  const weightValid = form.weight !== '' && weightNum >= weightMin && weightNum <= weightMax;
  const weightTouched = touched.weight || false;

  const heightNum = Number(form.height);
  const [heightMin, heightMax] = metric ? [100, 250] : [39, 98];
  const heightValid = form.height !== '' && heightNum >= heightMin && heightNum <= heightMax;
  const heightTouched = touched.height || false;

  const emailValid = EMAIL_REGEX.test(form.email);
  const nameValid = form.name.trim().length > 0;

  // Goal-screen feasibility: pre-compute BMR/TDEE so we can disable loss goals
  // that would fall below the BMR floor, or all loss goals during pregnancy/lactation.
  const measuresReady = ageValid && weightValid && heightValid && form.activity !== null;
  const bmrTdee = measuresReady
    ? computeBmrTdee({
        sex:    form.sex,
        age:    ageNum,
        weight: metric ? weightNum : lbToKg(weightNum),
        height: metric ? heightNum : inToCm(heightNum),
        activity: form.activity as ActivityLevel,
      })
    : null;

  const weightKgForGoal = measuresReady ? (metric ? weightNum : lbToKg(weightNum)) : 0;

  const goalAvailable = (g: Goal): boolean =>
    bmrTdee ? isGoalAvailable(g, bmrTdee.bmr, bmrTdee.tdee, weightKgForGoal) : true;

  const goalIsValid = form.goal !== null && goalAvailable(form.goal);

  const subStepValid = [
    ageValid && weightValid && heightValid,
    form.activity !== null,
    goalIsValid,
    nameValid && emailValid,
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
          <div className="flex gap-2 mb-1">
            {(['metric', 'imperial'] as const).map((u) => (
              <PillButton key={u} active={form.units === u} onClick={() => setForm({ ...form, units: u, weight: '', height: '' })}>
                {u === 'metric' ? 'Métrico (kg/cm)' : 'Imperial (lb/in)'}
              </PillButton>
            ))}
          </div>
          <p className="text-xs mb-8" style={{ color: '#ffffff' }}>
            Cambiar unidades reinicia peso y talla.
          </p>

          <SectionLabel>Datos personales</SectionLabel>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Field label="Edad">
              <input
                type="number" min={5} max={120}
                value={form.age} onChange={(e) => update('age', e.target.value)}
                className="calc-input" placeholder="30"
              />
              {ageTouched && !ageValid && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Ingresa una edad válida.</p>
              )}
            </Field>

            <Field label="Sexo biológico">
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((s) => (
                  <PillButton key={s} active={form.sex === s} onClick={() => update('sex', s)}>
                    {s === 'male' ? 'Masculino' : 'Femenino'}
                  </PillButton>
                ))}
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
                key={tier} accent="#23D3FF"
                active={form.activity === tier} onClick={() => update('activity', tier)}
                title={activityLabels[tier].title}
                hint={activityHintWithTooltip(tier)}
                hintItalic
              />
            ))}
          </div>
          <p className="text-xs italic mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Si dudas entre dos niveles, elige el más bajo.
          </p>
        </>
      )}

      {subStep === 2 && (
        <>
          <SectionLabel>Objetivo</SectionLabel>
          {pregnancyLactation && (
            <p className="text-xs mb-3 leading-relaxed" style={{ color: '#FFC300' }}>
              Marcaste embarazo o lactancia: si eliges un objetivo de pérdida, no podremos entregarte un resultado por seguridad. Te recomendamos elegir mantenimiento o ganancia.
            </p>
          )}
          <div className="flex flex-col gap-2 mt-3">
            {GOAL_ORDER.map((g) => {
              const available = goalAvailable(g);
              const disabledHint = !available
                ? 'No disponible con tus medidas: caería por debajo de tu metabolismo basal.'
                : undefined;
              const liveHint = weightKgForGoal > 0 ? goalHint(g, weightKgForGoal) : '';
              return (
                <RadioCard
                  key={g} accent="#FFC300"
                  active={form.goal === g}
                  disabled={!available}
                  onClick={() => available && update('goal', g)}
                  title={goalLabels[g].title}
                  hint={disabledHint ?? liveHint}
                />
              );
            })}
          </div>
          <p className="text-xs italic leading-relaxed mb-8 mt-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {CLINICAL_NOTE_PCT_RANGE}
          </p>

          <SectionLabel>Reparto de macronutrientes</SectionLabel>
          <div className="flex flex-col gap-2 mb-8 mt-3">
            {MACRO_SPLITS.map((m) => (
              <RadioCard
                key={m} accent="#9CE2B6"
                active={form.macroSplit === m}
                onClick={() => update('macroSplit', m)}
                title={macroSplitLabels[m].title}
                hint={macroSplitLabels[m].hint}
              />
            ))}
          </div>

          <SectionLabel>¿Cuál es tu mayor obstáculo? (opcional)</SectionLabel>
          <div className="flex flex-col gap-2 mt-3">
            {OBSTACLES.map((o) => (
              <RadioCard
                key={o.id} accent="#9CE2B6"
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
        </>
      )}

      {subStep === 3 && (
        <>
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

          <p className="text-xs leading-relaxed mb-6" style={{ color: '#ffffff' }}>
            Estimaciones derivadas de ecuaciones predictivas y modelos poblacionales. No constituyen diagnóstico ni reemplazan la valoración clínica individual.
          </p>
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

function ConfirmationStep() {
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
        Te enviaremos tu reporte personalizado por correo en los próximos minutos.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold transition"
        style={{ background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)', color: '#010d15', fontWeight: 700 }}
      >
        Volver al inicio
      </Link>
    </motion.div>
  );
}
