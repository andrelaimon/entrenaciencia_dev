'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, CheckCircle } from 'lucide-react';
import { getTrackingContext } from '@/lib/tracking';
import { fireConversionEvent } from '@/lib/pixel';

type ModalKind = 'pdf' | 'course';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  kind?: ModalKind;
}

const CARD_BG = '#0d1f35';
const CYAN    = '#23D3FF';
const YELLOW  = '#FFC300';
const NAVY    = '#010d15';

const COPY: Record<ModalKind, {
  heading: React.ReactNode;
  ctaLabel: string;
  successHeading: string;
  successBody: string;
}> = {
  pdf: {
    heading: (
      <>
        Te enviaremos el PDF a tu{' '}
        <span style={{ color: CYAN }}>email</span>
      </>
    ),
    ctaLabel: 'Solicitar PDF',
    successHeading: '¡Solicitud recibida!',
    successBody: 'Te enviaremos el PDF a tu email muy pronto. ¡Gracias por unirte a la comunidad!',
  },
  course: {
    heading: (
      <>
        Te avisaremos cuando el{' '}
        <span style={{ color: CYAN }}>curso</span> esté listo
      </>
    ),
    ctaLabel: 'Notificarme',
    successHeading: '¡Estás en la lista!',
    successBody: 'Te avisaremos en cuanto el curso esté disponible. ¡Gracias por tu interés!',
  },
};

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

export default function EmailModal({ isOpen, onClose, title, kind = 'pdf' }: EmailModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const copy = COPY[kind];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Por favor ingresa tu nombre.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Por favor ingresa un email válido.'); return; }
    if (!whatsapp.trim()) { setError('Por favor ingresa tu número de WhatsApp.'); return; }
    if (!accepted) { setError('Debes aceptar recibir contenido de Entrena con Ciencia.'); return; }
    setError('');

    const tracking = getTrackingContext();
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, whatsapp, source: title ?? null, ...tracking }),
    }).catch(() => {});
    fetch('/api/resource-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'form_submit', resource_title: title ?? null, resource_kind: kind, name, email, ...tracking }),
    }).catch(() => {});
    fireConversionEvent('Lead', 'Subscribe', { content_name: title ?? kind, content_category: kind });

    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setName('');
      setEmail('');
      setWhatsapp('');
      setAccepted(false);
    }, 3000);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(1,10,20,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
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

        <div className="p-5 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-3 right-4 transition-colors"
            style={{ color: '#ffffff' }}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

          {submitted ? (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <CheckCircle size={56} color="#7ED957" strokeWidth={1.5} />
              <h3 className="text-2xl font-extrabold" style={{ color: '#ffffff', fontWeight: 800 }}>
                {copy.successHeading}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#ffffff' }}>
                {copy.successBody}
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-6 mt-2">
                <div
                  className="w-16 h-16 flex items-center justify-center"
                  style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                    background: CYAN,
                  }}
                >
                  <Mail size={26} color={NAVY} />
                </div>
              </div>

              <h3
                className="text-2xl font-extrabold text-center mb-2"
                style={{ color: '#ffffff', fontWeight: 800 }}
              >
                {copy.heading}
              </h3>
              {title && (
                <p className="text-center text-sm mb-6" style={{ color: '#ffffff' }}>
                  {title}
                </p>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
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
                  <span className="text-xs leading-relaxed" style={{ color: '#ffffff' }}>
                    Acepto recibir contenido educativo y recursos de{' '}
                    <strong style={{ color: CYAN }}>Entrena con Ciencia</strong>
                  </span>
                </label>

                {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

                <button
                  type="submit"
                  className="w-full py-3 text-sm font-bold rounded-md flex items-center justify-center gap-2 mt-2"
                  style={{
                    background: `linear-gradient(135deg, ${YELLOW} 0%, #FFDC6B 100%)`,
                    color: NAVY,
                    fontWeight: 800,
                  }}
                >
                  <Mail size={16} />
                  {copy.ctaLabel}
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
