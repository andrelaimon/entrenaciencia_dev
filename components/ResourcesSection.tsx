'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Salad, Leaf, FlaskConical, Dumbbell, ArrowRight } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import EmailModal from './EmailModal';

type ResourceKind = 'pdf' | 'internal' | 'course';

interface Resource {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  kind: ResourceKind;
  href?: string;
  featured?: boolean;
}

const resources: Resource[] = [
  {
    icon: Salad,
    title: 'Guía para perder peso',
    description: 'Aprende los principios básicos para perder grasa de forma sostenible.',
    accent: '#7ED957',
    kind: 'pdf',
  },
  {
    icon: Leaf,
    title: 'Guía de consumo de proteína',
    description: 'Descubre cuánta proteína necesitas y cómo incluirla en tu día.',
    accent: '#FFC300',
    kind: 'pdf',
  },
  {
    icon: FlaskConical,
    title: 'Calculadora de calorías',
    description: 'Estima tus calorías de mantenimiento y tus objetivos diarios.',
    accent: '#23D3FF',
    kind: 'internal',
    href: '/calculadora',
  },
  {
    icon: Dumbbell,
    title: 'Curso',
    description: 'Un curso práctico para entrenar y comer con ciencia.',
    accent: '#FFC300',
    kind: 'course',
    featured: true,
  },
];

interface ResourceCardProps {
  resource: Resource;
  index: number;
  onLeadClick: (resource: Resource) => void;
}

function ResourceCard({ resource, index, onLeadClick }: ResourceCardProps) {
  const Icon = resource.icon;
  const featured = resource.featured === true;

  const cardBody = (
    <>
      <div
        className="h-28 flex items-center justify-center relative"
        style={{
          background: featured
            ? 'linear-gradient(135deg, rgba(255,195,0,0.18) 0%, rgba(255,195,0,0.05) 100%)'
            : `${resource.accent}18`,
        }}
      >
        <div
          className="w-16 h-16 flex items-center justify-center"
          style={{
            clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
            background: featured ? '#FFC300' : `${resource.accent}33`,
          }}
        >
          <Icon
            size={30}
            color={featured ? '#1A1A2E' : resource.accent}
            strokeWidth={1.6}
          />
        </div>
        {featured && (
          <span
            className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full tracking-wider uppercase"
            style={{ background: '#FFC300', color: '#1A1A2E' }}
          >
            Próximamente
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1 gap-3">
        <h3
          className="font-extrabold text-base leading-snug"
          style={{ color: featured ? '#FFFFFF' : '#1A1A2E', fontWeight: 800 }}
        >
          {resource.title}
        </h3>
        <p
          className="text-xs leading-relaxed flex-1"
          style={{ color: featured ? 'rgba(255,255,255,0.75)' : '#6B7280' }}
        >
          {resource.description}
        </p>
        <span
          className="inline-flex items-center gap-1 text-xs font-bold mt-1"
          style={{ color: featured ? '#FFC300' : resource.accent }}
        >
          {resource.kind === 'pdf' && 'Solicitar PDF'}
          {resource.kind === 'internal' && 'Ver más'}
          {resource.kind === 'course' && 'Notificarme'}{' '}
          <ArrowRight size={12} />
        </span>
      </div>
    </>
  );

  const baseClass =
    'block h-full rounded-2xl overflow-hidden flex flex-col transition duration-200 hover:-translate-y-1 hover:shadow-2xl';
  const sharedClass = featured
    ? `${baseClass} shadow-xl`
    : `${baseClass} bg-white shadow-md`;

  const featuredStyle = featured
    ? {
        background:
          'linear-gradient(160deg, #0A1628 0%, #224277 55%, #59A0CF 100%)',
        border: '1px solid rgba(255,195,0,0.35)',
      }
    : undefined;

  let inner: React.ReactNode;
  if (resource.kind === 'internal' && resource.href) {
    inner = (
      <Link href={resource.href} className={sharedClass} style={featuredStyle}>
        {cardBody}
      </Link>
    );
  } else {
    inner = (
      <button
        type="button"
        onClick={() => onLeadClick(resource)}
        className={`${sharedClass} text-left w-full cursor-pointer`}
        style={featuredStyle}
      >
        {cardBody}
      </button>
    );
  }

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {inner}
    </motion.div>
  );
}

export default function ResourcesSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>(undefined);
  const [selectedKind, setSelectedKind] = useState<'pdf' | 'course'>('pdf');

  function handleLeadClick(resource: Resource) {
    if (resource.kind !== 'pdf' && resource.kind !== 'course') return;
    setSelectedTitle(resource.title);
    setSelectedKind(resource.kind);
    setModalOpen(true);
  }

  return (
    <section
      id="recursos"
      className="py-24 px-6"
      style={{ background: '#EDF5FA' }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p
            className="text-sm font-medium tracking-widest uppercase mb-3"
            style={{ color: '#59A0CF' }}
          >
            Recursos
          </p>
          <h2
            className="text-4xl md:text-5xl font-extrabold"
            style={{ color: '#1A1A2E', fontWeight: 800 }}
          >
            Recursos
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Herramientas y guías para empezar hoy.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {resources.map((resource, i) => (
            <ResourceCard
              key={resource.title}
              resource={resource}
              index={i}
              onLeadClick={handleLeadClick}
            />
          ))}
        </div>
      </div>

      <EmailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedTitle}
        kind={selectedKind}
      />
    </section>
  );
}
