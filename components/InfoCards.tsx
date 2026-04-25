'use client';

import { motion } from 'framer-motion';
import { Dumbbell, Moon, Apple } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Card {
  icon: LucideIcon;
  title: string;
  keyword: string;
  description: string;
  accent: string;
  stat: string;
  statLabel: string;
}

const cards: Card[] = [
  {
    icon: Dumbbell,
    title: 'Ejercicio regular',
    keyword: 'ejercicios',
    description:
      'La consistencia es la clave. Con solo 30 minutos de entrenamiento dirigido puedes transformar tu composición corporal y mejorar tu salud metabólica significativamente.',
    accent: '#23D3FF',
    stat: '30 min.',
    statLabel: '5 veces por semana',
  },
  {
    icon: Moon,
    title: 'Descanso óptimo',
    keyword: 'dormir',
    description:
      'El sueño es cuando tu cuerpo se recupera y crece. Dormir 8 horas cada noche regula las hormonas del hambre, la recuperación muscular y tu rendimiento en el entrenamiento.',
    accent: '#FFC300',
    stat: '8 horas',
    statLabel: 'todos los días',
  },
  {
    icon: Apple,
    title: 'Nutrición inteligente',
    keyword: 'alimentación',
    description:
      'Lo que comes determina el 70% de tus resultados. Una alimentación saludable, balanceada y adaptada a tus objetivos es el combustible que tu cuerpo necesita para rendir.',
    accent: '#7ED957',
    stat: 'Buena',
    statLabel: 'alimentación saludable',
  },
];

export default function InfoCards() {
  return (
    <section
      id="por-que"
      className="py-24 px-6"
      style={{ background: '#EDF5FA' }}
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
            Los pilares del éxito
          </p>
          <h2
            className="text-4xl md:text-5xl font-extrabold"
            style={{ color: '#1A1A2E', fontWeight: 800 }}
          >
            ¿Por qué{' '}
            <span style={{ color: '#224277' }}>importa</span>?
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-5"
              style={{ borderTop: `4px solid ${card.accent}` }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {/* Hex icon */}
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  background: `${card.accent}22`,
                }}
              >
                <card.icon size={28} color={card.accent} strokeWidth={1.8} />
              </div>

              {/* Stat */}
              <div>
                <p
                  className="text-3xl font-extrabold leading-none"
                  style={{ color: card.accent, fontWeight: 800 }}
                >
                  {card.stat}
                </p>
                <p
                  className="text-sm font-medium mt-1"
                  style={{ color: '#6B7280' }}
                >
                  de <span className="font-bold" style={{ color: '#1A1A2E' }}>{card.keyword}</span>{' '}
                  — {card.statLabel}
                </p>
              </div>

              <div>
                <h3
                  className="text-xl font-extrabold mb-2"
                  style={{ color: '#1A1A2E', fontWeight: 800 }}
                >
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
