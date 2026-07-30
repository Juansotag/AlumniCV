import React, { useState } from 'react'

/**
 * PipelineTracker
 * - Triángulo con SVG (mismo estilo visual que círculo/cuadrado)
 * - Íconos SVG (no emojis) para virtual (monitor) y teléfono dentro de la forma
 * - Historial: cambios de estado reemplazan la última entrada (no apilan)
 * - Eliminar entradas del historial
 * - Banners: felicitaciones si estrella-verde, consolación si rojo o cancelado
 */

const STATE_CONFIG = {
  verde:    { label: 'Aprobado',     color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  rojo:     { label: 'Rechazado',    color: '#96272d', bg: '#fef2f2', border: '#fecaca' },
  amarillo: { label: 'En proceso',   color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  cancelado:{ label: 'Cancelado',    color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' }
}

// SVG Icons — usamos paths de Material Design / Heroicons para monitor y teléfono
const IconMonitor = ({ size = 10, color = '#64748b' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

const IconPhone = ({ size = 10, color = '#64748b' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.27 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

function hasCancelledNode(p) { return p.some(n => n.estado === 'cancelado') }
function hasRejectedNode(p)  { return p.some(n => n.estado === 'rojo') }
function isSelected(p) {
  return p.some(n => n.tipo === 'estrella' && n.estado === 'verde')
}

export default function PipelineTracker({ pipeline = [], onChange, compact = false, hideMessages = false }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [insertIndex, setInsertIndex] = useState(null)
  const [notesSaved, setNotesSaved] = useState(false)

  const activePipeline = pipeline && pipeline.length > 0 ? pipeline : [
    {
      id: 'init',
      tipo: 'cuadrado',
      estado: 'amarillo',
      modalidad: null,
      notas: '',
      historial: [{ estado: 'amarillo', fecha: new Date().toISOString(), nota: 'Proceso registrado' }]
    }
  ]

  const isCancelled = hasCancelledNode(activePipeline)
  const isRejected  = hasRejectedNode(activePipeline)
  const isSelectedFinal = isSelected(activePipeline)
  const hasStar  = activePipeline.some(n => n.tipo === 'estrella')
  const canAddMore = !isCancelled && !hasStar

  /**
   * Actualiza el nodo.
   * Si cambia de estado: reemplaza la ÚLTIMA entrada del historial
   * (no apila entradas por cada clic sucesivo).
   * La entrada índice 0 (creación) nunca se toca.
   */
  const handleUpdateNode = (nodeId, updates) => {
    let updated = activePipeline.map(node => {
      if (node.id !== nodeId) return node

      const stateChanged = updates.estado && updates.estado !== node.estado
      let newHistorial = [...(node.historial || [])]

      if (stateChanged) {
        const newEntry = {
          estado: updates.estado,
          fecha: new Date().toISOString(),
          nota: updates.nota_cambio || ''
        }
        if (newHistorial.length <= 1) {
          // Solo existe la entrada inicial → agregar
          newHistorial = [...newHistorial, newEntry]
        } else {
          // Reemplazar la última entrada (no apilar)
          newHistorial = [...newHistorial.slice(0, -1), newEntry]
        }
      }

      return { ...node, ...updates, historial: newHistorial }
    })

    // Cascada cancelado
    if (updates.estado === 'cancelado') {
      const idx = updated.findIndex(n => n.id === nodeId)
      updated = updated.map((node, i) => {
        if (i > idx && node.estado !== 'cancelado') {
          const hist = [...(node.historial || [])]
          const cascadeEntry = { estado: 'cancelado', fecha: new Date().toISOString(), nota: 'Cancelado en cascada' }
          return {
            ...node, estado: 'cancelado',
            historial: hist.length <= 1
              ? [...hist, cascadeEntry]
              : [...hist.slice(0, -1), cascadeEntry]
          }
        }
        return node
      })
    }

    onChange?.(updated)
    if (selectedNode?.id === nodeId) {
      setSelectedNode(updated.find(n => n.id === nodeId) || null)
    }
  }

  /** Edita campo de una entrada del historial */
  const handleUpdateHistoryEntry = (nodeId, entryIndex, field, value) => {
    const updated = activePipeline.map(node => {
      if (node.id !== nodeId) return node
      const newHistorial = (node.historial || []).map((h, i) =>
        i === entryIndex ? { ...h, [field]: value } : h
      )
      return { ...node, historial: newHistorial }
    })
    onChange?.(updated)
    setSelectedNode(updated.find(n => n.id === nodeId) || null)
  }

  /** Elimina una entrada del historial (nunca la primera) */
  const handleDeleteHistoryEntry = (nodeId, entryIndex) => {
    if (entryIndex === 0) return // La entrada inicial es inmutable
    const updated = activePipeline.map(node => {
      if (node.id !== nodeId) return node
      const newHistorial = (node.historial || []).filter((_, i) => i !== entryIndex)
      // Sincronizar estado del nodo con el último entry restante
      const lastEntry = newHistorial[newHistorial.length - 1]
      return { ...node, estado: lastEntry?.estado || 'gris', historial: newHistorial }
    })
    onChange?.(updated)
    setSelectedNode(updated.find(n => n.id === nodeId) || null)
  }

  const handleAddNode = (tipo) => {
    const now = new Date().toISOString()
    const newNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tipo,
      estado: 'amarillo',
      modalidad: tipo === 'estrella' ? null : 'presencial',
      notas: '',
      historial: [{ estado: 'amarillo', fecha: now, nota: tipo === 'estrella' ? 'Oferta recibida' : 'Fase agregada' }]
    }
    let updated = [...activePipeline]
    if (insertIndex !== null) updated.splice(insertIndex + 1, 0, newNode)
    else updated.push(newNode)
    onChange?.(updated)
    setShowAddModal(false)
    setInsertIndex(null)
  }

  const handleDeleteNode = (nodeId) => {
    const node = activePipeline.find(n => n.id === nodeId)
    if (node?.tipo === 'cuadrado') return
    onChange?.(activePipeline.filter(n => n.id !== nodeId))
    setSelectedNode(null)
  }

  // ── Render de forma ─────────────────────────────────────────────────────────
  const renderShape = (node) => {
    const config = STATE_CONFIG[node.estado] || STATE_CONFIG.amarillo
    const size = compact ? 22 : 30
    const iconSize = compact ? 8 : 10

    // Ícono de modalidad (SVG, no emoji)
    const modalIcon = (() => {
      if (node.tipo === 'estrella') return null
      if (node.modalidad === 'virtual')  return <IconMonitor size={iconSize} color={config.color} />
      if (node.modalidad === 'telefono') return <IconPhone   size={iconSize} color={config.color} />
      return null
    })()

    const commonBoxStyle = {
      width: size,
      height: size,
      backgroundColor: config.bg,
      border: `2px solid ${config.border}`,
      flexShrink: 0,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'border-color 0.15s, background 0.15s',
      position: 'relative'
    }

    switch (node.tipo) {
      case 'cuadrado':
        return (
          <div style={{ ...commonBoxStyle, borderRadius: '4px' }}>
            {modalIcon}
          </div>
        )
      case 'circulo':
        return (
          <div style={{ ...commonBoxStyle, borderRadius: '50%' }}>
            {modalIcon}
          </div>
        )
      case 'triangulo':
        // SVG para triángulo — mismo estilo visual (borde + relleno pálido)
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={{ cursor: 'pointer', flexShrink: 0 }}
          >
            <polygon
              points="50,6 4,94 96,94"
              fill={config.bg}
              stroke={config.border}
              strokeWidth="7"
              strokeLinejoin="round"
            />
            {modalIcon && (
              <foreignObject x="30" y="55" width="40" height="30">
                {modalIcon}
              </foreignObject>
            )}
          </svg>
        )
      case 'estrella':
        return (
          <div style={{ ...commonBoxStyle, borderRadius: '50%', fontSize: compact ? '11px' : '14px', color: config.color }}>
            ★
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ paddingTop: compact ? 0 : '0.35rem' }}>
      {/* Banners */}
      {!hideMessages && isSelectedFinal && (
        <div style={{ marginBottom: '0.75rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', color: '#047857', fontWeight: 700, fontSize: 'var(--fs-sm)' }}>
          ¡Felicitaciones! Fuiste seleccionado para esta vacante.
        </div>
      )}
      {!hideMessages && !isSelectedFinal && (isCancelled || isRejected) && (
        <div style={{ marginBottom: '0.75rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', color: '#374151', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
          {isCancelled
            ? 'El proceso fue cancelado. Cada experiencia suma — sigue adelante.'
            : 'Recibiste un rechazo en esta etapa. No te desanimes, sigue buscando.'}
        </div>
      )}

      {/* Cadena de nodos */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: compact ? '0.15rem' : '0.3rem' }}>
        {activePipeline.map((node, index) => {
          const isLast = index === activePipeline.length - 1
          return (
            <React.Fragment key={node.id}>
              <button
                onClick={() => setSelectedNode(node)}
                title={`${STATE_CONFIG[node.estado]?.label || 'En proceso'}${node.modalidad ? ' · ' + node.modalidad : ''}`}
                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {renderShape(node)}
              </button>

              {!isLast && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: compact ? '10px' : '18px', height: '2px', backgroundColor: 'var(--border-color)' }} />
                  {canAddMore && (
                    <button
                      onClick={() => { setInsertIndex(index); setShowAddModal(true) }}
                      style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: compact ? '13px' : '16px', height: compact ? '13px' : '16px', borderRadius: '50%', background: '#fff', border: '1px solid var(--border-color)', color: 'var(--c-blue-dark)', fontSize: compact ? '9px' : '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  )}
                </div>
              )}

              {isLast && canAddMore && (
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
                  <div style={{ width: compact ? '6px' : '10px', height: '2px', backgroundColor: 'var(--border-color)' }} />
                  <button
                    onClick={() => { setInsertIndex(index); setShowAddModal(true) }}
                    style={{ width: compact ? '16px' : '20px', height: compact ? '16px' : '20px', borderRadius: '50%', background: 'var(--c-blue-dark)', border: 'none', color: '#fff', fontSize: compact ? '10px' : '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '2px' }}>+</button>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* ── MODAL EDICIÓN NODO ──────────────────────────────────── */}
      {selectedNode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,19,91,0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Editar etapa</h3>
              <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Estado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>Estado</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                {Object.entries(STATE_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleUpdateNode(selectedNode.id, { estado: key })}
                    style={{
                      padding: '0.45rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: selectedNode.estado === key ? '2px solid var(--c-blue-dark)' : '1px solid var(--border-color)',
                      background: selectedNode.estado === key ? 'var(--c-blue-tint)' : '#fff',
                      fontWeight: selectedNode.estado === key ? 700 : 500,
                      fontSize: 'var(--fs-xs)',
                      cursor: 'pointer',
                      color: config.color
                    }}
                  >{config.label}</button>
                ))}
              </div>
            </div>

            {/* Modalidad */}
            {selectedNode.tipo !== 'estrella' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>Modalidad</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { val: 'presencial', label: 'Presencial' },
                    { val: 'virtual',    label: 'Virtual' },
                    { val: 'telefono',   label: 'Teléfono' }
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => handleUpdateNode(selectedNode.id, { modalidad: val })}
                      style={{
                        flex: 1, padding: '0.4rem',
                        borderRadius: 'var(--radius-sm)',
                        border: selectedNode.modalidad === val ? '2px solid var(--c-blue-dark)' : '1px solid var(--border-color)',
                        background: selectedNode.modalidad === val ? 'var(--c-blue-tint)' : '#fff',
                        fontSize: 'var(--fs-xs)', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
                      }}
                    >
                      {val === 'virtual'   && <IconMonitor size={12} color={selectedNode.modalidad === val ? 'var(--c-blue-dark)' : '#64748b'} />}
                      {val === 'telefono'  && <IconPhone   size={12} color={selectedNode.modalidad === val ? 'var(--c-blue-dark)' : '#64748b'} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>Notas</label>
              <textarea
                rows={3}
                placeholder="Ej. Entrevista con RRHH, 30 min..."
                value={selectedNode.notas || ''}
                onChange={e => setSelectedNode({ ...selectedNode, notas: e.target.value })}
                style={{ fontSize: 'var(--fs-xs)', resize: 'vertical', lineHeight: 1.5 }}
              />
              <button
                onClick={() => {
                  handleUpdateNode(selectedNode.id, { notas: selectedNode.notas })
                  setNotesSaved(true)
                  setTimeout(() => setNotesSaved(false), 2000)
                }}
                style={{
                  alignSelf: 'flex-end',
                  background: notesSaved ? 'var(--c-blue-dark)' : 'none',
                  color: notesSaved ? '#fff' : 'var(--c-blue-dark)',
                  border: notesSaved ? 'none' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.25rem 0.75rem',
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s'
                }}
              >
                {notesSaved ? '¡Guardado!' : 'Guardar notas'}
              </button>
            </div>

            {/* Historial con fechas editables y eliminación */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>Historial de cambios</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {(selectedNode.historial || []).map((h, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.4rem 0.6rem', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--fs-xs)', color: STATE_CONFIG[h.estado]?.color || '#b45309', whiteSpace: 'nowrap' }}>
                        {STATE_CONFIG[h.estado]?.label || 'En proceso'}
                      </span>
                      <input
                        type="datetime-local"
                        value={h.fecha ? h.fecha.slice(0, 16) : ''}
                        onChange={e => handleUpdateHistoryEntry(selectedNode.id, i, 'fecha', new Date(e.target.value).toISOString())}
                        style={{ fontSize: '0.62rem', border: '1px solid var(--border-color)', borderRadius: '3px', padding: '0.1rem 0.3rem', color: 'var(--text-muted)', background: '#fff', flex: 1, minWidth: 0 }}
                      />
                      {/* Solo permite eliminar entradas que no sean la inicial */}
                      {i > 0 && (
                        <button
                          onClick={() => handleDeleteHistoryEntry(selectedNode.id, i)}
                          title="Eliminar este registro"
                          style={{ background: 'var(--c-red)', color: '#fff', border: 'none', borderRadius: '3px', padding: '0.1rem 0.35rem', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >✕</button>
                      )}
                    </div>
                    {h.nota && (
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{h.nota}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', gap: '0.5rem' }}>
              {selectedNode.tipo !== 'cuadrado' ? (
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  style={{ background: 'var(--c-red)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.4rem 1rem', fontSize: 'var(--fs-xs)', fontWeight: 700, cursor: 'pointer' }}
                >Eliminar etapa</button>
              ) : <div />}
              <button onClick={() => setSelectedNode(null)} className="btn-auth-submit" style={{ padding: '0.4rem 1rem', fontSize: 'var(--fs-xs)' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR NODO ──────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,19,91,0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Agregar etapa</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            {[
              { tipo: 'circulo',   label: 'Entrevista',              desc: 'Entrevista inicial, técnica o directiva' },
              { tipo: 'triangulo', label: 'Prueba Técnica',           desc: 'Prueba de conocimientos o caso práctico' },
              { tipo: 'estrella',  label: 'Oferta / Selección Final', desc: 'Oferta laboral recibida — cierra el proceso', accent: true }
            ].map(({ tipo, label, desc, accent }) => (
              <button
                key={tipo}
                onClick={() => handleAddNode(tipo)}
                style={{ padding: '0.7rem', borderRadius: 'var(--radius-sm)', border: accent ? '1px solid var(--c-yellow)' : '1px solid var(--border-color)', background: accent ? 'var(--c-cream)' : '#fff', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', color: 'var(--c-blue-dark)' }}>{label}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
