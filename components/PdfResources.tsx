'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Salad, Dumbbell, FlaskConical, Leaf, ChevronDown } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import EmailModal from './EmailModal';

interface PdfCard {
  icon: LucideIcon;
  title: string;
  description: string;
  expandedDetail: string;
  file: string;
  accent: string;
  tag: string;
}

const pdfs: PdfCard[] = [
  {
    icon: Salad,
    title: 'Guía de Alimentación Saludable',
    description: 'Principios científicos de nutrición, porciones ideales y cómo estructurar tus comidas para maximizar resultados.',
    expandedDetail: '(Contenido detallado a definir con el doctor) — Esta guía cubrirá macronutrientes, frecuencia de comidas, alimentos recomendados y estrategias prácticas para mantener una alimentación saludable sin complicaciones.',
    file: '/pdfs/guia-alimentacion.pdf',
    accent: '#7ED957',
    tag: 'Nutrición',
  },
  {
    icon: Dumbbell,
    title: 'Plan de Entrenamiento 12 Semanas',
    description: 'Programa completo de 12 semanas con progresión de carga, ejercicios detallados y tiempos de descanso.',
    expandedDetail: '(Contenido detallado a definir con el doctor) — El plan incluye bloques de hipertrofia, fuerza y resistencia, con progresión semanal, videos demostrativos y variantes para diferentes niveles.',
    file: '/pdfs/plan-entrenamiento.pdf',
    accent: '#23D3FF',
    tag: 'Entrenamiento',
  },
  {
    icon: Leaf,
    title: 'Recetas Altas en Proteína',
    description: '30 recetas deliciosas con alto contenido proteico para apoyar tu recuperación muscular y saciarte.',
    expandedDetail: '(Contenido detallado a definir con el doctor) — Recetas rápidas de desayuno, almuerzo y cena, con información nutricional completa, lista de ingredientes y tiempo de preparación.',
    file: '/pdfs/recetas-proteina.pdf',
    accent: '#FFC300',
    tag: 'Recetas',
  },
  {
    icon: FlaskConical,
    title: 'Guía de Suplementación',
    description: 'Lo que realmente funciona según la ciencia: proteína, creatina, cafeína y más. Sin mitos, solo evidencia.',
    expandedDetail: '(Contenido detallado a definir con el doctor) — Análisis basado en evidencia de los suplementos con mayor respaldo científico, dosis recomendadas, momento de ingesta y advertencias sobre productos sin evidencia.',
    file: '/pdfs/guia-suplementacion.pdf',
    accent: '#59A0CF',
    tag: 'Suplementos',
  },
];

export default function PdfResources() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfCard | null>(null);
  const [openCard, setOpenCard] = useState<number | null>(null);

  function handleDownload(pdf: PdfCard) {
    setSelectedPdf(pdf);
    setModalOpen(true);
  }

  function toggleCard(index: number) {
    setOpenCard(openCard === index ? null : index);
  }

  return (
    <section
      id="recursos"
      className="py-24 px-6"
      style={{ background: '#EDF5FA' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: '#59A0CF' }}>
            100% Gratuito
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold" style={{ color: '#1A1A2E', fontWeight: 800 }}>
            Recursos{' '}
            <span style={{ color: '#FFC300' }}>gratuitos</span>
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Descarga nuestras guías creadas por expertos y empieza a transformar tu cuerpo con
            estrategias respaldadas por la ciencia.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pdfs.map((pdf, i) => {
            const isOpen = openCard === i;
            return (
              <motion.div
                key={pdf.title}
                className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col cursor-pointer"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                onClick={() => toggleCard(i)}
              >
                {/* Thumbnail */}
                <div
                  className="h-36 flex items-center justify-center relative"
                  style={{ background: `${pdf.accent}18` }}
                >
                  <div
                    className="w-16 h-16 flex items-center justify-center"
                    style={{
                      clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                      background: `${pdf.accent}33`,
                    }}
                  >
                    <pdf.icon size={30} color={pdf.accent} strokeWidth={1.6} />
                  </div>
                  <span
                    className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: pdf.accent, color: '#fff' }}
                  >
                    {pdf.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1 gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-extrabold text-base leading-snug"
                      style={{ color: '#1A1A2E', fontWeight: 800 }}
                    >
                      {pdf.title}
                    </h3>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      <ChevronDown size={16} color="#9CA3AF" />
                    </motion.div>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    {pdf.description}
                  </p>

                  {/* Expanded detail */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="detail"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p
                          className="text-xs leading-relaxed pt-2 pb-1 border-t"
                          style={{ color: pdf.accent, borderColor: `${pdf.accent}33` }}
                        >
                          {pdf.expandedDetail}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(pdf);
                    }}
                    className="mt-auto w-full py-2.5 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{
                      background: 'linear-gradient(135deg, #224277 0%, #59A0CF 100%)',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    <Download size={14} />
                    Descargar PDF
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <EmailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        pdfTitle={selectedPdf?.title}
      />
    </section>
  );
}
