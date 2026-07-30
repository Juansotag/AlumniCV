import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import Header from '../components/Header.jsx'
import AssessmentResult from '../components/AssessmentResult.jsx'

/**
 * Onboarding: subir el CV, dejar que el LLM llene el perfil y corra el
 * assessment de reclutador, y mostrar el resultado antes de entrar al dashboard.
 */
export default function Onboarding() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { usuario, cv_file, assessment }

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)

    const formData = new FormData()
    formData.append('cv', file)

    try {
      const data = await apiFetch('/cv/upload', {
        method: 'POST',
        body: formData,
      })
      setResult(data)
    } catch (err) {
      setError('No se pudo procesar el CV: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="app-shell">
      <Header />
      <div className="workspace" style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div style={{ maxWidth: 680, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>Sube tu hoja de vida</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              La analizamos como lo haría un reclutador y llenamos tu perfil automáticamente. Solo PDF por ahora.
            </p>
          </div>

          {!result && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
              <div className={`cv-dropzone ${uploading ? 'active' : ''}`} onClick={uploading ? undefined : handleUploadClick}>
                {uploading ? (
                  <>
                    <Loader2 size={36} className="animate-spin" style={{ color: 'var(--c-blue-light)' }} />
                    <span className="cv-dropzone-text" style={{ fontWeight: 600 }}>Leyendo tu CV y corriendo el assessment…</span>
                    <span className="cv-dropzone-subtext">Puede tardar hasta un minuto.</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={36} style={{ color: 'var(--c-blue-soft)' }} />
                    <span className="cv-dropzone-text"><strong>Haz clic aquí</strong> para subir tu CV (PDF)</span>
                    <span className="cv-dropzone-subtext">Se llenará tu perfil y verás tu análisis de reclutador.</span>
                  </>
                )}
              </div>
              {error && (
                <p role="alert" style={{ color: 'var(--c-red)', fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={15} /> {error}
                </p>
              )}
            </>
          )}

          {result && (
            <>
              <AssessmentResult respuesta={result.assessment?.respuesta_json} pdfUrl={result.assessment?.pdf_url} />
              <button className="btn-auth-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => navigate('/dashboard')}>
                Continuar a AlumniCV <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
