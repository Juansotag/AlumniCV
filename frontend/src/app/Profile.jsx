import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UploadCloud, Loader2, AlertCircle, Info, RefreshCw } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import Header from '../components/Header.jsx'
import AssessmentResult from '../components/AssessmentResult.jsx'

function ListSection({ titulo, items, render }) {
  if (!items || items.length === 0) return null
  return (
    <div className="card">
      <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>{titulo}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map((item, i) => <div key={i}>{render(item)}</div>)}
      </div>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const usuario = profile?.usuario
  const assessment = profile?.ultimo_assessment

  const handleReuploadClick = () => {
    if (!uploading) fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || uploading) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor selecciona un archivo en formato PDF (.pdf).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size < 500) {
      setError('El archivo seleccionado parece estar vacío o dañado (menos de 500 bytes).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('El archivo supera el tamaño máximo permitido de 25 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setError('')
    setAviso('')
    setUploading(true)
    const formData = new FormData()
    formData.append('cv', file)
    try {
      const data = await apiFetch('/cv/upload', { method: 'POST', body: formData })
      if (data?.aviso) {
        setAviso(data.aviso)
      }
      await refreshProfile()
    } catch (err) {
      setError('No se pudo procesar el CV: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!usuario) return null

  return (
    <div className="app-shell">
      <Header />
      <div className="workspace">
        <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <button
            onClick={() => navigate('/dashboard/mis-procesos')}
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--c-blue-light)', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Volver a Procesos
          </button>

          <div className="card">
            <h1 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>{usuario.nombre ?? usuario.correo}</h1>
            <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)' }}>{usuario.correo}</p>
            {usuario.resumen && <p style={{ margin: 0 }}>{usuario.resumen}</p>}
          </div>

          {/* Reintentar assessment subiendo un CV nuevo */}
          <div className="card">
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Actualizar CV y reintentar assessment</h3>
            <p style={{ margin: '0 0 0.5rem', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              Subir un CV nuevo reescribe todos los campos de tu perfil y genera un assessment nuevo con IA.
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Soportamos hojas de vida en español o inglés, con diseño o doble columna (máximo 5 páginas analizadas).
            </p>

            {aviso && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                color: '#1e40af',
                fontSize: 'var(--fs-sm)',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <Info size={18} style={{ flexShrink: 0 }} />
                <div>{aviso}</div>
              </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
            <button
              className="btn-auth-submit"
              style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
              onClick={handleReuploadClick}
              disabled={uploading}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {uploading ? 'Leyendo CV con IA… (puede tardar hasta 30s)' : 'Subir CV nuevo'}
            </button>
            {error && (
              <div role="alert" style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                color: 'var(--c-red)',
                fontSize: 'var(--fs-sm)',
                marginTop: '0.75rem',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                  <AlertCircle size={15} /> Error al procesar el CV
                </div>
                <div>{error}</div>
              </div>
            )}
          </div>

          <ListSection titulo="Experiencia" items={usuario.experiencia} render={exp => (
            <div>
              <strong>{exp.cargo}</strong> — {exp.empresa} <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>({exp.desde} – {exp.hasta ?? 'presente'})</span>
              {exp.descripcion && <p style={{ margin: '0.2rem 0 0', fontSize: 'var(--fs-sm)' }}>{exp.descripcion}</p>}
            </div>
          )} />

          <ListSection titulo="Educación formal" items={usuario.educacion_formal} render={edu => (
            <div><strong>{edu.titulo}</strong> — {edu.institucion} <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>({edu.desde} – {edu.hasta ?? '—'})</span></div>
          )} />

          <ListSection titulo="Certificaciones" items={usuario.certificaciones} render={cert => (
            <div>
              <strong>{cert.nombre}</strong> — {cert.entidad_emisora}
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                {' '}({cert.fecha_emision ?? '—'}{cert.fecha_vencimiento ? ` – ${cert.fecha_vencimiento}` : ''})
                {cert.id_credencial ? ` · ID: ${cert.id_credencial}` : ''}
              </span>
            </div>
          )} />

          <ListSection titulo="Formación no formal" items={usuario.formacion_no_formal} render={f => (
            <div><strong>{f.nombre}</strong> — {f.institucion} <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>({f.fecha ?? '—'})</span></div>
          )} />

          {usuario.idiomas?.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>Idiomas</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {usuario.idiomas.map((idi, i) => <span key={i} className="badge badge-blue">{idi.idioma} · {idi.nivel}</span>)}
              </div>
            </div>
          )}

          {usuario.habilidades_tecnicas?.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>Habilidades técnicas</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {usuario.habilidades_tecnicas.map((h, i) => <span key={i} className="badge badge-blue">{h.nombre}</span>)}
              </div>
            </div>
          )}

          {usuario.habilidades_blandas?.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>Habilidades blandas</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {usuario.habilidades_blandas.map((h, i) => <span key={i} className="badge badge-green">{h}</span>)}
              </div>
            </div>
          )}

          {assessment && (
            <>
              <h2 style={{ margin: '0.5rem 0 0', color: 'var(--text-primary)' }}>Último assessment</h2>
              <AssessmentResult respuesta={assessment.respuesta_json} pdfUrl={assessment.pdf_url} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
