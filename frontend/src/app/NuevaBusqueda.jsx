import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'

export default function NuevaBusqueda() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    query: 'Científico de Datos',
    location: 'Colombia',
    modalidad: 'todas',
    seniority: 'todos',
    limit: 25
  })

  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [error, setError] = useState(null)
  const [convertingId, setConvertingId] = useState(null)
  const [addingAll, setAddingAll] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'compatibilidad', direction: 'desc' })

  // Estados para importación manual por ID o URL
  const [manualInput, setManualInput] = useState('')
  const [importingManual, setImportingManual] = useState(false)
  const [manualSuccess, setManualSuccess] = useState(null)
  const [manualError, setManualError] = useState(null)
  const [showManualCard, setShowManualCard] = useState(false)

  const handleManualImport = async (e) => {
    e.preventDefault()
    if (!manualInput.trim()) return

    try {
      setImportingManual(true)
      setManualError(null)
      setManualSuccess(null)

      const data = await apiFetch('/job-search/import-by-id', {
        method: 'POST',
        body: JSON.stringify({ input: manualInput.trim() })
      })

      if (data.alreadyExists) {
        setManualSuccess(`ℹ️ ${data.message}`)
      } else {
        setManualSuccess(`✓ ${data.message || 'Vacante importada'} (${data.result?.puesto} en ${data.result?.empresa})`)
      }

      setManualInput('')
      await loadAccumulatedResults(false)
    } catch (err) {
      setManualError(err.message || 'No se pudo importar la vacante solicitada.')
    } finally {
      setImportingManual(false)
    }
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortedResults = (list) => {
    if (!sortConfig.key) return list
    return [...list].sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      if (sortConfig.key === 'compatibilidad' || sortConfig.key === 'postulantes') {
        return sortConfig.direction === 'asc'
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal)
      }

      if (sortConfig.key === 'fecha_captura') {
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

  // Carga inicial de todos los resultados de búsqueda acumulados en la base de datos
  const loadAccumulatedResults = async (showLoading = false) => {
    try {
      if (showLoading) setLoadingInitial(true)
      const data = await apiFetch('/job-search/results')
      setResults(data.results || [])
    } catch (err) {
      console.error('Error al cargar resultados acumulados:', err)
      setError('No se pudieron cargar los anuncios guardados previamente.')
    } finally {
      if (showLoading) setLoadingInitial(false)
    }
  }

  useEffect(() => {
    loadAccumulatedResults(true)
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!form.query.trim()) return

    try {
      setSearching(true)
      setError(null)

      // Realiza la búsqueda en LinkedIn y guarda en BD
      await apiFetch('/job-search', {
        method: 'POST',
        body: JSON.stringify(form)
      })

      // Refresca la lista acumulada completa de la BD
      await loadAccumulatedResults(false)
    } catch (err) {
      setError('No se pudieron obtener las vacantes en este momento: ' + err.message)
    } finally {
      setSearching(false)
    }
  }

  // Convierte una vacante individual a un proceso
  const handleConvertToProcess = async (resultId) => {
    try {
      setConvertingId(resultId)
      await apiFetch('/job-search/convert', {
        method: 'POST',
        body: JSON.stringify({ result_id: resultId })
      })

      // Marcar localmente como agregado de forma inmediata
      setResults(prev => prev.map(r => r.id === resultId ? { ...r, ya_agregado: true } : r))
    } catch (err) {
      console.error(err)
      alert('Error al agregar a Mis Procesos')
    } finally {
      setConvertingId(null)
    }
  }

  // Convierte todos los anuncios visibles no agregados a procesos en lote
  const handleAddAll = async () => {
    const visibleNotAdded = results.filter(r => !r.ya_agregado)
    if (visibleNotAdded.length === 0) return
    const ids = visibleNotAdded.map(r => r.id)

    try {
      setAddingAll(true)
      const data = await apiFetch('/applications/bulk', {
        method: 'POST',
        body: JSON.stringify({ result_ids: ids })
      })

      // Actualizar todos los ids localmente como agregados
      setResults(prev => prev.map(r => ids.includes(r.id) ? { ...r, ya_agregado: true } : r))
      alert(`✓ ${data.added} proceso(s) agregados. ${data.skipped ? `${data.skipped} ya estaban en tu lista.` : ''}`)
    } catch (err) {
      alert('Error al agregar todos: ' + err.message)
    } finally {
      setAddingAll(false)
    }
  }

  // Elimina un anuncio de la BD y lo remueve de la lista acumulada local
  const handleDeleteResult = async (resultId) => {
    // Filtrado optimista en UI
    setResults(prev => prev.filter(r => r.id !== resultId))
    try {
      await apiFetch(`/job-search/results/${resultId}`, { method: 'DELETE' })
    } catch (err) {
      console.error(err)
      alert('Error al eliminar el resultado de la base de datos')
      // Si falla, recargamos el acumulado para restaurarlo
      loadAccumulatedResults(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h1>Anuncios de empleo encontrados</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 'var(--fs-md)' }}>
          Búsqueda de vacantes en LinkedIn acumulativas. Solo las vacantes que selecciones pasarán a ser tus procesos de postulación activos.
        </p>
      </div>

      {/* Sección de Importación Manual por ID o URL */}
      <div className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', color: 'var(--c-blue-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📥 ¿Tienes el ID o enlace de una vacante puntual en LinkedIn?
            </span>
            <p style={{ margin: '2px 0 0 0', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              Importa cualquier oferta manual: extraeremos sus datos, calcularemos la afinidad (%) con tu CV y la agregaremos al inventario.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowManualCard(prev => !prev)}
            style={{
              background: showManualCard ? 'transparent' : 'var(--c-blue-dark)',
              color: showManualCard ? 'var(--text-primary)' : '#fff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.4rem 0.85rem',
              fontSize: 'var(--fs-xs)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {showManualCard ? 'Ocultar importador' : '+ Importar por ID / Enlace'}
          </button>
        </div>

        {showManualCard && (
          <form onSubmit={handleManualImport} style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                required
                placeholder="Ej. 4123456789 o https://www.linkedin.com/jobs/view/4123456789/..."
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                style={{ width: '100%', fontSize: 'var(--fs-sm)' }}
                disabled={importingManual}
              />
            </div>
            <button
              type="submit"
              disabled={importingManual || !manualInput.trim()}
              className="btn-auth-submit"
              style={{ padding: '0.65rem 1.25rem', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)' }}
            >
              {importingManual ? 'Extrayendo vacante...' : '📥 Importar al Dataset'}
            </button>
          </form>
        )}

        {manualSuccess && (
          <div style={{ padding: '0.6rem 0.85rem', background: '#dcf5e6', color: 'var(--c-green)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
            {manualSuccess}
          </div>
        )}

        {manualError && (
          <div style={{ padding: '0.6rem 0.85rem', background: '#fee2e2', color: 'var(--c-red)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
            ⚠️ {manualError}
          </div>
        )}
      </div>

      {/* Formulario de Búsqueda Avanzada */}
      <div className="card">
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr 1fr', gap: '0.85rem' }}>
            <div className="form-group">
              <label>Cargo / Palabras Clave *</label>
              <input
                type="text"
                required
                placeholder="Ej. Data Scientist, Contador..."
                value={form.query}
                onChange={e => setForm({ ...form, query: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Ubicación</label>
              <input
                type="text"
                placeholder="Ej. Colombia, Bogotá, Remoto"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Modalidad</label>
              <select value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })}>
                <option value="todas">Todas</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
                <option value="presencial">Presencial</option>
              </select>
            </div>

            <div className="form-group">
              <label>Nivel (Seniority)</label>
              <select value={form.seniority} onChange={e => setForm({ ...form, seniority: e.target.value })}>
                <option value="todos">Todos los niveles</option>
                <option value="practicante">Practicante / Trainee</option>
                <option value="junior">Junior / Associate</option>
                <option value="mid_senior">Mid - Senior Level</option>
                <option value="director">Director / Ejecutivo</option>
              </select>
            </div>

            <div className="form-group">
              <label>Límite</label>
              <select value={form.limit} onChange={e => setForm({ ...form, limit: Number(e.target.value) })}>
                <option value={10}>10 vacantes</option>
                <option value={25}>25 vacantes</option>
                <option value={50}>50 vacantes</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={searching} className="btn-auth-submit" style={{ padding: '0.65rem 1.5rem' }}>
              {searching ? 'Buscando en LinkedIn...' : 'Buscar Vacantes'}
            </button>
          </div>
        </form>
      </div>

      {/* Estado de Carga de búsqueda */}
      {searching && (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Consultando vacantes en LinkedIn y calculando afinidad con tu perfil...
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--c-red)', color: 'var(--c-red)' }}>
          {error}
        </div>
      )}

      {/* Listado Acumulado de Anuncios */}
      {loadingInitial ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando listado acumulado de anuncios...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>
              Anuncios acumulados ({results.length})
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {results.some(r => !r.ya_agregado) && (
                <button
                  onClick={handleAddAll}
                  disabled={addingAll}
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.45rem 1rem',
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--c-blue-dark)'
                  }}
                >
                  {addingAll ? 'Agregando...' : `+ Agregar todos a Mis Procesos`}
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard/mis-procesos')}
                style={{ background: 'none', border: 'none', color: 'var(--c-blue-light)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--fs-sm)' }}
              >
                Ir a Mis Procesos
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No tienes anuncios guardados. Realiza tu primera búsqueda para acumular vacantes aquí.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--fs-sm)', minWidth: 980 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                    <th
                      onClick={() => handleSort('puesto')}
                      style={{ padding: '0.85rem 1rem', fontWeight: 700, width: '32%', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Vacante {sortConfig.key === 'puesto' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('empresa')}
                      style={{ padding: '0.85rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                    >
                      Empresa / Ubicación {sortConfig.key === 'empresa' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('salario')}
                      style={{ padding: '0.85rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                    >
                      Salario / Nivel {sortConfig.key === 'salario' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('postulantes')}
                      style={{ padding: '0.85rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                    >
                      Publicado / Postulantes {sortConfig.key === 'postulantes' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('fecha_captura')}
                      style={{ padding: '0.85rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                    >
                      Capturado {sortConfig.key === 'fecha_captura' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('compatibilidad')}
                      style={{ padding: '0.85rem 1rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                    >
                      Afín {sortConfig.key === 'compatibilidad' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedResults(results).map(job => {
                    const isAdded = job.ya_agregado
                    const isConverting = convertingId === job.id
                    const capturaDate = job.fecha_captura
                      ? new Date(job.fecha_captura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                      : 'Ahora'

                    return (
                      <tr key={job.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{job.puesto}</div>
                          {job.descripcion_corta && (
                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                              {job.descripcion_corta.slice(0, 130)}...
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{job.empresa}</div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{job.ubicacion}</div>
                          <span className="badge badge-blue" style={{ marginTop: '4px', fontSize: '0.65rem', textTransform: 'capitalize' }}>
                            {job.modalidad}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: 'var(--fs-xs)' }}>
                          <div style={{ fontWeight: 600 }}>{job.salario || 'No reporta'}</div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{job.seniority || '—'}</div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                          <div>{job.fecha_texto || 'Reciente'}</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {job.postulantes ? `${job.postulantes}` : '—'}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>
                          {new Date(job.fecha_captura || new Date()).toLocaleDateString('es-CO')} · {capturaDate}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            className="badge badge-green"
                            style={{
                              fontSize: 'var(--fs-xs)', fontWeight: 800,
                              background: job.compatibilidad >= 80 ? '#dcf5e6' : 'var(--c-blue-tint)',
                              color: job.compatibilidad >= 80 ? 'var(--c-green)' : 'var(--c-blue-dark)'
                            }}
                          >
                            {job.compatibilidad}%
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {job.link && (
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ marginRight: '0.5rem', color: 'var(--c-blue-light)', fontWeight: 600, fontSize: 'var(--fs-xs)' }}
                            >
                              Ver ↗
                            </a>
                          )}
                          <button
                            onClick={() => handleConvertToProcess(job.id)}
                            disabled={isAdded || isConverting}
                            style={{
                              background: isAdded ? 'var(--c-blue-tint)' : 'var(--c-blue-dark)',
                              color: isAdded ? 'var(--c-blue-dark)' : '#fff',
                              border: 'none',
                              padding: '0.3rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 600,
                              fontSize: 'var(--fs-xs)',
                              cursor: isAdded ? 'default' : 'pointer',
                              marginRight: '0.35rem'
                            }}
                          >
                            {isAdded ? '✓' : isConverting ? '...' : '+'}
                          </button>
                          <button
                            onClick={() => handleDeleteResult(job.id)}
                            title="Eliminar este resultado"
                            style={{ background: 'none', border: 'none', color: 'var(--c-red)', fontSize: 'var(--fs-xs)', fontWeight: 700, cursor: 'pointer', padding: '0.3rem 0.4rem' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
