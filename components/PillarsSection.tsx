'use client';

import { motion } from 'framer-motion';
import { Dumbbell, Apple, Moon } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Pillar {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
}

const pillars: Pillar[] = [
  {
    icon: Dumbbell,
    title: 'Entrenamiento',
    description: 'Programación basada en evidencia para maximizar resultados.',
    accent: '#23D3FF',
  },
  {
    icon: Apple,
    title: 'Nutrición',
    description: 'Estrategias nutricionales simples, prácticas y respaldadas por ciencia.',
    accent: '#7ED957',
  },
  {
    icon: Moon,
    title: 'Recuperación',
    description: 'Mejores hábitos de descanso y recuperación para sostener el progreso.',
    accent: '#FFC300',
  },
];

export default function PillarsSection() {
  return (
    <section
      id="pilares"
      className="py-24 px-6"
      style={{ background: '#FFFFFF' }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p
            className="text-sm font-medium tracking-widest uppercase mb-3"
            style={{ color: '#59A0CF' }}
          >
            Los pilares
          </p>
          <h2
            className="text-4xl md:text-5xl font-extrabold"
            style={{ color: '#1A1A2E', fontWeight: 800 }}
          >
            ¿Qué es{' '}
            <span style={{ color: '#224277' }}>entrenar con ciencia</span>?
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-5"
              style={{ borderTop: `4px solid ${pillar.accent}` }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  background: `${pillar.accent}22`,
                }}
              >
                <pillar.icon size={28} color={pillar.accent} strokeWidth={1.8} />
              </div>

              <div>
                <h3
                  className="text-xl font-extrabold mb-2"
                  style={{ color: '#1A1A2E', fontWeight: 800 }}
                >
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                  {pillar.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
