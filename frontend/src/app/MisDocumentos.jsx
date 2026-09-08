import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Upload, Download, Trash2, X, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { apiFetch, apiFetchBlob } from '../lib/api.js'
import * as docx from 'docx-preview'

export default function MisDocumentos() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  // Estado del modal de previsualización
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const previewContainerRef = useRef(null)

  // Estado de subida / reemplazo de documento editado
  const fileInputRef = useRef(null)
  const [targetDocForUpload, setTargetDocForUpload] = useState(null)
  const [uploadingDocId, setUploadingDocId] = useState(null)
  const [notification, setNotification] = useState(null)

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

  // Cargar y renderizar documento en el visor modal
  useEffect(() => {
    if (!previewDoc) {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
        setPdfPreviewUrl(null)
      }
      return
    }

    let isMounted = true
    const renderPreview = async () => {
      setPreviewLoading(true)
      setPreviewError(null)
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
        setPdfPreviewUrl(null)
      }

      try {
        // 1. Obtener blob del documento (usando proxy autenticado o URL directa)
        let blob
        try {
          blob = await apiFetchBlob(`/documents/${previewDoc.id}/file`)
        } catch {
          const directRes = await fetch(previewDoc.file_url)
          if (!directRes.ok) throw new Error('No fue posible descargar el archivo para previsualización')
          blob = await directRes.blob()
        }

        if (!isMounted) return

        const ext = (previewDoc.nombre_archivo || '').toLowerCase()
        const isPdf = ext.endsWith('.pdf') || blob.type === 'application/pdf'

        if (isPdf) {
          const url = URL.createObjectURL(blob)
          setPdfPreviewUrl(url)
          setPreviewLoading(false)
        } else {
          // Es .docx: Renderizar con docx-preview con paginacion real y estilos
          if (previewContainerRef.current) {
            previewContainerRef.current.innerHTML = ''
            await docx.renderAsync(blob, previewContainerRef.current, null, {
              className: 'docx',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              breakPages: true,
              experimental: true
            })
          }
          setPreviewLoading(false)
        }
      } catch (err) {
        console.error('Error renderizando previsualización:', err)
        if (isMounted) {
          setPreviewError('No se pudo renderizar la vista previa interactiva. Puedes descargar el archivo directamente.')
          setPreviewLoading(false)
        }
      }
    }

    renderPreview()

    return () => {
      isMounted = false
    }
  }, [previewDoc])

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este documento?')) return

    try {
      await apiFetch(`/documents/${docId}`, { method: 'DELETE' })
      setDocuments(prev => prev.filter(d => d.id !== docId))
      if (previewDoc?.id === docId) {
        setPreviewDoc(null)
      }
      showToast('success', 'Documento eliminado exitosamente.')
    } catch (err) {
      console.error('Error al eliminar documento:', err)
      showToast('error', 'Error al eliminar el documento.')
    }
  }

  // Activar selección de archivo para subir versión editada
  const handleTriggerUpload = (doc) => {
    setTargetDocForUpload(doc)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  // Procesar archivo seleccionado para reemplazo
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !targetDocForUpload) return

    const ext = file.name.toLowerCase()
    if (!ext.endsWith('.docx') && !ext.endsWith('.pdf')) {
      showToast('error', 'Solo se admiten archivos en formato Word (.docx) o PDF (.pdf).')
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('error', 'El archivo no puede exceder los 25 MB.')
      return
    }

    const docId = targetDocForUpload.id
    setUploadingDocId(docId)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await apiFetch(`/documents/${docId}/replace`, {
        method: 'POST',
        body: formData
      })

      if (result.document) {
        // Actualizar la lista local de documentos
        setDocuments(prev => prev.map(d => d.id === docId ? result.document : d))
        
        // Si estaba en la vista previa, refrescar con el nuevo documento
        if (previewDoc?.id === docId) {
          setPreviewDoc(result.document)
        }

        showToast('success', `Versión modificada de "${file.name}" subida exitosamente.`)
      }
    } catch (err) {
      console.error('Error al subir versión editada:', err)
      showToast('error', `Error al subir el archivo: ${err.message}`)
    } finally {
      setUploadingDocId(null)
      setTargetDocForUpload(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const showToast = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 5000)
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
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      
      {/* Input oculto para subir versión editada */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".docx,.pdf"
        style={{ display: 'none' }}
      />

      {/* Notificación flotante / Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: 'var(--fs-sm)',
            fontWeight: 600
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle size={18} color="#059669" />
          ) : (
            <AlertCircle size={18} color="#dc2626" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Encabezado */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h1>Mis documentos generados</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 'var(--fs-md)' }}>
          Previsualiza en pantalla, descarga o sube versiones modificadas de tus Hojas de Vida, Cartas de Presentación y Correos en formato Word (.docx) o PDF.
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

      {/* Contenido principal */}
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
        /* Tabla de Documentos */
        <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--fs-sm)', minWidth: 980 }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <th
                  onClick={() => handleSort('nombre_archivo')}
                  style={{ padding: '1rem', fontWeight: 700, width: '28%', cursor: 'pointer', userSelect: 'none' }}
                >
                  Documento {sortConfig.key === 'nombre_archivo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('tipo')}
                  style={{ padding: '1rem', fontWeight: 700, width: '16%', cursor: 'pointer', userSelect: 'none' }}
                >
                  Tipo {sortConfig.key === 'tipo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('empresa')}
                  style={{ padding: '1rem', fontWeight: 700, width: '24%', cursor: 'pointer', userSelect: 'none' }}
                >
                  Proceso asociado {sortConfig.key === 'empresa' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  style={{ padding: '1rem', fontWeight: 700, width: '10%', cursor: 'pointer', userSelect: 'none' }}
                >
                  Fecha {sortConfig.key === 'created_at' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '1rem', fontWeight: 700, width: '22%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {getSortedDocs(filteredDocs).map(doc => {
                const badge = getDocTypeBadge(doc.tipo)
                const isUploadingThis = uploadingDocId === doc.id
                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                    
                    {/* Columna Documento */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <FileText size={18} color="var(--c-blue-dark)" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.82rem' }}>
                          {doc.nombre_archivo}
                        </span>
                      </div>
                    </td>

                    {/* Columna Tipo */}
                    <td style={{ padding: '1rem' }}>
                      <span style={badge.style}>{badge.label}</span>
                    </td>

                    {/* Columna Proceso (Empresa / Puesto) */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{doc.empresa}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.puesto}</span>
                        
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '6px', alignItems: 'center' }}>
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
                              cursor: 'pointer'
                            }}
                          >
                            Ver proceso
                          </button>
                          {doc.vacante_link && (
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
                                textDecoration: 'none'
                              }}
                            >
                              Ver vacante
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Columna Fecha */}
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(doc.created_at)}
                    </td>

                    {/* Columna Acciones */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                        
                        {/* Botón Previsualizar */}
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          title="Previsualizar documento en pantalla sin descargar"
                          style={{
                            background: 'var(--c-blue-dark)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Eye size={13} />
                          <span>Previsualizar</span>
                        </button>

                        {/* Botón Subir Versión Modificada */}
                        <button
                          onClick={() => handleTriggerUpload(doc)}
                          disabled={isUploadingThis}
                          title="Subir una versión modificada/editada de este documento (.docx o .pdf)"
                          style={{
                            background: isUploadingThis ? '#f1f5f9' : '#ffffff',
                            color: isUploadingThis ? '#94a3b8' : 'var(--c-blue-dark)',
                            border: '1px solid #cbd5e1',
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: isUploadingThis ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {isUploadingThis ? (
                            <>
                              <RefreshCw size={13} className="spin" />
                              <span>Subiendo...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={13} />
                              <span>Reemplazar</span>
                            </>
                          )}
                        </button>

                        {/* Botón Descargar */}
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Descargar archivo en tu computador"
                          style={{
                            background: '#f8fafc',
                            color: 'var(--text-secondary)',
                            border: '1px solid #cbd5e1',
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Download size={13} />
                          <span>Descargar</span>
                        </a>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          title="Eliminar documento"
                          style={{
                            background: 'transparent',
                            color: 'var(--c-red)',
                            border: 'none',
                            padding: '0.35rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={15} />
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

      {/* MODAL DE PREVISUALIZACIÓN DE DOCUMENTO */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewDoc(null)
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '920px',
              maxHeight: '92vh',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden'
            }}
          >
            {/* Header del Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                <FileText size={20} color="var(--c-blue-dark)" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', wordBreak: 'break-all' }}>
                    {previewDoc.nombre_archivo}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {previewDoc.puesto} - {previewDoc.empresa}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => handleTriggerUpload(previewDoc)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--c-blue-dark)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={14} />
                  <span>Subir versión editada</span>
                </button>

                <a
                  href={previewDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'var(--c-blue-dark)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Download size={14} />
                  <span>Descargar</span>
                </a>

                <button
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    padding: '0.35rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Contenedor del Documento Previsualizado */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                background: '#e2e8f0',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              {previewLoading && (
                <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#475569', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <RefreshCw size={28} className="spin" color="var(--c-blue-dark)" />
                  <span style={{ fontWeight: 600 }}>Cargando y formateando vista previa del documento...</span>
                </div>
              )}

              {previewError && (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#ffffff', borderRadius: '8px', maxWidth: 500, margin: 'auto' }}>
                  <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ color: '#1f2937', fontWeight: 600, margin: '0 0 0.5rem 0' }}>{previewError}</p>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Puedes abrirlo o descargarlo directamente para editarlo en tu visor habitual.
                  </p>
                  <a
                    href={previewDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'var(--c-blue-dark)',
                      color: '#ffffff',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      display: 'inline-block'
                    }}
                  >
                    Descargar archivo .docx
                  </a>
                </div>
              )}

              {/* Visor PDF nativo */}
              {pdfPreviewUrl && !previewLoading && (
                <iframe
                  src={pdfPreviewUrl}
                  title={previewDoc.nombre_archivo}
                  style={{
                    width: '100%',
                    height: '72vh',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#ffffff'
                  }}
                />
              )}

              {/* Visor interactivo DOCX */}
              {!pdfPreviewUrl && !previewLoading && !previewError && (
                <div
                  ref={previewContainerRef}
                  style={{
                    width: '100%',
                    minHeight: '600px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}
                />
              )}
            </div>

            {/* Footer del Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border-color)',
                background: '#ffffff',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}
            >
              <span>Tip: Edita el archivo en Word o LibreOffice y usa <strong>"Subir versión editada"</strong> para guardarlo en este proceso.</span>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.4rem 0.9rem',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Cerrar vista previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
