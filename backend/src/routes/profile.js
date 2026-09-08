import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db/index.js'

const router = Router()

/**
 * GET /api/profile
 * Perfil completo unificado del usuario + su CV activo + su assessment más reciente.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows: [usuario] } = await query(
      `SELECT id, correo, nombre, titular, correo_personal, telefono, ubicacion,
              resumen, links, experiencia, educacion_formal,
              certificaciones, formacion_no_formal, idiomas,
              habilidades_tecnicas, habilidades_blandas,
              referencias_laborales, referencias_personales,
              created_at, updated_at
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
 * Actualiza los campos unificados del Perfil Maestro (datos personales, correo personal,
 * enlaces/redes, referencias laborales/personales, experiencia, educación, etc.).
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const {
      nombre,
      titular = '',
      resumen = '',
      correo_personal = '',
      telefono = '',
      ubicacion = 'Bogotá, Colombia',
      links = {},
      experiencia = [],
      educacion_formal = [],
      formacion_no_formal = [],
      certificaciones = [],
      idiomas = [],
      habilidades_tecnicas = [],
      habilidades_blandas = [],
      referencias_laborales = [],
      referencias_personales = []
    } = req.body

    // Sanitización defensiva de tipos y longitudes
    const safeNombre = typeof nombre === 'string' && nombre.trim()
      ? nombre.trim().slice(0, 150)
      : null

    const safeTitular = typeof titular === 'string'
      ? titular.trim().slice(0, 150)
      : ''

    const safeResumen = typeof resumen === 'string'
      ? resumen.trim().slice(0, 10000)
      : ''

    const safeCorreoPersonal = typeof correo_personal === 'string'
      ? correo_personal.trim().slice(0, 120)
      : ''

    const safeTelefono = typeof telefono === 'string'
      ? telefono.trim().slice(0, 40)
      : ''

    const safeUbicacion = typeof ubicacion === 'string'
      ? ubicacion.trim().slice(0, 100)
      : 'Bogotá, Colombia'

    // Sanitizar lista de enlaces y redes sociales dinámicas
    let safeLinks = []
    if (Array.isArray(links)) {
      safeLinks = links
        .slice(0, 30)
        .filter(l => l && typeof l === 'object')
        .map(l => ({
          red: String(l.red || l.nombre || '').trim().slice(0, 100),
          url: String(l.url || l.link || '').trim().slice(0, 500)
        }))
        .filter(l => l.red || l.url)
    } else if (links && typeof links === 'object') {
      safeLinks = Object.entries(links)
        .filter(([_, v]) => Boolean(v))
        .map(([k, v]) => ({
          red: String(k).trim().slice(0, 100),
          url: String(v).trim().slice(0, 500)
        }))
    }

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

    const safeReferenciasLaborales = (Array.isArray(referencias_laborales) ? referencias_laborales : [])
      .slice(0, 20)
      .filter(r => r && typeof r === 'object')
      .map(r => ({
        empresa: String(r.empresa || '').trim().slice(0, 100),
        nombre: String(r.nombre || '').trim().slice(0, 120),
        cargo_referente: String(r.cargo_referente || r.cargo || '').trim().slice(0, 100),
        telefono: String(r.telefono || '').trim().slice(0, 40),
        correo: String(r.correo || '').trim().slice(0, 120),
        relacion: String(r.relacion || 'Jefe inmediato').trim().slice(0, 60),
        notas: String(r.notas || '').trim().slice(0, 300)
      }))

    const safeReferenciasPersonales = (Array.isArray(referencias_personales) ? referencias_personales : [])
      .slice(0, 20)
      .filter(r => r && typeof r === 'object')
      .map(r => ({
        nombre: String(r.nombre || '').trim().slice(0, 120),
        profesion: String(r.profesion || r.ocupacion || '').trim().slice(0, 100),
        telefono: String(r.telefono || '').trim().slice(0, 40),
        correo: String(r.correo || '').trim().slice(0, 120),
        relacion: String(r.relacion || 'Amigo').trim().slice(0, 60)
      }))

    const { rows: [usuario] } = await query(
      `UPDATE usuarios SET
         nombre = COALESCE($1, nombre),
         titular = $2,
         resumen = $3,
         correo_personal = $4,
         telefono = $5,
         ubicacion = $6,
         links = $7,
         experiencia = $8,
         educacion_formal = $9,
         formacion_no_formal = $10,
         certificaciones = $11,
         idiomas = $12,
         habilidades_tecnicas = $13,
         habilidades_blandas = $14,
         referencias_laborales = $15,
         referencias_personales = $16
       WHERE id = $17
       RETURNING id, correo, nombre, titular, correo_personal, telefono, ubicacion,
                 resumen, links, experiencia, educacion_formal,
                 certificaciones, formacion_no_formal, idiomas,
                 habilidades_tecnicas, habilidades_blandas,
                 referencias_laborales, referencias_personales,
                 created_at, updated_at`,
      [
        safeNombre,
        safeTitular,
        safeResumen,
        safeCorreoPersonal,
        safeTelefono,
        safeUbicacion,
        JSON.stringify(safeLinks),
        JSON.stringify(safeExperiencia),
        JSON.stringify(safeEducacionFormal),
        JSON.stringify(safeFormacionNoFormal),
        JSON.stringify(safeCertificaciones),
        JSON.stringify(safeIdiomas),
        JSON.stringify(safeHabilidadesTecnicas),
        JSON.stringify(safeHabilidadesBlandas),
        JSON.stringify(safeReferenciasLaborales),
        JSON.stringify(safeReferenciasPersonales),
        req.user.id
      ]
    )

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    res.json({ message: 'Perfil unificado actualizado exitosamente', usuario })
  } catch (err) {
    console.error('Error en PUT /api/profile:', err.message)
    res.status(500).json({ error: 'Error al actualizar el perfil: ' + err.message })
  }
})

export default router
