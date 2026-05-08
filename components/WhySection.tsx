export default function WhySection() {
  return (
    <section className="why" id="why">
      <div className="section-inner">
        <span className="eyebrow">Nuestra filosofía</span>
        <h2>¿Por qué<br /><span className="accent">&ldquo;con ciencia&rdquo;</span>?</h2>

        <div className="why-grid">
          <div className="why-content">
            <div className="why-paragraphs">
              <p>
                <strong>Porque el 90% de lo que escuchas sobre entrenamiento y nutrición es mentira, exageración, o moda.</strong>
              </p>
              <p>
                Nosotros revisamos los estudios y te decimos qué funciona de verdad. Sin vender suplementos. Sin &ldquo;el secreto que nadie te cuenta&rdquo;. Sin dietas milagrosas.
              </p>
              <p>
                Solo lo que la evidencia respalda — explicado simple, para que cualquiera lo entienda.
              </p>
            </div>
          </div>

          <div className="why-visual">
            {/* Scientific paper mockup */}
            <div className="evidence-paper">
              <div className="evidence-paper-header">
                <span className="evidence-doi">DOI: 10.1249/MSS.0000000000001764</span>
                <span className="evidence-journal">J SPORTS SCI · 2017</span>
              </div>
              <div className="evidence-paper-title">
                Dose-response relationship between weekly resistance training volume and muscle hypertrophy
              </div>
              <div className="evidence-paper-authors">Schoenfeld B.J., Ogborn D., Krieger J.W.</div>
              <div className="evidence-paper-meta">
                <span className="evidence-tag">PEER-REVIEWED</span>
                <span className="evidence-tag">META-ANALYSIS</span>
              </div>
              <div className="evidence-abstract">
                <span className="abstract-tag">ABSTRACT</span>
                <span className="ab-line" />
                <span className="ab-line" />
                <span className="ab-line short" />
                <span className="ab-line highlighted" />
                <span className="ab-line" />
              </div>
              <div className="evidence-chart">
                <div className="ev-bar" style={{ height: '35%' }} />
                <div className="ev-bar" style={{ height: '58%' }} />
                <div className="ev-bar" style={{ height: '78%' }} />
                <div className="ev-bar" style={{ height: '90%' }} />
                <div className="ev-bar" style={{ height: '95%' }} />
              </div>
            </div>

            {/* Guru claims mockup */}
            <div className="gurus-mockup">
              <div className="gurus-header">
                <span className="gurus-eyebrow">Lo que ves todos los días</span>
              </div>

              <div className="guru-card guru-card-1">
                <div className="guru-avatar">
                  <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="30" cy="22" r="10" fill="rgba(196, 68, 68, 0.25)" stroke="#c44" strokeWidth="1.5" />
                    <path d="M10 55 Q10 38 30 38 Q50 38 50 55" fill="rgba(196, 68, 68, 0.25)" stroke="#c44" strokeWidth="1.5" />
                  </svg>
                  <div className="guru-badge">@fitguru_</div>
                </div>
                <div className="guru-claim">&ldquo;Cardio en ayunas quema 3x más grasa&rdquo;</div>
              </div>

              <div className="guru-card guru-card-2">
                <div className="guru-avatar">
                  <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="30" cy="22" r="10" fill="rgba(196, 68, 68, 0.25)" stroke="#c44" strokeWidth="1.5" />
                    <path d="M10 55 Q10 38 30 38 Q50 38 50 55" fill="rgba(196, 68, 68, 0.25)" stroke="#c44" strokeWidth="1.5" />
                  </svg>
                  <div className="guru-badge">@coach_xxl</div>
                </div>
                <div className="guru-claim">&ldquo;Si no comes cada 3h se apaga tu metabolismo&rdquo;</div>
              </div>

              <div className="guru-card guru-card-3">
                <div className="guru-avatar">
                  <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="30" cy="22" r="10" fill="rgba(196, 68, 68, 0.25)" stroke="#c44" strokeWidth="1.5" />
                    <path d="M10 55 Q10 38 30 38 Q50 38 50 55" fill="rgba(196, 68, 68, 0.25)" stroke="#c44" strokeWidth="1.5" />
                  </svg>
                  <div className="guru-badge">@nutri_pro</div>
                </div>
                <div className="guru-claim">&ldquo;Los carbohidratos en la noche engordan&rdquo;</div>
              </div>

              <div className="gurus-stamp">
                <span className="stamp-line">EVIDENCIA CIENTÍFICA:</span>
                <span className="stamp-result">FALSO</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
