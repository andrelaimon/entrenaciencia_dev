'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, ChevronRight } from 'lucide-react';
import { getTrackingContext } from '@/lib/tracking';
import { fireConversionEvent } from '@/lib/pixel';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'contact' | 'survey' | 'success';

interface Survey {
  goal: string;
  level: string;
  days: string;
  challenge: string;
}

const GOALS = [
  { value: 'Perder peso', label: 'Perder peso' },
  { value: 'Ganar músculo', label: 'Ganar músculo' },
  { value: 'Mejorar rendimiento', label: 'Mejorar rendimiento' },
  { value: 'Salud general', label: 'Salud general' },
];

const LEVELS = [
  { value: 'Principiante', label: 'Principiante' },
  { value: 'Intermedio', label: 'Intermedio' },
  { value: 'Avanzado', label: 'Avanzado' },
];

const DAYS = [
  { value: '1-2 días', label: '1–2 días' },
  { value: '3-4 días', label: '3–4 días' },
  { value: '5+ días', label: '5+ días' },
];

const CHALLENGES = [
  { value: 'Nutrición', label: 'Nutrición' },
  { value: 'Entrenamiento', label: 'Entrenamiento' },
  { value: 'Constancia', label: 'Constancia' },
  { value: 'Tiempo', label: 'Tiempo' },
];

const CARD_BG   = '#0d1f35';
const CYAN      = '#23D3FF';
const YELLOW    = '#FFC300';
const NAVY      = '#010d15';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#ffffff',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: active ? CYAN : 'rgba(255,255,255,0.06)',
              color: active ? NAVY : 'rgba(255,255,255,0.7)',
              border: `1px solid ${active ? CYAN : 'rgba(255,255,255,0.12)'}`,
              fontWeight: active ? 700 : 500,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
      {children}
    </p>
  );
}

export default function CourseModal({ isOpen, onClose }: CourseModalProps) {
  const [step, setStep] = useState<Step>('contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [survey, setSurvey] = useState<Survey>({ goal: '', level: '', days: '', challenge: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep('contact');
      setName(''); setEmail(''); setWhatsapp('');
      setAccepted(false);
      setSurvey({ goal: '', level: '', days: '', challenge: '' });
      setError('');
    }, 300);
  }

  function handleContactNext(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Por favor ingresa tu nombre.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Por favor ingresa un email válido.'); return; }
    if (!whatsapp.trim()) { setError('Por favor ingresa tu número de WhatsApp.'); return; }
    if (!accepted) { setError('Debes aceptar recibir contenido de Entrena con Ciencia.'); return; }
    setError('');
    setStep('survey');
  }

  async function handleSurveySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey.goal || !survey.level || !survey.days || !survey.challenge) {
      setError('Por favor responde todas las preguntas.');
      return;
    }
    setError('');
    setSubmitting(true);

    const tracking = getTrackingContext();
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, whatsapp, source: 'Curso', survey, ...tracking }),
    }).catch(() => {});
    fireConversionEvent('Lead', 'Subscribe', { content_name: 'Curso', content_category: 'course' });

    setSubmitting(false);
    setStep('success');
    setTimeout(handleClose, 3500);
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(1,10,20,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-y-auto"
        style={{
          background: CARD_BG,
          border: '1px solid rgba(35,211,255,0.15)',
          maxHeight: '90vh',
        }}
      >
        {/* Cyan accent bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${CYAN} 0%, rgba(35,211,255,0.3) 100%)` }} />

        <div className="p-8">
          <button
            onClick={handleClose}
            className="absolute top-3 right-4 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <CheckCircle size={56} color="#7ED957" strokeWidth={1.5} />
              <h3 className="text-2xl font-extrabold" style={{ color: '#ffffff', fontWeight: 800 }}>
                ¡Estás en la lista!
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Gracias por tu interés y tus respuestas. Te avisaremos en cuanto el curso esté disponible.
              </p>
            </div>
          )}

          {/* Step 1 — Contact */}
          {step === 'contact' && (
            <>
              {/* Progress */}
              <div className="flex gap-1.5 mb-6 mt-4">
                <div className="flex-1 h-1 rounded-full" style={{ background: CYAN }} />
                <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>

              <h3 className="text-2xl font-extrabold mb-1" style={{ color: '#ffffff', fontWeight: 800 }}>
                Únete al curso
              </h3>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Te avisamos cuando esté listo. Primero cuéntanos quién eres.
              </p>

              <form onSubmit={handleContactNext} className="flex flex-col gap-4">
                <input
                  type="text" placeholder="Tu nombre" value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = CYAN)}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <input
                  type="email" placeholder="tu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = CYAN)}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <input
                  type="tel" placeholder="WhatsApp (ej. +1 555 123 4567)" value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = CYAN)}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 flex-shrink-0"
                    style={{ accentColor: CYAN }}
                  />
                  <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Acepto recibir contenido educativo y recursos de{' '}
                    <strong style={{ color: CYAN }}>Entrena con Ciencia</strong>
                  </span>
                </label>

                {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

                <button
                  type="submit"
                  className="w-full py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 mt-1"
                  style={{ background: `linear-gradient(135deg, ${YELLOW} 0%, #FFDC6B 100%)`, color: NAVY, fontWeight: 800 }}
                >
                  Continuar <ChevronRight size={16} />
                </button>
              </form>
            </>
          )}

          {/* Step 2 — Survey */}
          {step === 'survey' && (
            <>
              {/* Progress */}
              <div className="flex gap-1.5 mb-6 mt-4">
                <div className="flex-1 h-1 rounded-full" style={{ background: CYAN }} />
                <div className="flex-1 h-1 rounded-full" style={{ background: CYAN }} />
              </div>

              <h3 className="text-2xl font-extrabold mb-1" style={{ color: '#ffffff', fontWeight: 800 }}>
                Cuéntanos un poco más
              </h3>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Así podemos diseñar el curso a tu medida.
              </p>

              <form onSubmit={handleSurveySubmit} className="flex flex-col gap-5">
                <div>
                  <Label>¿Cuál es tu objetivo principal?</Label>
                  <ChipGroup options={GOALS} value={survey.goal} onChange={(v) => setSurvey((s) => ({ ...s, goal: v }))} />
                </div>
                <div>
                  <Label>¿Cuál es tu nivel de experiencia?</Label>
                  <ChipGroup options={LEVELS} value={survey.level} onChange={(v) => setSurvey((s) => ({ ...s, level: v }))} />
                </div>
                <div>
                  <Label>¿Cuántos días a la semana puedes entrenar?</Label>
                  <ChipGroup options={DAYS} value={survey.days} onChange={(v) => setSurvey((s) => ({ ...s, days: v }))} />
                </div>
                <div>
                  <Label>¿Qué es lo que más te cuesta?</Label>
                  <ChipGroup options={CHALLENGES} value={survey.challenge} onChange={(v) => setSurvey((s) => ({ ...s, challenge: v }))} />
                </div>

                {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

                <button
                  type="submit" disabled={submitting}
                  className="w-full py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${YELLOW} 0%, #FFDC6B 100%)`, color: NAVY, fontWeight: 800 }}
                >
                  {submitting ? 'Enviando…' : 'Unirme al curso'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
