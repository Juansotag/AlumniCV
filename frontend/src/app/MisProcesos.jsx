import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import PipelineTracker from '../components/PipelineTracker.jsx'

export default function MisProcesos() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortedApps = (apps) => {
    if (!sortConfig.key) return apps
    return [...apps].sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      if (sortConfig.key === 'postulantes') {
        return sortConfig.direction === 'asc'
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal)
      }

      if (sortConfig.key === 'created_at') {
        return sortConfig.direction === 'asc'
          ? new Date(aVal) - new Date(bVal)
          : new Date(bVal) - new Date(aVal)
      }

      aVal = aVal.toString().toLowerCase()
      bVal = bVal.toString().toLowerCase()

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }

  // Modales
  const [showAddModal, setShowAddModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Modal de Generación de Documentos
  const [selectedAppForDoc, setSelectedAppForDoc] = useState(null)
  const [docTypeToGen, setDocTypeToGen] = useState('todos')
  const [generatingDocs, setGeneratingDocs] = useState(false)
  const [generatedResultDocs, setGeneratedResultDocs] = useState(null)

  const [formData, setFormData] = useState({
    empresa: '',
    puesto: '',
    plataforma: 'Manual',
    modalidad: 'hibrido',
    seniority: '',
    ubicacion: 'Bogotá, Colombia',
    salario_expectativa: '',
    postulantes: '',
    link: '',
    descripcion_corta: ''
  })

  const loadApplications = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/applications')
      setApplications(data.applications || [])
    } catch (err) {
      setError('No se pudieron cargar los procesos de selección.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadApplications() }, [])

  const handlePipelineChange = async (appId, newPipeline) => {
    setApplications(prev =>
      prev.map(app => app.id === appId ? { ...app, pipeline: newPipeline } : app)
    )
    try {
      await apiFetch(`/applications/${appId}/pipeline`, {
        method: 'PUT',
        body: JSON.stringify({ pipeline: newPipeline })
      })
    } catch {
      loadApplications()
    }
  }

  const handleDeleteApp = async (appId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este proceso?')) return
    try {
      await apiFetch(`/applications/${appId}`, { method: 'DELETE' })
      setApplications(prev => prev.filter(app => app.id !== appId))
    } catch {
      alert('Error al eliminar el proceso')
    }
  }

  const handleCreateApp = async (e) => {
    e.preventDefault()
    if (!formData.empresa || !formData.puesto) return
    try {
      setCreating(true)
      const res = await apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          postulantes: formData.postulantes ? Number(formData.postulantes) : null
        })
      })
      setApplications(prev => [res.application, ...prev])
      setShowAddModal(false)
      setFormData({
        empresa: '', puesto: '', plataforma: 'Manual', modalidad: 'hibrido',
        seniority: '', ubicacion: 'Bogotá, Colombia', salario_expectativa: '',
        postulantes: '', link: '', descripcion_corta: ''
      })
    } catch {
      alert('Error al crear el proceso')
    } finally {
      setCreating(false)
    }
  }

  const handleGenerateDocs = async (e) => {
    e.preventDefault()
    if (!selectedAppForDoc) return
    try {
      setGeneratingDocs(true)
      const res = await apiFetch('/documents/generate', {
        method: 'POST',
        body: JSON.stringify({ application_id: selectedAppForDoc.id, tipo: docTypeToGen })
      })
      setGeneratedResultDocs(res.documents || [])
    } catch (err) {
      alert('Error al generar documentos: ' + err.message)
    } finally {
      setGeneratingDocs(false)
    }
  }

  const filteredApps = applications.filter(app =>
    app.puesto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.plataforma?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h1>Mis procesos de selección</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 'var(--fs-md)' }}>
            Seguimiento completo de tus postulaciones con historial de fechas y notas por etapa.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-auth-submit" style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
          + Nuevo Proceso Manual
        </button>
      </div>

      {/* Buscador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
        <input
          type="text"
          placeholder="Buscar por cargo, empresa o plataforma..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', padding: 0 }}
        />
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Total: <strong style={{ color: 'var(--text-primary)' }}>{filteredApps.length}</strong>
        </span>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando procesos...</div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--c-red)', color: 'var(--c-red)' }}>{error}</div>
      ) : filteredApps.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <h2>No tienes procesos registrados</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 420 }}>
            Crea un proceso manual o agrega vacantes desde <strong>"Nueva búsqueda"</strong>.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-auth-submit">+ Crear Primer Proceso</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--fs-sm)', minWidth: 1100 }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <th
                  onClick={() => handleSort('puesto')}
                  style={{ padding: '0.8rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                >
                  Puesto / Empresa {sortConfig.key === 'puesto' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('modalidad')}
                  style={{ padding: '0.8rem 0.75rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                >
                  Modalidad / Nivel {sortConfig.key === 'modalidad' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('salario_expectativa')}
                  style={{ padding: '0.8rem 0.75rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                >
                  Salario {sortConfig.key === 'salario_expectativa' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('postulantes')}
                  style={{ padding: '0.8rem 0.75rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                >
                  Postulantes {sortConfig.key === 'postulantes' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  style={{ padding: '0.8rem 0.75rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                >
                  Registrado en {sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '0.8rem 0.75rem', fontWeight: 700 }}>Proceso</th>
                <th style={{ padding: '0.8rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {getSortedApps(filteredApps).map(app => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{app.puesto}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{app.empresa}</div>
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem', marginTop: '2px' }}>{app.plataforma}</span>
                    {app.link && (
                      <a href={app.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.65rem', color: 'var(--c-blue-light)', marginTop: '2px', fontWeight: 600 }}>
                        Ver vacante
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem' }}>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{app.modalidad || '—'}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{app.seniority || '—'}</div>
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                    {app.salario_expectativa || 'No reporta'}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    {app.postulantes ? `${app.postulantes}` : '—'}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {fmtDate(app.created_at)}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem' }}>
                    <PipelineTracker
                      compact={true}
                      hideMessages={true}
                      pipeline={app.pipeline}
                      onChange={newPipeline => handlePipelineChange(app.id, newPipeline)}
                    />
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => { setSelectedAppForDoc(app); setGeneratedResultDocs(null) }}
                      style={{ background: 'var(--c-blue-dark)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', fontWeight: 700, fontSize: 'var(--fs-xs)', marginBottom: '0.35rem', display: 'block', cursor: 'pointer', width: '100%' }}
                    >
                      Generar Docs
                    </button>
                    <button
                      onClick={() => handleDeleteApp(app.id)}
                      style={{ background: 'var(--c-red)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', fontSize: 'var(--fs-xs)', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL GENERAR DOCUMENTOS */}
      {selectedAppForDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,19,91,0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ margin: 0 }}>Generar Documentos .docx</h2>
              <button onClick={() => setSelectedAppForDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-sm)' }}>
              <strong>{selectedAppForDoc.puesto}</strong> — {selectedAppForDoc.empresa}
            </div>
            {!generatedResultDocs ? (
              <form onSubmit={handleGenerateDocs} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Selecciona los documentos a redactar con IA:</label>
                  <select value={docTypeToGen} onChange={e => setDocTypeToGen(e.target.value)}>
                    <option value="todos">Paquete Completo (CV + Carta + Correo)</option>
                    <option value="cv">Solo CV Adaptado (.docx)</option>
                    <option value="cover_letter">Solo Carta de Presentación (.docx)</option>
                    <option value="correo">Solo Correo de Aplicación (.docx)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <button type="button" onClick={() => setSelectedAppForDoc(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--fs-xs)', padding: '0.5rem 1rem' }}>Cancelar</button>
                  <button type="submit" disabled={generatingDocs} className="btn-auth-submit">
                    {generatingDocs ? 'Redactando...' : 'Generar Documentos'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ color: 'var(--c-green)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>¡Documentos generados con éxito!</div>
                {generatedResultDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-xs)' }}>
                    <span>{doc.nombre_archivo}</span>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-blue-dark)', fontWeight: 700 }}>Descargar .docx</a>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <button onClick={() => setSelectedAppForDoc(null)} className="btn-auth-submit" style={{ padding: '0.4rem 1rem', fontSize: 'var(--fs-xs)' }}>Cerrar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CREAR PROCESO MANUAL */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,19,91,0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ margin: 0 }}>Registrar Nuevo Proceso Manual</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleCreateApp} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Cargo / Puesto *</label>
                  <input type="text" required placeholder="Ej. Data Scientist" value={formData.puesto} onChange={e => setFormData({ ...formData, puesto: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Empresa *</label>
                  <input type="text" required placeholder="Ej. Bancolombia" value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label>Plataforma</label>
                  <select value={formData.plataforma} onChange={e => setFormData({ ...formData, plataforma: e.target.value })}>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Computrabajo">Computrabajo</option>
                    <option value="Contacto Directo">Contacto Directo</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Modalidad</label>
                  <select value={formData.modalidad} onChange={e => setFormData({ ...formData, modalidad: e.target.value })}>
                    <option value="presencial">Presencial</option>
                    <option value="hibrido">Híbrido</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nivel Seniority</label>
                  <select value={formData.seniority} onChange={e => setFormData({ ...formData, seniority: e.target.value })}>
                    <option value="">No especificado</option>
                    <option value="practicante">Practicante</option>
                    <option value="junior">Junior</option>
                    <option value="mid_senior">Mid-Senior</option>
                    <option value="director">Director</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label>Salario Esperado</label>
                  <input type="text" placeholder="Ej. $8.000.000" value={formData.salario_expectativa} onChange={e => setFormData({ ...formData, salario_expectativa: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>N° Postulantes</label>
                  <input type="number" placeholder="Ej. 45" value={formData.postulantes} onChange={e => setFormData({ ...formData, postulantes: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ubicación</label>
                  <input type="text" placeholder="Bogotá, Colombia" value={formData.ubicacion} onChange={e => setFormData({ ...formData, ubicacion: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Link a la Vacante</label>
                <input type="url" placeholder="https://linkedin.com/jobs/view/..." value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--fs-xs)', padding: '0.5rem 1rem' }}>Cancelar</button>
                <button type="submit" disabled={creating} className="btn-auth-submit">
                  {creating ? 'Guardando...' : 'Guardar Proceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
