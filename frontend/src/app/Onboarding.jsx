import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Loader2, ArrowRight, AlertCircle, Info, RefreshCw } from 'lucide-react'
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
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { usuario, cv_file, assessment }

  const handleUploadClick = () => {
    if (!uploading) fileInputRef.current?.click()
  }

  const processFile = async (file) => {
    if (!file || uploading) return

    // Pre-validaciones QA en cliente antes de enviar la petición
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

  const handleFileChange = (e) => {
    processFile(e.target.files?.[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!uploading) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (!uploading && e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0])
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

          {/* Aviso de compatibilidad de PDF */}
          <div style={{
            background: '#fefce8',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            fontSize: 'var(--fs-sm)',
            color: '#92400e',
            lineHeight: 1.5
          }}>
            <strong>Nota sobre tu PDF:</strong> Soportamos hojas de vida diseñadas (Canva, Word, doble columna, español o inglés) siempre que tengan texto digital seleccionable. <em>Para documentos extensos, se procesarán automáticamente las primeras 5 páginas.</em>
          </div>

          {!result && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
              <div
                className={`cv-dropzone ${uploading ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
                onClick={uploading ? undefined : handleUploadClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {uploading ? (
                  <>
                    <div style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      background: '#dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.35rem'
                    }}>
                      <Loader2 size={30} className="animate-spin" style={{ color: 'var(--c-blue-dark)' }} />
                    </div>
                    <span className="cv-dropzone-text" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--c-blue-dark)' }}>
                      Leyendo tu CV y ejecutando el análisis con IA…
                    </span>
                    <span className="cv-dropzone-subtext">
                      Puede tardar entre 15 y 30 segundos mientras evaluamos tus fortalezas y completamos tu perfil. Por favor no cierres la ventana.
                    </span>
                    <div className="cv-dropzone-progress-bar">
                      <div className="cv-dropzone-progress-bar-fill" />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.35rem'
                    }}>
                      <UploadCloud size={30} style={{ color: 'var(--c-blue-dark)' }} />
                    </div>
                    <span className="cv-dropzone-text">
                      <strong>Haz clic aquí</strong> o arrastra tu CV en formato PDF
                    </span>
                    <span className="cv-dropzone-subtext">
                      Se llenará tu perfil automáticamente y verás tu evaluación integral de reclutador.
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#94a3b8',
                      background: '#f8fafc',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      border: '1px solid #e2e8f0',
                      marginTop: '0.25rem'
                    }}>
                      Máximo 25 MB • Documento PDF
                    </span>
                  </>
                )}
              </div>
              {error && (
                <div role="alert" style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem 1rem',
                  color: 'var(--c-red)',
                  fontSize: 'var(--fs-sm)',
                  lineHeight: 1.6
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={15} /> Error al procesar el CV
                  </div>
                  <div>{error}</div>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    style={{
                      marginTop: '0.75rem',
                      background: 'var(--c-red)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '0.35rem 0.85rem',
                      fontSize: 'var(--fs-xs)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <RefreshCw size={13} /> Seleccionar otro archivo o reintentar
                  </button>
                </div>
              )}
            </>
          )}

          {result && (
            <>
              {result.aviso && (
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
                  gap: '0.5rem'
                }}>
                  <Info size={18} style={{ flexShrink: 0 }} />
                  <div>{result.aviso}</div>
                </div>
              )}
              <AssessmentResult respuesta={result.assessment?.respuesta_json} pdfUrl={result.assessment?.pdf_url} />
              <button className="btn-auth-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => navigate('/profile')}>
                Revisar y Completar mi Perfil Maestro <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
