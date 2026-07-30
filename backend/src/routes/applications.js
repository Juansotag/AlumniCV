import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db/index.js'

const router = Router()

/** GET /api/applications — Lista todos los procesos del usuario */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, job_search_result_id, empresa, puesto, plataforma,
              descripcion_corta, salario_expectativa, postulantes, seniority,
              ubicacion, modalidad, link, pipeline, created_at, updated_at
       FROM applications
       WHERE usuario_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    )
    res.json({ applications: rows })
  } catch (err) {
    console.error('Error en GET /api/applications:', err.message)
    res.status(500).json({ error: 'Error al obtener la lista de procesos' })
  }
})

/** POST /api/applications — Crea una nueva aplicación manualmente */
router.post('/', requireAuth, async (req, res) => {
  const {
    job_search_result_id,
    empresa,
    puesto,
    plataforma = 'Manual',
    descripcion_corta = '',
    salario_expectativa = '',
    postulantes = null,
    seniority = '',
    ubicacion = '',
    modalidad = 'hibrido',
    link = '',
    pipeline
  } = req.body

  if (!empresa || !puesto) {
    return res.status(400).json({ error: 'Empresa y Puesto son requeridos' })
  }

  const now = new Date().toISOString()
  const defaultPipeline = JSON.stringify([
    {
      id: 'init',
      tipo: 'cuadrado',
      estado: 'amarillo',
      modalidad: null,
      notas: '',
      historial: [{ estado: 'amarillo', fecha: now, nota: 'Proceso registrado' }]
    }
  ])

  try {
    const { rows: [nuevaApp] } = await query(
      `INSERT INTO applications (
         usuario_id, job_search_result_id, empresa, puesto, plataforma,
         descripcion_corta, salario_expectativa, postulantes, seniority,
         ubicacion, modalidad, link, pipeline
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
       RETURNING *`,
      [
        req.user.id,
        job_search_result_id || null,
        empresa,
        puesto,
        plataforma,
        descripcion_corta,
        salario_expectativa,
        postulantes,
        seniority,
        ubicacion,
        modalidad,
        link,
        pipeline ? JSON.stringify(pipeline) : defaultPipeline
      ]
    )
    res.status(201).json({ application: nuevaApp })
  } catch (err) {
    console.error('Error en POST /api/applications:', err.message)
    res.status(500).json({ error: 'Error al crear el proceso' })
  }
})

/** POST /api/applications/bulk — Agrega múltiples vacantes de búsqueda de una vez */
router.post('/bulk', requireAuth, async (req, res) => {
  const { result_ids } = req.body
  if (!Array.isArray(result_ids) || result_ids.length === 0) {
    return res.status(400).json({ error: 'result_ids debe ser un array no vacío' })
  }

  try {
    // Obtener resultados de búsqueda
    const { rows: results } = await query(
      `SELECT * FROM job_search_results WHERE id = ANY($1::uuid[])`,
      [result_ids]
    )

    // Verificar cuáles ya están en la lista del usuario (evitar duplicados)
    const { rows: existing } = await query(
      `SELECT job_search_result_id FROM applications
       WHERE usuario_id = $1 AND job_search_result_id = ANY($2::uuid[])`,
      [req.user.id, result_ids]
    )
    const existingIds = new Set(existing.map(r => r.job_search_result_id))

    const newApps = []
    const now = new Date().toISOString()

    for (const result of results) {
      if (existingIds.has(result.id)) continue // Omitir duplicados

      const defaultPipeline = JSON.stringify([
        {
          id: 'init',
          tipo: 'cuadrado',
          estado: 'amarillo',
          modalidad: null,
          notas: '',
          historial: [{ estado: 'amarillo', fecha: now, nota: 'Agregado desde búsqueda' }]
        }
      ])

      const { rows: [app] } = await query(
        `INSERT INTO applications (
           usuario_id, job_search_result_id, empresa, puesto, plataforma,
           descripcion_corta, ubicacion, modalidad, link, pipeline
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
         RETURNING *`,
        [
          req.user.id,
          result.id,
          result.empresa,
          result.puesto,
          result.plataforma,
          result.descripcion_corta,
          result.ubicacion,
          result.modalidad,
          result.link,
          defaultPipeline
        ]
      )
      newApps.push(app)
    }

    res.status(201).json({
      added: newApps.length,
      skipped: result_ids.length - newApps.length,
      applications: newApps
    })
  } catch (err) {
    console.error('Error en POST /api/applications/bulk:', err.message)
    res.status(500).json({ error: 'Error al agregar procesos en lote' })
  }
})

/** PUT /api/applications/:id/pipeline — Actualiza el pipeline de fases */
router.put('/:id/pipeline', requireAuth, async (req, res) => {
  const { id } = req.params
  const { pipeline } = req.body

  if (!Array.isArray(pipeline)) {
    return res.status(400).json({ error: 'El pipeline debe ser un array de fases' })
  }

  try {
    const { rows: [appActualizada] } = await query(
      `UPDATE applications
       SET pipeline = $1::jsonb, updated_at = NOW()
       WHERE id = $2 AND usuario_id = $3
       RETURNING *`,
      [JSON.stringify(pipeline), id, req.user.id]
    )

    if (!appActualizada) {
      return res.status(404).json({ error: 'Proceso no encontrado' })
    }

    res.json({ application: appActualizada })
  } catch (err) {
    console.error('Error en PUT /api/applications/:id/pipeline:', err.message)
    res.status(500).json({ error: 'Error al actualizar el pipeline' })
  }
})

/** DELETE /api/applications/:id — Elimina una aplicación */
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params

  try {
    const { rowCount } = await query(
      `DELETE FROM applications WHERE id = $1 AND usuario_id = $2`,
      [id, req.user.id]
    )

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Proceso no encontrado' })
    }

    res.json({ message: 'Proceso eliminado correctamente' })
  } catch (err) {
    console.error('Error en DELETE /api/applications/:id:', err.message)
    res.status(500).json({ error: 'Error al eliminar el proceso' })
  }
})

export default router
