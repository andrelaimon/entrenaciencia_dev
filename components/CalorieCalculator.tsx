'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Flame } from 'lucide-react';
import {
  calculateCalories,
  CalcInput,
  CalcResult,
  ActivityLevel,
  Goal,
  Sex,
  activityLabels,
} from '@/lib/calorieCalculator';
import MacroResults from './MacroResults';

const defaultInput: CalcInput = {
  sex: 'male',
  age: 28,
  weight: 75,
  height: 175,
  activity: 1.55,
  goal: 'maintain',
};

export default function CalorieCalculator() {
  const [input, setInput] = useState<CalcInput>(defaultInput);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const res = calculateCalories(input);
    setResult(res);
    setCalculated(true);
  }

  function handleField<K extends keyof CalcInput>(key: K, value: CalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setCalculated(false);
  }

  return (
    <section
      id="calculadora"
      className="relative py-24 px-6 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #224277 0%, #0A1628 100%)' }}
    >
      {/* Hex pattern */}
      <div className="hex-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.05 }} />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: '#23D3FF' }}>
            Mifflin-St Jeor
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white" style={{ fontWeight: 800 }}>
            Calcula tus{' '}
            <span style={{ color: '#FFC300' }}>calorías</span> diarias
          </h2>
          <p className="text-white/60 mt-4 max-w-xl mx-auto text-base">
            Obtén tu gasto calórico personalizado basado en tu metabolismo real.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Form */}
          <motion.div
            className="glass-card rounded-2xl p-8 flex flex-col gap-6"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Sexo */}
            <div>
              <label className="text-white/70 text-sm font-medium block mb-2">Sexo</label>
              <div className="flex gap-3">
                {(['male', 'female'] as Sex[]).map((s) => (
                  <button
                    key={s}
                    className={`toggle-btn flex-1 ${input.sex === s ? 'active' : ''}`}
                    onClick={() => handleField('sex', s)}
                  >
                    {s === 'male' ? 'Hombre' : 'Mujer'}
                  </button>
                ))}
              </div>
            </div>

            {/* Age, Weight, Height */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-white/70 text-sm font-medium block mb-2">Edad</label>
                <input
                  type="number"
                  min={15}
                  max={80}
                  value={input.age}
                  onChange={(e) => handleField('age', Number(e.target.value))}
                  className="input-dark w-full rounded-xl px-4 py-3 text-sm"
                  placeholder="28"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm font-medium block mb-2">Peso (kg)</label>
                <input
                  type="number"
                  min={30}
                  max={250}
                  value={input.weight}
                  onChange={(e) => handleField('weight', Number(e.target.value))}
                  className="input-dark w-full rounded-xl px-4 py-3 text-sm"
                  placeholder="75"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm font-medium block mb-2">Altura (cm)</label>
                <input
                  type="number"
                  min={100}
                  max={250}
                  value={input.height}
                  onChange={(e) => handleField('height', Number(e.target.value))}
                  className="input-dark w-full rounded-xl px-4 py-3 text-sm"
                  placeholder="175"
                />
              </div>
            </div>

            {/* Activity */}
            <div>
              <label className="text-white/70 text-sm font-medium block mb-2">
                Nivel de actividad
              </label>
              <div className="relative">
                <select
                  className="select-dark w-full rounded-xl px-4 py-3 text-sm cursor-pointer"
                  value={input.activity}
                  onChange={(e) => handleField('activity', Number(e.target.value) as ActivityLevel)}
                >
                  {(Object.keys(activityLabels) as unknown as ActivityLevel[]).map((val) => (
                    <option key={val} value={val}>
                      {activityLabels[val as ActivityLevel]}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50">
                  ▼
                </div>
              </div>
            </div>

            {/* Goal */}
            <div>
              <label className="text-white/70 text-sm font-medium block mb-2">Objetivo</label>
              <div className="flex gap-3 flex-wrap">
                {([
                  { value: 'loss', label: 'Perder peso' },
                  { value: 'maintain', label: 'Mantener' },
                  { value: 'gain', label: 'Ganar masa' },
                ] as { value: Goal; label: string }[]).map((g) => (
                  <button
                    key={g.value}
                    className={`toggle-btn flex-1 min-w-[100px] ${input.goal === g.value ? 'active' : ''}`}
                    onClick={() => handleField('goal', g.value)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculate button */}
            <button
              onClick={handleCalculate}
              className="mt-2 w-full py-4 text-base font-extrabold flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
                color: '#1A1A2E',
                borderRadius: '50px',
                fontWeight: 800,
              }}
            >
              <Calculator size={20} />
              Calcular mis calorías
            </button>
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {calculated && result ? (
              <MacroResults result={result} goal={input.goal} />
            ) : (
              <div className="glass-card rounded-2xl p-8 h-full flex flex-col items-center justify-center gap-4 text-center min-h-[400px]">
                <div
                  className="w-20 h-20 flex items-center justify-center rounded-full"
                  style={{ background: 'rgba(35,211,255,0.1)' }}
                >
                  <Flame size={36} color="#23D3FF" />
                </div>
                <h3 className="text-white text-xl font-bold">Tu resultado aparecerá aquí</h3>
                <p className="text-white/50 text-sm max-w-xs">
                  Completa el formulario con tus datos y presiona &ldquo;Calcular&rdquo; para ver tu
                  plan calórico personalizado.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
