'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, ChevronRight } from 'lucide-react';

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

const inputStyle = {
  border: '2px solid #e5e7eb',
  color: '#1A1A2E',
  outline: 'none',
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
              background: active ? 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)' : '#F3F8FC',
              color: active ? '#1A1A2E' : '#4B5563',
              border: active ? '2px solid #FFC300' : '2px solid transparent',
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

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, whatsapp, source: 'Curso', survey }),
    }).catch(() => {});

    setSubmitting(false);
    setStep('success');

    setTimeout(handleClose, 3500);
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 22, 40, 0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-y-auto"
        style={{ background: 'white', maxHeight: '90vh' }}
      >
        {/* Gold accent bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #FFC300 0%, #FFDC6B 100%)' }} />

        <div className="p-8">
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

          {step === 'success' && (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <CheckCircle size={56} color="#7ED957" strokeWidth={1.5} />
              <h3 className="text-2xl font-extrabold" style={{ color: '#1A1A2E', fontWeight: 800 }}>
                ¡Estás en la lista!
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Gracias por tu interés y tus respuestas. Te avisaremos en cuanto el curso esté disponible.
              </p>
            </div>
          )}

          {step === 'contact' && (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#FFC300', color: '#1A1A2E' }}>1</span>
                <div className="flex-1 h-0.5" style={{ background: '#e5e7eb' }} />
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#e5e7eb', color: '#9ca3af' }}>2</span>
              </div>

              <h3 className="text-2xl font-extrabold mb-1" style={{ color: '#1A1A2E', fontWeight: 800 }}>
                Únete al curso
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Te avisamos cuando esté listo. Primero cuéntanos quién eres.
              </p>

              <form onSubmit={handleContactNext} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#23D3FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#23D3FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (ej. +1 555 123 4567)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#23D3FF')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    Acepto recibir contenido educativo y recursos de{' '}
                    <strong style={{ color: '#224277' }}>Entrena con Ciencia</strong>
                  </span>
                </label>

                {error && <p className="text-red-500 text-xs">{error}</p>}

                <button
                  type="submit"
                  className="w-full py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 mt-1"
                  style={{
                    background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
                    color: '#1A1A2E',
                    fontWeight: 800,
                  }}
                >
                  Continuar
                  <ChevronRight size={16} />
                </button>
              </form>
            </>
          )}

          {step === 'survey' && (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#7ED957', color: 'white' }}>✓</span>
                <div className="flex-1 h-0.5" style={{ background: '#FFC300' }} />
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#FFC300', color: '#1A1A2E' }}>2</span>
              </div>

              <h3 className="text-2xl font-extrabold mb-1" style={{ color: '#1A1A2E', fontWeight: 800 }}>
                Cuéntanos un poco más
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Así podemos diseñar el curso a tu medida.
              </p>

              <form onSubmit={handleSurveySubmit} className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#1A1A2E' }}>
                    ¿Cuál es tu objetivo principal?
                  </p>
                  <ChipGroup options={GOALS} value={survey.goal} onChange={(v) => setSurvey((s) => ({ ...s, goal: v }))} />
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#1A1A2E' }}>
                    ¿Cuál es tu nivel de experiencia?
                  </p>
                  <ChipGroup options={LEVELS} value={survey.level} onChange={(v) => setSurvey((s) => ({ ...s, level: v }))} />
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#1A1A2E' }}>
                    ¿Cuántos días a la semana puedes entrenar?
                  </p>
                  <ChipGroup options={DAYS} value={survey.days} onChange={(v) => setSurvey((s) => ({ ...s, days: v }))} />
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#1A1A2E' }}>
                    ¿Qué es lo que más te cuesta?
                  </p>
                  <ChipGroup options={CHALLENGES} value={survey.challenge} onChange={(v) => setSurvey((s) => ({ ...s, challenge: v }))} />
                </div>

                {error && <p className="text-red-500 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
                    color: '#1A1A2E',
                    fontWeight: 800,
                  }}
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
