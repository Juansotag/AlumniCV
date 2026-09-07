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

    const systemPrompt = `Eres un Asesor Ejecutivo Senior de Empleabilidad y Headhunter Corporativo de Alumni Sabana (Universidad de La Sabana).
Tu especialidad es redactar documentos de postulación ejecutiva de altísimo impacto, persuasión profesional y alineación rigurosa con filtros ATS (Applicant Tracking Systems) y directores de Selección de Talento.

PRINCIPIOS FUNDAMENTALES DE REDACCIÓN EJECUTIVA:
1. TONO: Formal, sofisticado, persuasivo, seguro y orientado a resultados. En español impecable y culto.
2. PROHIBICIÓN DE CLICHÉS: Queda estrictamente prohibido usar frases vagas como "persona proactiva", "apasionado por", "con ganas de aprender", "dinámico y motivado". Toda afirmación debe sustentarse en hechos, competencias y valor agregado concreto.
3. MÉTRICAS Y LOGROS (MÉTODO STAR / GOOGLE X-Y-Z): Al describir experiencias laborales, cada punto debe reflejar responsabilidades estratégicas e hitos de impacto medible (usando verbos de acción en tercera persona: "Lideró", "Implementó", "Optimizó", "Diseñó", "Estructuró").
4. CARTA DE PRESENTACIÓN EJECUTIVA:
   - Debe constar de 3 a 4 párrafos sustanciales, elocuentes y personalizados para la empresa.
   - Párrafo 1: Postulación formal al cargo en la empresa, demostrando conocimiento de su industria y planteando la propuesta de valor del candidato.
   - Párrafo 2: Exposición del mayor logro o trayectoria más relevante del candidato directamente vinculada al desafío principal del puesto.
   - Párrafo 3: Sinergia de habilidades técnicas, visión estratégica y alineación con la cultura corporativa de la organización.
   - Párrafo 4: Agradecimiento formal por la evaluación, reiterando disposición para entrevista ejecutiva y cierre protocolario formal.
5. CORREO DE POSTULACIÓN:
   - Asunto profesional, directo y pulcro.
   - Cuerpo conciso (2 párrafos ejecutivos), formal, que invite cordialmente a revisar los documentos adjuntos (Hoja de Vida y Carta de Presentación) y facilite canales de contacto.`

    const promptGen = `
Adapta el perfil profesional del siguiente candidato para postularse con máxima ventaja competitiva a la vacante objetivo.

DATOS DE LA VACANTE OBJETIVO:
- Empresa: ${application.empresa}
- Cargo / Rol: ${application.puesto}
- Descripción / Requisitos: ${application.descripcion_corta || 'No especificada'}
- Modalidad de trabajo: ${application.modalidad || 'Híbrida'}

DATOS DEL CANDIDATO (ALUMNI):
- Nombre completo: ${profile.nombre || 'Candidato UniSabana'}
- Resumen actual: ${profile.resumen || ''}
- Experiencias laborales: ${JSON.stringify(profile.experiencia || [])}
- Formación académica: ${JSON.stringify(profile.educacion_formal || [])}
- Habilidades técnicas y herramientas: ${JSON.stringify(profile.habilidades_tecnicas || [])}

INSTRUCCIONES ESPECÍFICAS DE GENERACIÓN:
1. "resumen_adaptado": Redacta un perfil ejecutivo de 3 a 4 oraciones de alto impacto:
   - Oración 1: Título profesional, trayectoria y núcleo de especialidad alineado a ${application.puesto}.
   - Oración 2: Dominio técnico de las principales herramientas y metodologías demandadas por ${application.empresa}.
   - Oración 3: Mayor factor de diferenciación o hito de impacto comprobado.
2. "experiencia_adaptada": Conserva todas las empresas, cargos y fechas del candidato. Reescribe cada descripción en viñetas o párrafos contundentes con enfoque STAR, resaltando responsabilidades e impacto cuantificable relevante para ${application.puesto}.
3. "palabras_clave_destacadas": Lista de 5 a 8 palabras clave ATS estratégicas comunes entre el perfil del candidato y la vacante de ${application.puesto}.
4. "cover_letter": Redacta una carta de presentación completa, altamente personalizada para ${application.empresa}, elegante y persuasiva (3 a 4 párrafos completos).
5. "correo": Redacta el asunto y cuerpo de correo ejecutivo para el envío formal de la postulación y adjuntos.

Devuelve estrictamente un objeto JSON con el siguiente esquema exacto:
{
  "cv": {
    "resumen_adaptado": "string",
    "experiencia_adaptada": [
      {
        "empresa": "string",
        "cargo": "string",
        "desde": "string",
        "hasta": "string",
        "descripcion": "string"
      }
    ],
    "palabras_clave_destacadas": ["string"]
  },
  "cover_letter": "string",
  "correo": {
    "asunto": "string",
    "cuerpo": "string"
  }
}
`

    console.log('[LLM] Generando contenido de documentos de alta calidad ejecutiva...')
    const llmResult = await completeJson(promptGen, {
      model: process.env.OPENAI_MODEL_FRONTIER || 'gpt-4o',
      systemPrompt
    })
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
