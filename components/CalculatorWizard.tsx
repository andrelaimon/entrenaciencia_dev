'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import {
  activityLabels,
  goalLabels,
  macroPresets,
  lbToKg,
  inToCm,
  calculateCaloriesKatch,
  calculateCaloriesWithPreset,
  type ActivityLevel,
  type Goal,
  type MacroPreset,
  type Sex,
  type CalcInput,
  type CalcResult,
} from '@/lib/calorieCalculator';

type Step = 'intro' | 'screening' | 'form';

type ScreeningFlags = {
  medical: boolean;
  medications: boolean;
  weightChange: boolean;
  eatingControl: boolean;
  pregnancyLactation: boolean;
  disclaimerAccepted: boolean;
  restrictiveDiet: 'yes' | 'no' | null;
};

type Obstacle = 'no_time' | 'consistency' | 'what_to_eat' | 'health' | 'other';

type FormState = {
  units: 'metric' | 'imperial';
  age: string;
  sex: Sex;
  weight: string;
  height: string;
  activity: ActivityLevel | null;
  bodyFat: string;
  goal: Goal | null;
  macroPreset: MacroPreset;
  obstacle: Obstacle | '';
  name: string;
  email: string;
};

const ACTIVITY_TIERS: ActivityLevel[] = [1.375, 1.55, 1.725, 1.9, 2.0];
const GOAL_ORDER: Goal[] = ['leve_loss', 'loss', 'maintain', 'leve_gain', 'gain'];

const SCREENING_CHECKBOXES: { id: keyof ScreeningFlags; label: string }[] = [
  {
    id: 'medical',
    label:
      'Condición médica que pueda influir en el peso o metabolismo (ej. diabetes, tiroides, hígado, riñón)',
  },
  {
    id: 'medications',
    label:
      'Uso de medicamentos en los últimos 3 meses (ej. corticoides, insulina, algunos psicofármacos)',
  },
  {
    id: 'weightChange',
    label: 'Cambio de peso no intencional ≥5% en los últimos 3 meses',
  },
  {
    id: 'eatingControl',
    label:
      'Dificultad para mantener una alimentación regular o sensación de poco control al comer',
  },
  {
    id: 'pregnancyLactation',
    label: 'Embarazo o lactancia',
  },
];

const OBSTACLES: { id: Obstacle; label: string }[] = [
  { id: 'no_time', label: 'No tengo tiempo para cocinar o planificar' },
  { id: 'consistency', label: 'Me cuesta mantener la constancia' },
  { id: 'what_to_eat', label: 'No sé qué debo comer exactamente' },
  { id: 'health', label: 'Tengo una lesión o condición de salud' },
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
    medications: false,
    weightChange: false,
    eatingControl: false,
    pregnancyLactation: false,
    disclaimerAccepted: false,
    restrictiveDiet: null,
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
    bodyFat: '',
    goal: null,
    macroPreset: 'balanced',
    obstacle: '',
    name: '',
    email: '',
  };
}

