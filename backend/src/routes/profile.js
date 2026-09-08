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

    // Sanitización defensiva de tipos y longitudes
    const safeNombre = typeof nombre === 'string' && nombre.trim()
      ? nombre.trim().slice(0, 150)
      : null

    const safeResumen = typeof resumen === 'string'
      ? resumen.trim().slice(0, 10000)
      : ''

    const safeExperiencia = (Array.isArray(experiencia) ? experiencia : [])
      .slice(0, 50)
      .filter(e => e && typeof e === 'object')

    const safeEducacionFormal = (Array.isArray(educacion_formal) ? educacion_formal : [])
      .slice(0, 30)
      .filter(e => e && typeof e === 'object')

    const safeFormacionNoFormal = (Array.isArray(formacion_no_formal) ? formacion_no_formal : [])
      .slice(0, 30)
      .filter(e => e && typeof e === 'object')

    const safeCertificaciones = (Array.isArray(certificaciones) ? certificaciones : [])
      .slice(0, 30)
      .filter(c => c && typeof c === 'object')

    const safeIdiomas = (Array.isArray(idiomas) ? idiomas : [])
      .slice(0, 20)
      .filter(i => i && typeof i === 'object')

    const safeHabilidadesTecnicas = (Array.isArray(habilidades_tecnicas) ? habilidades_tecnicas : [])
      .slice(0, 100)
      .map(h => {
        if (typeof h === 'string') {
          return { categoria: 'software', nombre: h.trim().slice(0, 80), nivel: 'avanzado' }
        }
        if (h && typeof h === 'object') {
          return {
            categoria: String(h.categoria || 'software').slice(0, 50),
            nombre: String(h.nombre || h.habilidad || '').trim().slice(0, 80),
            nivel: String(h.nivel || 'avanzado').slice(0, 30)
          }
        }
        return null
      })
      .filter(h => h && h.nombre)

    const safeHabilidadesBlandas = (Array.isArray(habilidades_blandas) ? habilidades_blandas : [])
      .slice(0, 50)
      .map(b => typeof b === 'string' ? b.trim().slice(0, 80) : (b?.nombre ? String(b.nombre).slice(0, 80) : ''))
      .filter(Boolean)

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
        safeNombre,
        safeResumen,
        JSON.stringify(safeExperiencia),
        JSON.stringify(safeEducacionFormal),
        JSON.stringify(safeFormacionNoFormal),
        JSON.stringify(safeCertificaciones),
        JSON.stringify(safeIdiomas),
        JSON.stringify(safeHabilidadesTecnicas),
        JSON.stringify(safeHabilidadesBlandas),
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
