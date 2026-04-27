'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import CourseModal from './CourseModal';

function LogoWithFallback() {
  const [imgFailed, setImgFailed] = useState(false);

  if (!imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/images/logo.png"
        alt="Entrena con Ciencia"
        className="h-10 w-auto"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span className="flex flex-col leading-tight">
      <span className="text-white font-medium text-sm tracking-widest uppercase">
        ENTRENA CON
      </span>
      <span
        className="font-black text-xl tracking-wider uppercase"
        style={{ color: '#23D3FF', fontWeight: 800 }}
      >
        CIENCIA
      </span>
    </span>
  );
}

const navLinks = [
  { href: '/#inicio', label: 'Inicio' },
  { href: '#', label: 'Quiénes somos' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '#', label: 'Curso' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(10, 22, 40, 0.85)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/#inicio" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <LogoWithFallback />
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => setCourseModalOpen(true)}
            className="btn-gold px-5 py-2 text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
              color: '#1A1A2E',
              borderRadius: '50px',
              fontWeight: 800,
            }}
          >
            Unirme al curso
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-6 pb-6 flex flex-col gap-4"
          style={{ background: 'rgba(10, 22, 40, 0.97)' }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-white/80 hover:text-white text-base font-medium py-2 border-b border-white/10"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setCourseModalOpen(true); }}
            className="mt-2 text-center px-5 py-3 text-sm font-bold rounded-full"
            style={{
              background: 'linear-gradient(135deg, #FFC300 0%, #FFDC6B 100%)',
              color: '#1A1A2E',
            }}
          >
            Unirme al curso
          </button>
        </div>
      )}

      <CourseModal isOpen={courseModalOpen} onClose={() => setCourseModalOpen(false)} />
    </nav>
  );
}
