import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'

export default function MisDocumentos() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
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

  const getSortedDocs = (list) => {
    if (!sortConfig.key) return list
    return [...list].sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

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

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/documents')
      setDocuments(data.documents || [])
    } catch (err) {
      console.error('Error al cargar documentos:', err)
      setError('No se pudieron cargar tus documentos generados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este documento?')) return

    try {
      await apiFetch(`/documents/${docId}`, { method: 'DELETE' })
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      console.error('Error al eliminar documento:', err)
      alert('Error al eliminar el documento')
    }
  }

  const getDocTypeBadge = (tipo) => {
    switch (tipo) {
      case 'cv':
        return {
          label: 'CV Adaptado',
          style: { background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }
        }
      case 'cover_letter':
        return {
          label: 'Carta de Presentación',
          style: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }
        }
      case 'correo':
        return {
          label: 'Correo de Postulación',
          style: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }
        }
      default:
        return {
          label: tipo,
          style: { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }
        }
    }
  }

  const filteredDocs = documents.filter(
    doc =>
      doc.nombre_archivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.puesto?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${d.getDate()} ${meses[d.getMonth()]}, ${d.getFullYear()}`
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h1>Mis documentos generados</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 'var(--fs-md)' }}>
          Descarga tus Hojas de Vida adaptadas, Cartas de Presentación y Correos de postulación en formato Word (.docx).
        </p>
      </div>

      {/* Buscador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
        <input
          type="text"
          placeholder="Buscar por vacante, empresa o archivo..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', padding: 0 }}
        />
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Total: <strong style={{ color: 'var(--text-primary)' }}>{filteredDocs.length}</strong>
        </span>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando tus documentos generados...
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--c-red)', color: 'var(--c-red)' }}>
          {error}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <h2>Aún no has generado documentos</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 440 }}>
            Ve a la sección <strong>"Mis Procesos"</strong> y haz clic en el botón <strong>"Aplicar / Generar Docs"</strong> en cualquiera de tus postulaciones.
          </p>
        </div>
      ) : (
        /* Tabla de Documentos Rediseñada */
        <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--fs-sm)', minWidth: 960 }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <th
                  onClick={() => handleSort('nombre_archivo')}
                  style={{ padding: '1rem', fontWeight: 700, width: '30%', cursor: 'pointer', userSelect: 'none' }}
                >
                  Documento {sortConfig.key === 'nombre_archivo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('tipo')}
                  style={{ padding: '1rem', fontWeight: 700, width: '18%', cursor: 'pointer', userSelect: 'none' }}
                >
                  Tipo {sortConfig.key === 'tipo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('empresa')}
                  style={{ padding: '1rem', fontWeight: 700, width: '27%', cursor: 'pointer', userSelect: 'none' }}
                >
                  Proceso asociado {sortConfig.key === 'empresa' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  style={{ padding: '1rem', fontWeight: 700, width: '10%', cursor: 'pointer', userSelect: 'none' }}
                >
                  Fecha {sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '1rem', fontWeight: 700, width: '15%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {getSortedDocs(filteredDocs).map(doc => {
                const badge = getDocTypeBadge(doc.tipo)
                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                    
                    {/* Columna Documento con Icono */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--c-blue-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                          {doc.nombre_archivo}
                        </span>
                      </div>
                    </td>

                    {/* Columna Tipo */}
                    <td style={{ padding: '1rem' }}>
                      <span style={badge.style}>{badge.label}</span>
                    </td>

                    {/* Columna Proceso (Empresa / Puesto) + Accesos */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{doc.empresa}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.puesto}</span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '6px', alignItems: 'flex-start' }}>
                          <button
                            onClick={() => navigate('/dashboard/mis-procesos')}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '0.2rem 0.5rem',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--c-blue-dark)',
                              cursor: 'pointer',
                              width: '100px',
                              textAlign: 'center',
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'var(--c-blue-tint)'
                              e.currentTarget.style.borderColor = 'var(--c-blue-dark)'
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = '#f8fafc'
                              e.currentTarget.style.borderColor = '#cbd5e1'
                            }}
                          >
                            Ver proceso
                          </button>
                          {doc.vacante_link ? (
                            <a
                              href={doc.vacante_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '0.2rem 0.5rem',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                textDecoration: 'none',
                                display: 'inline-block',
                                width: '100px',
                                textAlign: 'center',
                                boxSizing: 'border-box',
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.background = '#f1f5f9'
                                e.currentTarget.style.borderColor = '#94a3b8'
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = '#f8fafc'
                                e.currentTarget.style.borderColor = '#cbd5e1'
                              }}
                            >
                              Ver anuncio
                            </a>
                          ) : (
                            <span
                              title="No hay enlace de anuncio disponible para este proceso"
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                padding: '0.2rem 0.5rem',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#94a3b8',
                                display: 'inline-block',
                                width: '100px',
                                textAlign: 'center',
                                boxSizing: 'border-box',
                                cursor: 'not-allowed'
                              }}
                            >
                              Ver anuncio
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Columna Fecha */}
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(doc.created_at)}
                    </td>

                    {/* Columna Acciones en línea */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: 'var(--c-blue-dark)',
                            color: '#ffffff',
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            fontSize: '11px',
                            display: 'inline-block',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Descargar .docx
                        </a>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          style={{
                            background: 'var(--c-red)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
