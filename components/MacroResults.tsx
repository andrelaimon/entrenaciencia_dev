'use client';

import { useState } from 'react';
import { CalcResult, Goal } from '@/lib/calorieCalculator';
import { Download } from 'lucide-react';

interface MacroResultsProps {
  result: CalcResult;
  goal: Goal;
  onDownload?: () => void;
}

const goalLabels: Record<Goal, string> = {
  leve_loss: 'Leve pérdida de peso',
  loss: 'Perder peso',
  maintain: 'Mantener',
  leve_gain: 'Leve ganancia de masa',
  gain: 'Ganar masa',
};

export default function MacroResults({ result, goal, onDownload }: MacroResultsProps) {
  const { calories, protein, carbs, fat, proteinPct, carbsPct, fatPct } = result;

  const macros = [
    { label: 'Proteína', value: protein, unit: 'g', pct: proteinPct, color: '#FFC300', bg: 'rgba(255,195,0,0.1)' },
    { label: 'Carbohidratos', value: carbs, unit: 'g', pct: carbsPct, color: '#23D3FF', bg: 'rgba(35,211,255,0.1)' },
    { label: 'Grasas', value: fat, unit: 'g', pct: fatPct, color: '#7ED957', bg: 'rgba(126,217,87,0.1)' },
  ];

  return (
    <div className="glass-card rounded-2xl p-8 flex flex-col gap-6 h-full">
      {/* Goal badge */}
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-sm">Objetivo: <span className="text-white font-medium">{goalLabels[goal]}</span></span>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: 'rgba(35,211,255,0.15)', color: '#23D3FF' }}
        >
          Personalizado
        </span>
      </div>

      {/* Main calorie display */}
      <div className="text-center py-4">
        <p className="text-white/50 text-sm mb-1">Calorías diarias</p>
        <p
          className="leading-none font-extrabold"
          style={{ fontSize: '4rem', color: '#23D3FF', fontWeight: 800, lineHeight: 1 }}
        >
          {calories.toLocaleString('es-ES')}
        </p>
        <p className="text-white/60 text-lg mt-1">kcal/día</p>
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <div
            key={m.label}
            className="rounded-xl p-3 text-center"
            style={{ background: m.bg }}
          >
            <p
              className="text-xl font-extrabold"
              style={{ color: m.color, fontWeight: 800 }}
            >
              {m.value}g
            </p>
            <p className="text-white/60 text-xs mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Macro bar chart */}
      <div>
        <p className="text-white/50 text-xs mb-2">Distribución de macronutrientes</p>
        <div className="flex rounded-full overflow-hidden h-4">
          <div
            style={{
              width: `${Math.round(macros[0].pct * 100)}%`,
              background: macros[0].color,
            }}
            title={`Proteína ${Math.round(macros[0].pct * 100)}%`}
          />
          <div
            style={{
              width: `${Math.round(macros[1].pct * 100)}%`,
              background: macros[1].color,
            }}
            title={`Carbohidratos ${Math.round(macros[1].pct * 100)}%`}
          />
          <div
            style={{
              width: `${Math.round(macros[2].pct * 100)}%`,
              background: macros[2].color,
            }}
            title={`Grasas ${Math.round(macros[2].pct * 100)}%`}
          />
        </div>
        <div className="flex justify-between mt-2">
          {macros.map((m) => (
            <div key={m.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
              <span className="text-white/50 text-xs">{Math.round(m.pct * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={onDownload}
        className="mt-auto w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
          color: '#1A1A2E',
          borderRadius: '50px',
          fontWeight: 800,
        }}
      >
        <Download size={16} />
        Descargar mi plan
      </button>
    </div>
  );
}
