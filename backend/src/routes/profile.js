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

/**
 * PUT /api/profile
 * Actualiza los campos del Perfil Maestro (experiencia extendida, educación formal e informal,
 * habilidades categorizadas, certificaciones y resumen).
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const {
      nombre,
      resumen,
      experiencia = [],
      educacion_formal = [],
      formacion_no_formal = [],
      certificaciones = [],
      idiomas = [],
      habilidades_tecnicas = [],
      habilidades_blandas = []
    } = req.body

    const { rows: [usuario] } = await query(
      `UPDATE usuarios SET
         nombre = COALESCE($1, nombre),
         resumen = $2,
         experiencia = $3,
         educacion_formal = $4,
         formacion_no_formal = $5,
         certificaciones = $6,
         idiomas = $7,
         habilidades_tecnicas = $8,
         habilidades_blandas = $9
       WHERE id = $10
       RETURNING id, correo, nombre, resumen, experiencia, educacion_formal,
                 certificaciones, formacion_no_formal, idiomas,
                 habilidades_tecnicas, habilidades_blandas, created_at, updated_at`,
      [
        nombre || null,
        resumen || '',
        JSON.stringify(Array.isArray(experiencia) ? experiencia : []),
        JSON.stringify(Array.isArray(educacion_formal) ? educacion_formal : []),
        JSON.stringify(Array.isArray(formacion_no_formal) ? formacion_no_formal : []),
        JSON.stringify(Array.isArray(certificaciones) ? certificaciones : []),
        JSON.stringify(Array.isArray(idiomas) ? idiomas : []),
        JSON.stringify(Array.isArray(habilidades_tecnicas) ? habilidades_tecnicas : []),
        JSON.stringify(Array.isArray(habilidades_blandas) ? habilidades_blandas : []),
        req.user.id
      ]
    )

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    res.json({ message: 'Perfil maestro actualizado exitosamente', usuario })
  } catch (err) {
    console.error('Error en PUT /api/profile:', err.message)
    res.status(500).json({ error: 'Error al actualizar el perfil: ' + err.message })
  }
})

export default router
