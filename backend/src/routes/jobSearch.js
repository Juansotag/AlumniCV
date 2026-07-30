import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db/index.js'
import { searchLinkedInJobs, calculateCompatibility } from '../services/jobSearch.js'

const router = Router()

/**
 * GET /api/job-search/results
 * Obtiene la lista acumulada de todos los anuncios encontrados en búsquedas del usuario.
 */
router.get('/results', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.search_id, r.plataforma, r.empresa, r.puesto, r.link, r.compatibilidad,
              r.descripcion_corta, r.postulantes, r.ubicacion, r.modalidad, r.fecha_publicacion,
              r.created_at AS fecha_captura,
              (SELECT EXISTS (
                SELECT 1 FROM applications a 
                WHERE a.usuario_id = $1 AND a.job_search_result_id = r.id
              )) AS ya_agregado
       FROM job_search_results r
       JOIN job_searches s ON r.search_id = s.id
       WHERE s.usuario_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    )
    res.json({ results: rows })
  } catch (err) {
    console.error('Error en GET /api/job-search/results:', err.message)
    res.status(500).json({ error: 'Error al obtener resultados acumulados' })
  }
})

/**
 * POST /api/job-search
 * Búsqueda de empleo en tiempo real con filtros avanzados y registro de fecha/hora de captura.
 */
router.post('/', requireAuth, async (req, res) => {
  const {
    query: searchQuery,
    location = 'Colombia',
    modalidad = 'todas',
    seniority = 'todos',
    limit = 25
  } = req.body

  if (!searchQuery) {
    return res.status(400).json({ error: 'La palabra clave de búsqueda es requerida' })
  }

  try {
    const fechaCaptura = new Date().toISOString()

    // 1. Perfil del usuario para scoring %
    const { rows: [userProfile] } = await query(
      `SELECT habilidades_tecnicas, experiencia, educacion_formal FROM usuarios WHERE id = $1`,
      [req.user.id]
    )

    // 2. Registrar la búsqueda
    const { rows: [searchRecord] } = await query(
      `INSERT INTO job_searches (usuario_id, params, status)
       VALUES ($1, $2::jsonb, 'running')
       RETURNING *`,
      [req.user.id, JSON.stringify({ query: searchQuery, location, modalidad, seniority, limit })]
    )

    // 3. Ejecutar la búsqueda avanzada en LinkedIn
    const rawJobs = await searchLinkedInJobs({
      query: searchQuery,
      location,
      modalidad,
      seniority,
      limit: Number(limit) || 25
    })

    // 4. Guardar resultados con fecha y hora exacta de captura
    const results = []
    for (const job of rawJobs) {
      // Verificar si ya existe este anuncio en el inventario del usuario (por link)
      const { rows: [existing] } = await query(
        `SELECT r.* FROM job_search_results r
         JOIN job_searches s ON r.search_id = s.id
         WHERE s.usuario_id = $1 AND r.link = $2`,
        [req.user.id, job.link]
      )

      if (existing) {
        // Ya está en el inventario de anuncios, lo omitimos para evitar duplicados acumulados
        results.push({
          ...existing,
          salario: job.salario || 'No reporta',
          seniority: job.seniority || 'No especificado',
          fecha_captura: existing.created_at
        })
        continue
      }

      const compatibilidad = calculateCompatibility(job, userProfile)

      const { rows: [insertedResult] } = await query(
        `INSERT INTO job_search_results (
          search_id, plataforma, empresa, puesto, link, compatibilidad,
          descripcion_corta, postulantes, ubicacion, modalidad, fecha_publicacion
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          searchRecord.id,
          job.plataforma,
          job.empresa,
          job.puesto,
          job.link,
          compatibilidad,
          job.descripcion_corta,
          job.postulantes || null,
          job.ubicacion,
          job.modalidad,
          job.fecha_publicacion
        ]
      )

      results.push({
        ...insertedResult,
        salario: job.salario || 'No reporta',
        seniority: job.seniority || 'No especificado',
        fecha_captura: fechaCaptura
      })
    }

    // Marcar como finalizado
    await query(
      `UPDATE job_searches SET status = 'done', completed_at = NOW() WHERE id = $1`,
      [searchRecord.id]
    )

    res.status(201).json({
      search: searchRecord,
      results: results.sort((a, b) => b.compatibilidad - a.compatibilidad)
    })
  } catch (err) {
    console.error('Error en POST /api/job-search:', err.message)
    res.status(500).json({ error: 'Error al realizar la búsqueda de vacantes: ' + err.message })
  }
})

/**
 * POST /api/job-search/convert
 * Convierte una vacante encontrada en un proceso formal de "Mis Procesos".
 */
router.post('/convert', requireAuth, async (req, res) => {
  const { result_id } = req.body

  if (!result_id) {
    return res.status(400).json({ error: 'result_id es requerido' })
  }

  try {
    const { rows: [result] } = await query(
      `SELECT * FROM job_search_results WHERE id = $1`,
      [result_id]
    )

    if (!result) {
      return res.status(404).json({ error: 'Resultado no encontrado' })
    }

    const defaultPipeline = JSON.stringify([
      {
        id: 'init',
        tipo: 'cuadrado',
        estado: 'amarillo',
        modalidad: null,
        historial: [{ estado: 'amarillo', fecha: new Date().toISOString() }]
      }
    ])

    const { rows: [newApp] } = await query(
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

    res.status(201).json({ application: newApp })
  } catch (err) {
    console.error('Error en POST /api/job-search/convert:', err.message)
    res.status(500).json({ error: 'Error al convertir vacante en proceso' })
  }
})

/**
 * DELETE /api/job-search/results/:id
 * Elimina un resultado individual de búsqueda.
 */
router.delete('/results/:id', requireAuth, async (req, res) => {
  const { id } = req.params

  try {
    const { rowCount } = await query(
      `DELETE FROM job_search_results
       WHERE id = $1
         AND search_id IN (
           SELECT id FROM job_searches WHERE usuario_id = $2
         )`,
      [id, req.user.id]
    )

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Resultado no encontrado' })
    }

    res.json({ message: 'Resultado eliminado' })
  } catch (err) {
    console.error('Error en DELETE /api/job-search/results/:id:', err.message)
    res.status(500).json({ error: 'Error al eliminar resultado' })
  }
})

export default router
