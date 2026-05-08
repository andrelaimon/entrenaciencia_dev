export default function PillarsSection() {
  return (
    <section className="pillars" id="metodo">
      <div className="hex-pattern-subtle" />
      <div className="section-inner" style={{ textAlign: 'center' }}>
        <span className="eyebrow">Quiénes somos</span>
        <h2>¿Qué es <span className="accent">Entrena con Ciencia</span>?</h2>
        <p className="lead pillars-lead">
          Para tener resultados que perduran, tu entrenamiento y nutrición deben estar basados en estos tres pilares.
        </p>

        <div className="pillars-stage">
          <div className="pillars-iso-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pillars-iso" src="/images/isotipo-cyan.png" alt="Entrena con Ciencia" />
          </div>

          <div className="pillars-row">
            <div className="pillar">
              <div className="pillar-hex">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3>Evidencia Científica</h3>
              <p>Revisamos los últimos estudios para construir nuestro sistema de entrenamiento y nutrición. Así te damos recomendaciones óptimas, no opiniones disfrazadas de hechos.</p>
            </div>

            <div className="pillar">
              <div className="pillar-hex">
                <svg viewBox="0 0 24 24">
                  <path d="M3 21h18" />
                  <path d="M5 21V8l7-5 7 5v13" />
                  <path d="M9 21v-6h6v6" />
                </svg>
              </div>
              <h3>Fundamentos Sólidos</h3>
              <p>Cada persona está en un punto distinto de su desarrollo. Te ayudamos a construir las bases que necesitas para entrenar de manera sofisticada. Sin fundamentos sólidos, no hay resultados.</p>
            </div>

            <div className="pillar">
              <div className="pillar-hex">
                <svg viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>Resultados Efectivos</h3>
              <p>El cambio físico viene de un cambio de estilo de vida. Por eso atacamos también la psicología — adherencia y disciplina — para que los cambios sean reales y sostenibles.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
