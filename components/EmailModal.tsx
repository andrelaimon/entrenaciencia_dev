'use client';

import { useState, useEffect } from 'react';
import { X, Mail, CheckCircle } from 'lucide-react';

type ModalKind = 'pdf' | 'course';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  kind?: ModalKind;
}

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
        <span style={{ color: '#224277' }}>email</span>
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
        <span style={{ color: '#224277' }}>curso</span> esté listo
      </>
    ),
    ctaLabel: 'Notificarme',
    successHeading: '¡Estás en la lista!',
    successBody: 'Te avisaremos en cuanto el curso esté disponible. ¡Gracias por tu interés!',
  },
};

export default function EmailModal({ isOpen, onClose, title, kind = 'pdf' }: EmailModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const copy = COPY[kind];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa tu nombre.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un email válido.');
      return;
    }
    if (!whatsapp.trim()) {
      setError('Por favor ingresa tu número de WhatsApp.');
      return;
    }
    if (!accepted) {
      setError('Debes aceptar recibir contenido de Entrena con Ciencia.');
      return;
    }
    setError('');

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, whatsapp, source: title ?? null }),
    }).catch(() => {});

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

  const inputStyle = {
    border: '2px solid #e5e7eb',
    color: '#1A1A2E',
    outline: 'none',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 22, 40, 0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ background: 'white' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {submitted ? (
          <div className="text-center py-6 flex flex-col items-center gap-4">
            <CheckCircle size={56} color="#7ED957" strokeWidth={1.5} />
            <h3 className="text-2xl font-extrabold" style={{ color: '#1A1A2E', fontWeight: 800 }}>
              {copy.successHeading}
            </h3>
            <p className="text-gray-500 text-sm">
              {copy.successBody}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
                }}
              >
                <Mail size={26} color="#1A1A2E" />
              </div>
            </div>

            <h3
              className="text-2xl font-extrabold text-center mb-2"
              style={{ color: '#1A1A2E', fontWeight: 800 }}
            >
              {copy.heading}
            </h3>
            {title && (
              <p className="text-center text-sm text-gray-500 mb-6">
                {title}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
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

              {error && (
                <p className="text-red-500 text-xs">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 mt-2"
                style={{
                  background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
                  color: '#1A1A2E',
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
  );
}
