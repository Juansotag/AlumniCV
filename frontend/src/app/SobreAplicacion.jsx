import React from 'react'

export default function SobreAplicacion() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h1>Sobre AlumniCV</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 'var(--fs-md)' }}>
          Herramienta institucional del GovLab y la Dirección de Alumni de la Universidad de La Sabana.
        </p>
      </div>

      {/* Tarjeta 1: Visión General */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>¿Qué es AlumniCV y para qué sirve?</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong>AlumniCV</strong> es una plataforma diseñada para potenciar la empleabilidad de los estudiantes y egresados de la <strong>Universidad de La Sabana</strong>. Permite estructurar la hoja de vida, recibir una auditoría técnica tipo reclutador (Recruiter Assessment), buscar vacantes públicas en tiempo real en LinkedIn, calcular la afinidad del perfil y generar documentos personalizados de postulación (.docx).
        </p>
      </div>

      {/* Tarjeta 2: Profundización Técnica — Extracción en LinkedIn */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>1. ¿Cómo extrae los datos de LinkedIn en tiempo real?</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          La extracción se realiza mediante un <strong>scraper ligero de alto rendimiento</strong> construido en Node.js que consulta las vistas públicas de empleo de LinkedIn (<em>LinkedIn Guest Jobs API</em>), <strong>sin requerir inicio de sesión ni exponer credenciales personales</strong>:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--c-blue-dark)', fontSize: 'var(--fs-sm)' }}>Endpoint Público &amp; Peticiones HTTP</strong>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              Consulta las URLs públicas <code>/jobs-guest/jobs/api/seeMoreJobPostings/search</code> enviando encabezados de navegador real (User-Agents dinámicos). Esto evita ejecutar navegadores pesados (Chromium/Selenium), logrando resultados en milisegundos sin consumir memoria excesiva.
            </p>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--c-blue-dark)', fontSize: 'var(--fs-sm)' }}>Extracción Estructurada HTML (Cheerio)</strong>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              Procesa el árbol DOM devuelto para aislar selectores específicos: puesto (<code>.base-search-card__title</code>), empresa (<code>.base-search-card__subtitle</code>), ubicación, fecha de publicación (<code>time</code>) y el Job ID único para generar enlaces directos y consultar la descripción completa y número de postulantes.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta 3: Profundización Técnica — Algoritmo del Score */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>2. ¿Cómo se construye el Score de Compatibilidad (%)?</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          El score de afinidad es un <strong>algoritmo determinista continuo</strong> ejecutado en el servidor Node.js en milisegundos. Evalúa 4 componentes clave comparando los datos de tu perfil registrados en la base de datos contra el texto de la oferta:
        </p>

        <div style={{ background: 'var(--c-blue-tint)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-sm)', color: 'var(--c-blue-dark)', fontWeight: 700, fontSize: 'var(--fs-sm)' }}>
          Fórmula: Score Total = Base (42.0 pts) + Match Habilidades (hasta 30 pts) + Match Experiencia (hasta 25 pts) + Match Educación (hasta 10 pts) ± Dispersión Hash (6%)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: 'var(--fs-sm)' }}>
          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--c-blue-dark)' }}>Match de Habilidades Técnicas (Hasta 30 pts)</strong>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              Las 3 habilidades principales de tu perfil tienen mayor peso (<strong>+7.5 pts</strong> cada una). Las habilidades secundarias aportan <strong>+4.0 pts</strong> cada una al encontrarse en la vacante.
            </p>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--c-blue-dark)' }}>Match de Cargos y Experiencia (Hasta 25 pts)</strong>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              Se comparan las palabras clave de tus cargos laborales anteriores contra el título y rol buscado (<strong>+4.5 pts</strong> por término relevante).
            </p>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--c-blue-dark)' }}>Match Académico (Hasta 10 pts)</strong>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              Aporta <strong>+10.0 pts</strong> si tu título o área de conocimiento (ej. <em>Analítica, Economía, Ingeniería</em>) coincide con los requerimientos académicos.
            </p>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <strong style={{ color: 'var(--c-blue-dark)' }}>Micro-Dispersión Única por Hash (± 6%)</strong>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
              Aplica un ajuste determinista según el ID único de la vacante para evitar porcentajes planos o repetidos en ofertas similares, logrando una distribución realista (ej. <strong>94.2%</strong>, <strong>87.5%</strong>, <strong>76.1%</strong>).
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta 4: Gestión de Tokens IA */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>3. Uso de la IA (Anthropic Claude) vs Procesos Gratuitos</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span className="badge badge-blue" style={{ fontWeight: 700 }}>Consumen Tokens (Anthropic Claude API)</span>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li><strong>Carga y Assessment de CV:</strong> Extrae la estructura profesional del PDF y realiza el análisis técnico tipo reclutador.</li>
              <li><strong>Redacción de Documentos (.docx):</strong> Adapta el perfil a vacantes específicas y redacta cartas de presentación y correos.</li>
            </ul>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span className="badge badge-green" style={{ fontWeight: 700 }}>100% Gratis (Procesamiento Local)</span>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li><strong>Búsqueda en LinkedIn y Scoring (%):</strong> Extracción de vacantes y cálculo del score en milisegundos sin consumir tokens.</li>
              <li><strong>Pipeline Tracker:</strong> Seguimiento visual interactivo guardado en base de datos.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
