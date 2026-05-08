'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import CourseModal from './CourseModal';

const navLinks = [
  { href: '/#inicio', label: 'Inicio' },
  { href: '#', label: 'Quiénes somos' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '#', label: 'Contacto' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  return (
    <nav>
      <a href="/#inicio" className="nav-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="iso" src="/images/isotipo-cyan.png" alt="Entrena con Ciencia" />
        <div className="name">Entrena con <span>Ciencia</span></div>
      </a>

      {/* Desktop */}
      <ul className="nav-links hidden md:flex">
        {navLinks.map((link) => (
          <li key={link.label}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
        <li>
          <button
            type="button"
            className="nav-cta"
            onClick={() => setCourseModalOpen(true)}
          >
            Nuestro curso
          </button>
        </li>
      </ul>

      {/* Mobile hamburger */}
      <button
        className="md:hidden text-white p-2"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden fixed top-[73px] left-0 right-0 px-6 pb-6 flex flex-col gap-4 z-50"
          style={{ background: 'rgba(1, 13, 21, 0.97)', borderTop: '1px solid var(--border-soft)' }}
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
            className="nav-cta mt-2 text-center"
            onClick={() => { setMenuOpen(false); setCourseModalOpen(true); }}
          >
            Nuestro curso
          </button>
        </div>
      )}

      <CourseModal isOpen={courseModalOpen} onClose={() => setCourseModalOpen(false)} />
    </nav>
  );
}
