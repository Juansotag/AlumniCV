import { Download, Star, Tag, AlertTriangle, TrendingUp } from 'lucide-react'

/**
 * Renderiza el JSON de un assessment de CV (ver backend/src/llm/cvAssessment.js).
 * Props: { respuesta: {top_puestos, palabras_clave_ats, debilidades, calificacion}, pdfUrl }
 */
export default function AssessmentResult({ respuesta, pdfUrl }) {
  if (!respuesta) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Star size={22} color="var(--c-yellow)" />
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.4rem' }}>
              {respuesta.calificacion?.score ?? '—'} / 10
            </p>
            <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Calificación de tu CV</p>
          </div>
        </div>
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-auth-submit"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', width: 'auto', padding: '0.6rem 1rem' }}>
            <Download size={16} /> Descargar PDF
          </a>
        )}
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>
          <TrendingUp size={16} /> Cómo llegar a 10
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {(respuesta.calificacion?.como_llegar_a_10 ?? []).map((item, i) => (
            <li key={i} style={{ fontSize: 'var(--fs-sm)' }}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>
          <AlertTriangle size={16} /> Debilidades notables en menos de 10 segundos
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {(respuesta.debilidades ?? []).map((item, i) => (
            <li key={i} style={{ fontSize: 'var(--fs-sm)' }}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>
          <Tag size={16} /> Palabras clave ATS a reforzar
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(respuesta.palabras_clave_ats ?? []).map((kw, i) => (
            <span key={i} className="badge badge-blue">{kw}</span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>Los 20 puestos donde mejor encajas</h3>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.3rem 1rem' }}>
          {(respuesta.top_puestos ?? []).map((puesto, i) => (
            <li key={i} style={{ fontSize: 'var(--fs-sm)' }}>{puesto}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
