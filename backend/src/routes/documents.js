import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db/index.js'
import { completeJson } from '../llm/client.js'
import {
  generateCvDocx,
  generateCoverLetterDocx,
  generateEmailDocx
} from '../services/documentGenerator.js'
import { uploadDocumento } from '../lib/storage.js'

const router = Router()

/**
 * GET /api/documents
 * Obtiene la lista de todos los documentos generados por el usuario.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.id, d.application_id, d.tipo, d.nombre_archivo, d.file_url, d.created_at,
              a.empresa, a.puesto, a.link AS vacante_link
       FROM documents d
       JOIN applications a ON d.application_id = a.id
       WHERE d.usuario_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    )
    res.json({ documents: rows })
  } catch (err) {
    console.error('Error en GET /api/documents:', err.message)
    res.status(500).json({ error: 'Error al obtener los documentos' })
  }
})

/**
 * POST /api/documents/generate
 * Genera documentos (.docx) personalizados para una vacante específica usando Claude LLM.
 * Body: { application_id, tipo: 'cv' | 'cover_letter' | 'correo' | 'todos' }
 */
router.post('/generate', requireAuth, async (req, res) => {
  const { application_id, tipo = 'todos' } = req.body

  if (!application_id) {
    return res.status(400).json({ error: 'application_id es requerido' })
  }

  try {
    // 1. Cargar aplicación
    const { rows: [application] } = await query(
      `SELECT * FROM applications WHERE id = $1 AND usuario_id = $2`,
      [application_id, req.user.id]
    )
    if (!application) return res.status(404).json({ error: 'Aplicación no encontrada' })

    // 2. Cargar perfil del usuario
    const { rows: [profile] } = await query(
      `SELECT * FROM usuarios WHERE id = $1`,
      [req.user.id]
    )
    if (!profile) return res.status(404).json({ error: 'Perfil de usuario no encontrado' })

    const promptGen = `
Actúa como un experto en redacción de hojas de vida y reclutamiento corporativo.
Adapta la información del perfil profesional de un candidato para aplicar a una vacante específica.

DATOS DE LA VACANTE:
- Empresa: ${application.empresa}
- Cargo: ${application.puesto}
- Descripción / Notas: ${application.descripcion_corta || 'No especificada'}
- Modalidad: ${application.modalidad || 'Híbrida'}

PERFIL DEL CANDIDATO:
- Nombre: ${profile.nombre || 'Candidato UniSabana'}
- Resumen: ${profile.resumen || ''}
- Experiencia: ${JSON.stringify(profile.experiencia || [])}
- Educación: ${JSON.stringify(profile.educacion_formal || [])}
- Habilidades Técnicas: ${JSON.stringify(profile.habilidades_tecnicas || [])}

Genera un JSON con el siguiente esquema exacto:
{
  "cv": {
    "resumen_adaptado": "Un resumen ejecutivo impactante adaptado exactamente a esta vacante de ${application.puesto} en ${application.empresa}",
    "experiencia_adaptada": [
      {
        "empresa": "Nombre Empresa",
        "cargo": "Cargo ocupado",
        "desde": "Año",
        "hasta": "Año",
        "descripcion": "Descripción con logros cuantificables y palabras clave relevantes para la vacante"
      }
    ],
    "palabras_clave_destacadas": ["Palabra1", "Palabra2", "Palabra3", "Palabra4", "Palabra5"]
  },
  "cover_letter": "Texto completo de una Carta de Presentación formal, persuasiva y profesional (3 a 4 párrafos) dirigida al equipo de selección de ${application.empresa} para la posición de ${application.puesto}.",
  "correo": {
    "asunto": "Postulación a ${application.puesto} - ${profile.nombre || 'Candidato'}",
    "cuerpo": "Texto del correo formal de postulación adjuntando hoja de vida y carta de presentación."
  }
}
`

    console.log('🤖 Generando contenido de documentos con Claude LLM...')
    const llmResult = await completeJson(promptGen)
    const generatedDocs = []

    const apellido = (profile.nombre || 'Candidato').split(' ').slice(-1)[0] || 'Alumni'
    const shortId = application_id.toString().slice(-6)
    const slugify = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 20)

    // A. Generar CV adaptado
    if (tipo === 'cv' || tipo === 'todos') {
      const cvBuffer = await generateCvDocx(profile, application, llmResult.cv || {})
      const filename = `${slugify(apellido)}_CV_${slugify(application.empresa)}_${shortId}.docx`
      const fileUrl = await uploadDocumento(cvBuffer, `documents/${req.user.id}/${filename}`)

      const { rows: [doc] } = await query(
        `INSERT INTO documents (application_id, usuario_id, tipo, nombre_archivo, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [application_id, req.user.id, 'cv', filename, fileUrl]
      )
      generatedDocs.push(doc)
    }

    // B. Generar Cover Letter
    if (tipo === 'cover_letter' || tipo === 'todos') {
      const clBuffer = await generateCoverLetterDocx(profile, application, llmResult.cover_letter || '')
      const filename = `${slugify(apellido)}_CartaPresentacion_${slugify(application.empresa)}_${shortId}.docx`
      const fileUrl = await uploadDocumento(clBuffer, `documents/${req.user.id}/${filename}`)

      const { rows: [doc] } = await query(
        `INSERT INTO documents (application_id, usuario_id, tipo, nombre_archivo, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [application_id, req.user.id, 'cover_letter', filename, fileUrl]
      )
      generatedDocs.push(doc)
    }

    // C. Generar Correo de Postulación
    if (tipo === 'correo' || tipo === 'todos') {
      const emailBuffer = await generateEmailDocx(profile, application, llmResult.correo || {})
      const filename = `${slugify(apellido)}_CorreoPostulacion_${slugify(application.empresa)}_${shortId}.docx`
      const fileUrl = await uploadDocumento(emailBuffer, `documents/${req.user.id}/${filename}`)

      const { rows: [doc] } = await query(
        `INSERT INTO documents (application_id, usuario_id, tipo, nombre_archivo, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [application_id, req.user.id, 'correo', filename, fileUrl]
      )
      generatedDocs.push(doc)
    }

    res.status(201).json({
      message: 'Documentos generados exitosamente',
      documents: generatedDocs
    })
  } catch (err) {
    console.error('Error en POST /api/documents/generate:', err.message)
    res.status(500).json({ error: 'Error al generar documentos: ' + err.message })
  }
})

/**
 * DELETE /api/documents/:id
 * Elimina un documento generado.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  try {
    const { rowCount } = await query(
      `DELETE FROM documents WHERE id = $1 AND usuario_id = $2`,
      [id, req.user.id]
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Documento no encontrado' })
    res.json({ message: 'Documento eliminado' })
  } catch (err) {
    console.error('Error en DELETE /api/documents/:id:', err.message)
    res.status(500).json({ error: 'Error al eliminar el documento' })
  }
})

export default router
