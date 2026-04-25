'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0A1628 0%, #224277 55%, #59A0CF 100%)' }}
    >
      {/* Hex pattern overlay */}
      <div
        className="hex-pattern absolute inset-0 pointer-events-none"
        style={{ opacity: 0.06 }}
      />

      {/* Floating hex shapes */}
      <div
        className="absolute top-20 left-10 w-24 h-24 opacity-10 hex-clip"
        style={{ background: '#23D3FF' }}
      />
      <div
        className="absolute bottom-32 right-16 w-32 h-32 opacity-8 hex-clip"
        style={{ background: '#FFC300' }}
      />
      <div
        className="absolute top-1/3 right-10 w-16 h-16 opacity-10 hex-clip"
        style={{ background: '#59A0CF' }}
      />
      <div
        className="absolute bottom-1/4 left-20 w-20 h-20 opacity-8 hex-clip"
        style={{ background: '#7ED957' }}
      />

      {/* Centered content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-32 w-full text-center flex flex-col items-center">
        <motion.p
          className="text-white/70 font-medium text-sm md:text-base tracking-[0.3em] uppercase mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Entrena con ciencia y eficiencia
        </motion.p>

        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6"
          style={{ fontWeight: 800 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Tu cuerpo merece{' '}
          <span style={{ color: '#23D3FF' }}>entrenamiento</span>{' '}
          <span style={{ color: '#23D3FF' }}>inteligente</span>
        </motion.h1>

        <motion.p
          className="text-white/60 text-lg font-light mb-10 leading-relaxed max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Descubre el enfoque científico para transformar tu cuerpo. Accede a guías
          profesionales y alcanza tus metas con estrategias respaldadas por la ciencia.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <a
            href="#recursos"
            className="btn-gold px-8 py-4 text-base font-bold w-full sm:w-auto text-center"
            style={{
              background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
              color: '#1A1A2E',
              borderRadius: '50px',
              fontWeight: 700,
            }}
          >
            Descarga nuestras guías
          </a>
          <a
            href="#recursos"
            className="btn-outline px-8 py-4 text-base font-bold w-full sm:w-auto text-center"
            style={{
              border: '2px solid white',
              borderRadius: '50px',
              color: 'white',
              background: 'transparent',
              fontWeight: 700,
            }}
          >
            Ver Recursos
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <span className="text-[11px] tracking-[0.25em] uppercase font-medium">
          Desliza para descubrir
        </span>
        <ChevronDown size={26} />
      </motion.div>
    </section>
  );
}
