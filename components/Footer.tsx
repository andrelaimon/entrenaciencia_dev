'use client';

export default function Footer() {
  return (
    <>
      {/* Contact / Social */}
      <section className="contact" id="contacto">
        <div className="hex-pattern-light" />
        <div className="section-inner" style={{ maxWidth: '720px' }}>
          <h2>
            Síguenos en<br />
            <span className="accent">nuestras redes</span>
          </h2>
          <p className="lead">
            Si te gusta el contenido basado en evidencia,<br />
            síguenos en nuestras redes sociales.
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="contact-iso" src="/images/isotipo-teal.png" alt="Entrena con Ciencia" />

          <div className="social-links">
            {/* Instagram */}
            <a href="https://www.instagram.com/entrena.con.ciencia?igsh=MTFpa25weDdldjJ0aw==" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.44c-3.14 0-3.51.01-4.74.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.26.82-.38.38-.62.75-.82 1.26-.15.39-.33.97-.38 2.04-.06 1.23-.07 1.6-.07 4.74s.01 3.51.07 4.74c.05 1.07.23 1.65.38 2.04.2.51.44.88.82 1.26.38.38.75.62 1.26.82.39.15.97.33 2.04.38 1.23.06 1.6.07 4.74.07s3.51-.01 4.74-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.26-.82.38-.38.62-.75.82-1.26.15-.39.33-.97.38-2.04.06-1.23.07-1.6.07-4.74s-.01-3.51-.07-4.74c-.05-1.07-.23-1.65-.38-2.04-.2-.51-.44-.88-.82-1.26-.38-.38-.75-.62-1.26-.82-.39-.15-.97-.33-2.04-.38-1.23-.06-1.6-.07-4.74-.07zM12 6.85a5.15 5.15 0 1 1 0 10.3 5.15 5.15 0 0 1 0-10.3zm0 1.44a3.71 3.71 0 1 0 0 7.42 3.71 3.71 0 0 0 0-7.42zm5.31-2.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" />
              </svg>
            </a>
            {/* TikTok */}
            <a href="https://www.tiktok.com/@entrenaciencia?_r=1&_t=ZP-96B7l1XNW8t" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <svg viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.84a8.16 8.16 0 0 0 4.77 1.52V6.92a4.85 4.85 0 0 1-1.84-.23z" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <footer>
        <p>© 2026 Entrena con Ciencia. Todos los derechos reservados.</p>
      </footer>
    </>
  );
}
