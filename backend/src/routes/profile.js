import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db/index.js'

const router = Router()

/**
 * GET /api/profile
 * Perfil completo del usuario + su CV activo + su assessment más reciente.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows: [usuario] } = await query(
      `SELECT id, correo, nombre, resumen, experiencia, educacion_formal,
              certificaciones, formacion_no_formal, idiomas,
              habilidades_tecnicas, habilidades_blandas, created_at, updated_at
       FROM usuarios WHERE id = $1`,
      [req.user.id]
    )
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    const { rows: [cvActivo] } = await query(
      `SELECT id, url, created_at FROM cv_files WHERE usuario_id = $1 AND activa = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    )

    const { rows: [ultimoAssessment] } = await query(
      `SELECT id, respuesta_json, pdf_url, created_at FROM cv_assessments
       WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    )

    res.json({ usuario, cv_activo: cvActivo ?? null, ultimo_assessment: ultimoAssessment ?? null })
  } catch (err) {
    console.error('Error en GET /api/profile:', err.message)
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
})

export default router