function warningLevel(flags: ScreeningFlags): 'none' | 'yellow' | 'red' | 'pregnancy' {
  if (flags.pregnancyLactation) return 'pregnancy';
  const count =
    (flags.medical ? 1 : 0) +
    (flags.medications ? 1 : 0) +
    (flags.weightChange ? 1 : 0) +
    (flags.eatingControl ? 1 : 0);
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

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <StepIndicator current={step} />

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
            submitting={submitting}
            submitError={submitError}
            onBack={() => setStep('screening')}
            onSubmit={async () => {
              setSubmitError(null);
              setSubmitting(true);
              try {
                const weightKg =
                  form.units === 'imperial'
                    ? lbToKg(Number(form.weight))
                    : Number(form.weight);
                const heightCm =
                  form.units === 'imperial'
                    ? inToCm(Number(form.height))
                    : Number(form.height);

                const calcInput: CalcInput = {
                  sex: form.sex,
                  age: Number(form.age),
                  weight: weightKg,
                  height: heightCm,
                  activity: form.activity as ActivityLevel,
                  goal: form.goal as Goal,
                };

                let result: CalcResult;
                const bf = form.bodyFat === '' ? 0 : Number(form.bodyFat);
                if (bf > 0) {
                  const lbm = weightKg * (1 - bf / 100);
                  result = calculateCaloriesKatch(
                    lbm,
                    calcInput.activity,
                    calcInput.goal,
                    form.macroPreset,
                  );
                } else {
                  result = calculateCaloriesWithPreset(calcInput, form.macroPreset);
                }

                const payload = {
                  inputs: {
                    ...calcInput,
                    bodyFat: bf > 0 ? bf : null,
                    units: form.units,
                    macroPreset: form.macroPreset,
                  },
                  result,
                  obstacle: form.obstacle,
                  name: form.name.trim(),
                  email: form.email.trim(),
                  flags,
                  klaviyoProps: {
                    obstacle: form.obstacle,
                    restrictive_diet: flags.restrictiveDiet === 'yes',
                  },
                };

                const res = await fetch('/api/calculator-submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });

                if (!res.ok) {
                  throw new Error('submit_failed');
                }

                setSubmitted(true);
              } catch {
                setSubmitError(
                  'No pudimos enviar tus datos. Intenta de nuevo en unos segundos.',
                );
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

/* --------------------------------- Shared --------------------------------- */

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
                background: active ? '#23D3FF' : done ? '#224277' : '#D6E4EE',
                color: active || done ? '#ffffff' : '#6B7280',
              }}
            >
              {i + 1}
            </div>
            {i < order.length - 1 && (
              <div
                className="w-8 h-px"
                style={{ background: done ? '#224277' : '#D6E4EE' }}
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      {...stepMotion}
      className="bg-white rounded-2xl shadow-lg p-8 md:p-10"
    >
      {children}
    </motion.div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  type,
}: {
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
      className="px-8 py-3.5 text-sm font-bold rounded-full inline-flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: disabled
          ? '#D6E4EE'
          : 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
        color: disabled ? '#6B7280' : '#1A1A2E',
        fontWeight: 700,
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
      className="text-sm font-medium transition-colors"
      style={{ color: '#6B7280' }}
    >
      ← Atrás
    </button>
  );
}

/* ---------------------------------- Intro --------------------------------- */

function IntroStep({ onNext }: { onNext: () => void }) {
  const steps = [
    'Responde el screening inicial — toma menos de un minuto e identifica si tu caso requiere atención médica directa.',
    'Ingresa tus datos antropométricos y nivel de actividad física real, no el que quisieras tener.',
    'Selecciona tu objetivo. Los resultados sostenibles vienen de cambios graduales.',
    'Te enviamos tu reporte personalizado con tus macros, ejemplos de alimentos y un plan de acción inicial.',
  ];

  return (
    <Card>
      <p
        className="text-xs font-medium tracking-widest uppercase mb-3"
        style={{ color: '#59A0CF' }}
      >
        Paso 1 · Introducción
      </p>
      <h1
        className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight"
        style={{ color: '#1A1A2E', fontWeight: 800 }}
      >
        Calculadora de requerimientos energéticos y macronutrientes
      </h1>
      <p className="text-gray-600 leading-relaxed mb-8">
        Estimación basada en modelos validados para orientar tu ingesta diaria según tus
        objetivos. Esta herramienta utiliza ecuaciones y modelos clínicos de gasto energético
        total.
      </p>

      <div className="mb-8">
        <p
          className="text-sm font-bold uppercase tracking-wider mb-4"
          style={{ color: '#224277' }}
        >
          ¿Cómo funciona?
        </p>
        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-3 items-start p-4 rounded-xl"
              style={{ background: '#F3F8FC' }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-sm font-bold"
                style={{
                  clipPath:
                    'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  background: '#23D3FF',
                  color: '#1A1A2E',
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed pt-1">{s}</p>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-sm text-gray-500 mb-8">
        ¿Quieres entender la ciencia detrás?{' '}
        <Link
          href="/#recursos"
          className="font-bold underline"
          style={{ color: '#224277' }}
        >
          Descarga la guía de pérdida de peso en recursos
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

/* -------------------------------- Screening ------------------------------- */

function ScreeningStep({
  flags,
  setFlags,
  onBack,
  onNext,
}: {
  flags: ScreeningFlags;
  setFlags: (f: ScreeningFlags) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const level = warningLevel(flags);
  const needsDisclaimer = requiresDisclaimer(flags);
  const canContinue = !needsDisclaimer || flags.disclaimerAccepted;

  const toggle = (id: keyof ScreeningFlags) => {
    setFlags({ ...flags, [id]: !flags[id] });
  };

  return (
    <Card>
      <p
        className="text-xs font-medium tracking-widest uppercase mb-3"
        style={{ color: '#59A0CF' }}
      >
        Paso 2 · Screening
      </p>
      <h2
        className="text-2xl md:text-3xl font-extrabold mb-3 leading-tight"
        style={{ color: '#1A1A2E', fontWeight: 800 }}
      >
        Antes de comenzar
      </h2>
      <p className="text-gray-600 leading-relaxed mb-6">
        Para asegurarnos de que esta herramienta es adecuada para tu caso, selecciona si
        alguna de estas situaciones aplica. Puedes dejarlo en blanco si ninguna aplica.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {SCREENING_CHECKBOXES.map((c) => (
          <label
            key={c.id}
            className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors"
            style={{
              background: flags[c.id] ? '#E8F6FF' : '#F3F8FC',
              border: `1px solid ${flags[c.id] ? '#23D3FF' : 'transparent'}`,
            }}
          >
            <input
              type="checkbox"
              checked={Boolean(flags[c.id])}
              onChange={() => toggle(c.id)}
              className="mt-1 w-4 h-4 accent-[#23D3FF]"
            />
            <span className="text-sm text-gray-700 leading-relaxed">{c.label}</span>
          </label>
        ))}
      </div>

      {level !== 'none' && <WarningBox level={level} />}

      {needsDisclaimer && (
        <label
          className="flex items-start gap-3 p-4 rounded-xl cursor-pointer mt-4"
          style={{
            background: '#FFF7D6',
            border: '1px solid #FFC300',
          }}
        >
          <input
            type="checkbox"
            checked={flags.disclaimerAccepted}
            onChange={() => toggle('disclaimerAccepted')}
            className="mt-1 w-4 h-4 accent-[#FFC300]"
          />
          <span className="text-sm leading-relaxed" style={{ color: '#5C4200' }}>
            {DISCLAIMER_COPY}
          </span>
        </label>
      )}

      <hr className="my-10 border-gray-200" />

      <div>
        <p
          className="text-sm font-bold uppercase tracking-wider mb-3"
          style={{ color: '#224277' }}
        >
          Historial alimenticio
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          ¿Has seguido una dieta muy restrictiva o baja en calorías en los últimos 3 meses?
        </p>
        <div className="flex gap-3">
          {(['yes', 'no'] as const).map((v) => {
            const active = flags.restrictiveDiet === v;
            return (
              <button
                key={v}
                onClick={() => setFlags({ ...flags, restrictiveDiet: v })}
                className="px-6 py-2.5 rounded-full text-sm font-bold transition-colors"
                style={{
                  background: active ? '#224277' : '#F3F8FC',
                  color: active ? '#ffffff' : '#1A1A2E',
                  border: `1px solid ${active ? '#224277' : '#D6E4EE'}`,
                  fontWeight: 700,
                }}
              >
                {v === 'yes' ? 'Sí' : 'No'}
              </button>
            );
          })}
        </div>
      </div>

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
    yellow: { bg: '#FFF7D6', bar: '#FFC300', text: '#5C4200' },
    red: { bg: '#FEE2E2', bar: '#EF4444', text: '#7F1D1D' },
    pregnancy: { bg: '#FFEDD5', bar: '#F97316', text: '#7C2D12' },
  } as const;
  const p = palettes[level];
  const message = level === 'pregnancy' ? PREGNANCY_MESSAGE : WARNING_MESSAGE;
  return (
    <div
      className="p-4 rounded-xl flex gap-3 items-start"
      style={{ background: p.bg, borderLeft: `4px solid ${p.bar}` }}
    >
      <AlertTriangle size={20} color={p.bar} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed" style={{ color: p.text }}>
        {message}
      </p>
    </div>
  );
}

/* ---------------------------------- Form ---------------------------------- */

function FormStep({
  form,
  setForm,
  submitting,
  submitError,
  onBack,
  onSubmit,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const ageNum = form.age === '' ? NaN : Number(form.age);
  const ageValid = !Number.isNaN(ageNum) && ageNum >= 18 && ageNum <= 80;
  const ageTouched = form.age !== '';
  const weightValid = form.weight !== '' && Number(form.weight) > 0;
  const heightValid = form.height !== '' && Number(form.height) > 0;
  const bfValid =
    form.bodyFat === '' ||
    (Number(form.bodyFat) >= 5 && Number(form.bodyFat) <= 60);
  const emailValid = EMAIL_REGEX.test(form.email);
  const nameValid = form.name.trim().length > 0;

  const formValid =
    ageValid &&
    weightValid &&
    heightValid &&
    bfValid &&
    form.activity !== null &&
    form.goal !== null &&
    form.obstacle !== '' &&
    nameValid &&
    emailValid;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm({ ...form, [key]: value });

  return (
    <Card>
      <p
        className="text-xs font-medium tracking-widest uppercase mb-3"
        style={{ color: '#59A0CF' }}
      >
        Paso 3 · Calculadora
      </p>
      <h2
        className="text-2xl md:text-3xl font-extrabold mb-6 leading-tight"
        style={{ color: '#1A1A2E', fontWeight: 800 }}
      >
        Tus datos
      </h2>

      {/* Units toggle */}
      <SectionLabel>Sistema de unidades</SectionLabel>
      <div className="flex gap-2 mb-1">
        {(['metric', 'imperial'] as const).map((u) => (
          <PillButton
            key={u}
            active={form.units === u}
            onClick={() =>
              setForm({ ...form, units: u, weight: '', height: '' })
            }
          >
            {u === 'metric' ? 'Métrico (kg/cm)' : 'Imperial (lb/in)'}
          </PillButton>
        ))}
      </div>
      <p className="text-xs text-gray-500 mb-8">
        Cambiar unidades reinicia peso y talla.
      </p>

      {/* Personal data */}
      <SectionLabel>Datos personales</SectionLabel>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Field label="Edad (18–80)">
          <input
            type="number"
            min={18}
            max={80}
            value={form.age}
            onChange={(e) => update('age', e.target.value)}
            className="input"
            placeholder="30"
          />
          {ageTouched && !ageValid && (
            <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
              Ingresa una edad entre 18 y 80.
            </p>
          )}
        </Field>

        <Field label="Sexo biológico">
          <div className="flex gap-2">
            {(['male', 'female'] as const).map((s) => (
              <PillButton
                key={s}
                active={form.sex === s}
                onClick={() => update('sex', s)}
              >
                {s === 'male' ? 'Masculino' : 'Femenino'}
              </PillButton>
            ))}
          </div>
        </Field>

        <Field label={`Peso (${form.units === 'metric' ? 'kg' : 'lb'})`}>
          <input
            type="number"
            min={0}
            value={form.weight}
            onChange={(e) => update('weight', e.target.value)}
            className="input"
            placeholder={form.units === 'metric' ? '70' : '155'}
          />
        </Field>

        <Field label={`Talla (${form.units === 'metric' ? 'cm' : 'in'})`}>
          <input
            type="number"
            min={0}
            value={form.height}
            onChange={(e) => update('height', e.target.value)}
            className="input"
            placeholder={form.units === 'metric' ? '175' : '69'}
          />
        </Field>
      </div>

      {/* Activity */}
      <SectionLabel>Nivel de actividad</SectionLabel>
      <p className="text-sm italic text-gray-500 mb-4 leading-relaxed">
        La mayoría de personas que creen ser &ldquo;moderadas&rdquo; son en realidad
        &ldquo;ligeras&rdquo;. Elige el nivel que describe tu semana típica, no la ideal.
      </p>
      <div className="flex flex-col gap-2 mb-8">
        {ACTIVITY_TIERS.map((tier) => (
          <RadioCard
            key={tier}
            accent="#23D3FF"
            active={form.activity === tier}
            onClick={() => update('activity', tier)}
            title={activityLabels[tier].split(' — ')[0]}
            hint={activityLabels[tier].split(' — ').slice(1).join(' — ')}
          />
        ))}
      </div>

      {/* Body fat */}
      <SectionLabel>% de grasa corporal (opcional)</SectionLabel>
      <Field label="">
        <input
          type="number"
          min={5}
          max={60}
          value={form.bodyFat}
          onChange={(e) => update('bodyFat', e.target.value)}
          className="input"
          placeholder="18"
        />
        <p className="text-xs text-gray-500 mt-1">
          {form.bodyFat === ''
            ? 'Si no lo conoces, lo calcularemos con Mifflin-St Jeor.'
            : !bfValid
              ? 'Ingresa un valor entre 5 y 60.'
              : 'Usaremos Katch-McArdle para una estimación más precisa.'}
        </p>
      </Field>

      {/* Goal */}
      <SectionLabel>Objetivo</SectionLabel>
      <div className="flex flex-col gap-2 mb-8 mt-3">
        {GOAL_ORDER.map((g) => (
          <RadioCard
            key={g}
            accent="#FFC300"
            active={form.goal === g}
            onClick={() => update('goal', g)}
            title={goalLabels[g].title}
            hint={goalLabels[g].hint}
          />
        ))}
      </div>

      {/* Macro preset */}
      <SectionLabel>Distribución de macronutrientes</SectionLabel>
      <div className="flex flex-wrap gap-2 mb-8 mt-3">
        {(Object.keys(macroPresets) as MacroPreset[]).map((m) => (
          <PillButton
            key={m}
            active={form.macroPreset === m}
            onClick={() => update('macroPreset', m)}
          >
            {m === 'balanced'
              ? 'Balanceado'
              : m === 'high_protein'
                ? 'Alto en proteína'
                : 'Alto en carbos'}
          </PillButton>
        ))}
      </div>

      {/* Obstacle */}
      <SectionLabel>¿Cuál es tu mayor obstáculo para lograr tu objetivo?</SectionLabel>
      <div className="flex flex-col gap-2 mb-8 mt-3">
        {OBSTACLES.map((o) => (
          <RadioCard
            key={o.id}
            accent="#7ED957"
            active={form.obstacle === o.id}
            onClick={() => update('obstacle', o.id)}
            title={o.label}
          />
        ))}
      </div>

      {/* Contact */}
      <SectionLabel>Datos de contacto</SectionLabel>
      <div className="grid md:grid-cols-2 gap-4 mb-8 mt-3">
        <Field label="Nombre">
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="input"
            placeholder="Tu nombre"
          />
        </Field>
        <Field label="Correo electrónico">
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="input"
            placeholder="tu@correo.com"
          />
        </Field>
      </div>

      {submitError && (
        <div
          className="p-4 rounded-xl mb-4 text-sm"
          style={{ background: '#FEE2E2', color: '#7F1D1D' }}
        >
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <BackLink onClick={onBack} />
        <PrimaryButton
          onClick={onSubmit}
          disabled={!formValid || submitting}
        >
          {submitting ? 'Enviando…' : 'Recibir mi reporte personalizado'}
          {!submitting && <ArrowRight size={16} />}
        </PrimaryButton>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #d6e4ee;
          background: #f3f8fc;
          color: #1a1a2e;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .input:focus {
          border-color: #23d3ff;
          background: #ffffff;
        }
      `}</style>
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-sm font-bold uppercase tracking-wider mb-3 mt-2"
      style={{ color: '#224277' }}
    >
      {children}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
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
        background: active ? '#224277' : '#F3F8FC',
        color: active ? '#ffffff' : '#1A1A2E',
        border: `1px solid ${active ? '#224277' : '#D6E4EE'}`,
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function RadioCard({
  active,
  onClick,
  title,
  hint,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-4 rounded-xl transition-colors"
      style={{
        background: active ? `${accent}18` : '#F3F8FC',
        border: `2px solid ${active ? accent : 'transparent'}`,
      }}
    >
      <p
        className="text-sm font-bold leading-snug"
        style={{ color: '#1A1A2E', fontWeight: 700 }}
      >
        {title}
      </p>
      {hint && (
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{hint}</p>
      )}
    </button>
  );
}

/* ------------------------------ Confirmation ------------------------------ */

function ConfirmationStep() {
  return (
    <motion.div
      {...stepMotion}
      className="bg-white rounded-2xl shadow-lg p-10 md:p-14 text-center"
    >
      <div
        className="w-20 h-20 mx-auto mb-6 flex items-center justify-center"
        style={{
          clipPath:
            'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          background: '#7ED95733',
        }}
      >
        <CheckCircle2 size={40} color="#7ED957" strokeWidth={2} />
      </div>
      <h2
        className="text-3xl md:text-4xl font-extrabold mb-4"
        style={{ color: '#1A1A2E', fontWeight: 800 }}
      >
        Gracias.
      </h2>
      <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
        Te enviaremos tu reporte personalizado por correo en los próximos minutos.
      </p>
    </motion.div>
  );
}
