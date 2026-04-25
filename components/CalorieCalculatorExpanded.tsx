'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Flame, CheckCircle, Send } from 'lucide-react';
import {
  calculateCaloriesWithPreset,
  calculateCaloriesKatch,
  CalcInput,
  CalcResult,
  ActivityLevel,
  Goal,
  MacroPreset,
  activityLabels,
  macroPresets,
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

const goalOptions: { value: Goal; label: string; desc: string }[] = [
  { value: 'loss', label: 'Perder grasa', desc: '−500 kcal/día' },
  { value: 'maintain', label: 'Mantener peso', desc: 'TDEE exacto' },
  { value: 'gain', label: 'Ganar músculo', desc: '+300 kcal/día' },
];

export default function CalorieCalculatorExpanded() {
  const [input, setInput] = useState<CalcInput>(defaultInput);
  const [bodyFat, setBodyFat] = useState<string>('');
  const [macroPreset, setMacroPreset] = useState<MacroPreset>('balanced');
  const [result, setResult] = useState<CalcResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  // Contact capture
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [countryCode, setCountryCode] = useState('+52');
  const [submitted, setSubmitted] = useState(false);
  const [contactError, setContactError] = useState('');

  function handleField<K extends keyof CalcInput>(key: K, value: CalcInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setCalculated(false);
  }

  function handleCalculate() {
    const bf = parseFloat(bodyFat);
    let res: CalcResult;

    if (!isNaN(bf) && bf > 0 && bf < 100) {
      const lbm = input.weight * (1 - bf / 100);
      res = calculateCaloriesKatch(lbm, input.activity, input.goal, macroPreset);
    } else {
      res = calculateCaloriesWithPreset(input, macroPreset);
    }

    setResult(res);
    setCalculated(true);
    setSubmitted(false);
    setEmail('');
    setWhatsapp('');
    setContactError('');
  }

  function handleSendResults(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setContactError('Por favor ingresa un email válido.');
      return;
    }
    setContactError('');
    // Placeholder: log data until backend is wired
    console.log('Resultados para enviar:', {
      email,
      whatsapp: whatsapp ? `${countryCode}${whatsapp}` : null,
      result,
      input,
    });
    setSubmitted(true);
  }

  const mealsPerDay = input.goal === 'loss' ? 3 : input.goal === 'gain' ? 5 : 4;

  return (
    <section
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
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{
                clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                background: 'rgba(35,211,255,0.15)',
              }}
            >
              <Calculator size={20} color="#23D3FF" />
            </div>
          </div>
          <p className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: '#23D3FF' }}>
            Basado en ciencia
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white" style={{ fontWeight: 800 }}>
            Calculadora de{' '}
            <span style={{ color: '#FFC300' }}>Calorías y Macros</span>
          </h2>
          <p className="text-white/50 mt-4 max-w-xl mx-auto">
            Ingresa tus datos para obtener tus calorías y macronutrientes personalizados.
            Si conoces tu % de grasa corporal, activa el cálculo Katch-McArdle para mayor precisión.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <motion.div
            className="glass-card rounded-2xl p-8 flex flex-col gap-6"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Sex toggle */}
            <div>
              <label className="text-white/60 text-xs uppercase tracking-widest mb-2 block">Sexo</label>
              <div className="flex gap-3">
                {(['male', 'female'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleField('sex', s)}
                    className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all"
                    style={{
                      background: input.sex === s ? '#23D3FF' : 'rgba(255,255,255,0.07)',
                      color: input.sex === s ? '#0A1628' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {s === 'male' ? 'Hombre' : 'Mujer'}
                  </button>
                ))}
              </div>
            </div>

            {/* Age / Weight / Height */}
            <div className="grid grid-cols-3 gap-4">
              {([
                { key: 'age', label: 'Edad', unit: 'años', min: 15, max: 80 },
                { key: 'weight', label: 'Peso', unit: 'kg', min: 30, max: 250 },
                { key: 'height', label: 'Altura', unit: 'cm', min: 100, max: 250 },
              ] as const).map(({ key, label, unit, min, max }) => (
                <div key={key}>
                  <label className="text-white/60 text-xs uppercase tracking-widest mb-1 block">
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="input-dark w-full pr-8"
                      min={min}
                      max={max}
                      value={input[key]}
                      onChange={(e) => handleField(key, Number(e.target.value) as never)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                      {unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Body fat % — optional */}
            <div>
              <label className="text-white/60 text-xs uppercase tracking-widest mb-1 block">
                % Grasa corporal{' '}
                <span className="normal-case text-white/30">(opcional — activa Katch-McArdle)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="input-dark w-full pr-8"
                  min={3}
                  max={60}
                  placeholder="Ej. 18"
                  value={bodyFat}
                  onChange={(e) => { setBodyFat(e.target.value); setCalculated(false); }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">%</span>
              </div>
            </div>

            {/* Activity level */}
            <div>
              <label className="text-white/60 text-xs uppercase tracking-widest mb-1 block">
                Nivel de actividad
              </label>
              <select
                className="select-dark w-full"
                value={input.activity}
                onChange={(e) => handleField('activity', parseFloat(e.target.value) as ActivityLevel)}
              >
                {Object.entries(activityLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Goal */}
            <div>
              <label className="text-white/60 text-xs uppercase tracking-widest mb-2 block">Objetivo</label>
              <div className="grid grid-cols-3 gap-2">
                {goalOptions.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleField('goal', value)}
                    className="flex flex-col items-center py-3 px-2 rounded-xl text-center transition-all"
                    style={{
                      background: input.goal === value ? 'rgba(35,211,255,0.15)' : 'rgba(255,255,255,0.05)',
                      border: input.goal === value ? '1px solid rgba(35,211,255,0.5)' : '1px solid transparent',
                    }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: input.goal === value ? '#23D3FF' : 'rgba(255,255,255,0.6)' }}
                    >
                      {label}
                    </span>
                    <span className="text-white/30 text-[10px] mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Macro preset */}
            <div>
              <label className="text-white/60 text-xs uppercase tracking-widest mb-2 block">
                Distribución de macros
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(macroPresets) as [MacroPreset, typeof macroPresets[MacroPreset]][]).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setMacroPreset(key); setCalculated(false); }}
                    className="flex flex-col items-center py-3 px-2 rounded-xl text-center transition-all"
                    style={{
                      background: macroPreset === key ? 'rgba(255,195,0,0.12)' : 'rgba(255,255,255,0.05)',
                      border: macroPreset === key ? '1px solid rgba(255,195,0,0.4)' : '1px solid transparent',
                    }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: macroPreset === key ? '#FFC300' : 'rgba(255,255,255,0.6)' }}
                    >
                      {preset.label}
                    </span>
                    <span className="text-white/30 text-[10px] mt-0.5">
                      P{Math.round(preset.protein * 100)} / C{Math.round(preset.carbs * 100)} / G{Math.round(preset.fat * 100)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Meals per day indicator */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="text-white/50 text-sm">Comidas recomendadas al día</span>
              <span className="text-white font-bold text-lg">{mealsPerDay}</span>
            </div>

            <button
              onClick={handleCalculate}
              className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 rounded-full transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #23D3FF 0%, #59A0CF 100%)',
                color: '#0A1628',
                fontWeight: 800,
              }}
            >
              <Flame size={18} />
              Calcular mis macros
            </button>
          </motion.div>

          {/* Results */}
          <motion.div
            className="flex flex-col gap-6"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {calculated && result ? (
              <>
                <MacroResults result={result} goal={input.goal} />

                {/* Formula used */}
                <p className="text-white/30 text-xs text-center">
                  {parseFloat(bodyFat) > 0 && parseFloat(bodyFat) < 100
                    ? 'Calculado con fórmula Katch-McArdle (masa magra)'
                    : 'Calculado con fórmula Mifflin-St Jeor'}
                </p>

                {/* Contact capture */}
                <AnimatePresence>
                  <motion.div
                    className="glass-card rounded-2xl p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {submitted ? (
                      <div className="flex flex-col items-center gap-3 py-4 text-center">
                        <CheckCircle size={40} color="#7ED957" strokeWidth={1.5} />
                        <p className="text-white font-bold">¡Listo!</p>
                        <p className="text-white/50 text-sm">
                          En breve recibirás tus resultados. ¡Mucho éxito!
                        </p>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-white font-extrabold text-base mb-1" style={{ fontWeight: 800 }}>
                          Recibe tus resultados
                        </h3>
                        <p className="text-white/40 text-xs mb-4">
                          Te enviamos un resumen con tus calorías y macros por email y/o WhatsApp.
                        </p>
                        <form onSubmit={handleSendResults} className="flex flex-col gap-3">
                          <input
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-dark w-full"
                          />
                          <div className="flex gap-2">
                            <select
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="select-dark"
                              style={{ width: '90px', flexShrink: 0 }}
                            >
                              <option value="+52">🇲🇽 +52</option>
                              <option value="+1">🇺🇸 +1</option>
                              <option value="+34">🇪🇸 +34</option>
                              <option value="+54">🇦🇷 +54</option>
                              <option value="+57">🇨🇴 +57</option>
                              <option value="+56">🇨🇱 +56</option>
                              <option value="+51">🇵🇪 +51</option>
                            </select>
                            <input
                              type="tel"
                              placeholder="WhatsApp (opcional)"
                              value={whatsapp}
                              onChange={(e) => setWhatsapp(e.target.value)}
                              className="input-dark flex-1"
                            />
                          </div>
                          {contactError && (
                            <p className="text-red-400 text-xs">{contactError}</p>
                          )}
                          <button
                            type="submit"
                            className="w-full py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                            style={{
                              background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
                              color: '#1A1A2E',
                              fontWeight: 800,
                            }}
                          >
                            <Send size={14} />
                            Enviar mis resultados
                          </button>
                        </form>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </>
            ) : (
              <div
                className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center h-full"
                style={{ minHeight: '300px' }}
              >
                <div
                  className="w-16 h-16 flex items-center justify-center"
                  style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                    background: 'rgba(35,211,255,0.1)',
                  }}
                >
                  <Flame size={28} color="#23D3FF" strokeWidth={1.5} />
                </div>
                <p className="text-white/60 text-sm">
                  Completa el formulario y presiona{' '}
                  <span style={{ color: '#23D3FF' }}>Calcular mis macros</span>
                  {' '}para ver tus resultados personalizados.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
