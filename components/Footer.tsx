'use client';

import { Share2, Play, AtSign, Mail } from 'lucide-react';

const quickLinks = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#calculadora', label: 'Calculadora' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#contacto', label: 'Contacto' },
];

const socials = [
  { icon: Share2, href: '#', label: 'Instagram' },
  { icon: Play, href: '#', label: 'YouTube' },
  { icon: AtSign, href: '#', label: 'X (Twitter)' },
  { icon: Mail, href: '#', label: 'Email' },
];

export default function Footer() {
  return (
    <footer
      id="contacto"
      className="relative overflow-hidden"
      style={{ background: '#0A1628' }}
    >
      {/* Hex pattern */}
      <div
        className="hex-pattern absolute inset-0 pointer-events-none"
        style={{ opacity: 0.04 }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-white font-medium text-sm tracking-widest uppercase">
                ENTRENA CON
              </p>
              <p
                className="font-black text-2xl tracking-wider uppercase"
                style={{ color: '#23D3FF', fontWeight: 800 }}
              >
                CIENCIA
              </p>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Transformamos cuerpos con estrategias basadas en evidencia científica. Sin mitos,
              sin atajos — solo resultados reales.
            </p>
            {/* Social icons */}
            <div className="flex gap-4 mt-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(35,211,255,0.15)';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#23D3FF';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)';
                  }}
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
              Enlaces rápidos
            </h4>
            <ul className="flex flex-col gap-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-white/50 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
              Contacto
            </h4>
            <div className="flex flex-col gap-3 text-white/50 text-sm">
              <p>¿Tienes preguntas o quieres colaborar?</p>
              <a
                href="mailto:hola@entrenaconciencia.com"
                className="hover:text-white transition-colors"
                style={{ color: '#23D3FF' }}
              >
                hola@entrenaconciencia.com
              </a>
              <p className="mt-4 leading-relaxed">
                Síguenos en redes sociales para recibir tips diarios de entrenamiento y nutrición.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px mb-8"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-white/30 text-xs">
          <p>© 2026 Entrena con Ciencia. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white/60 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white/60 transition-colors">Términos</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
