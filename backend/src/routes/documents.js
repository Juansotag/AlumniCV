import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
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
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, '../../uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const docUpload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase()
    const isDocx = ext.endsWith('.docx') || file.mimetype.includes('word') || file.mimetype.includes('officedocument')
    const isPdf = ext.endsWith('.pdf') || file.mimetype.includes('pdf')
    if (!isDocx && !isPdf) {
      return cb(new Error('Solo se permiten archivos en formato Word (.docx) o PDF (.pdf)'))
    }
    cb(null, true)
  }
})

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

  const ALLOWED_TIPOS = ['cv', 'cover_letter', 'correo', 'todos']
  if (!ALLOWED_TIPOS.includes(tipo)) {
    return res.status(400).json({
      error: `Tipo de documento inválido: "${tipo}". Los tipos válidos son: ${ALLOWED_TIPOS.join(', ')}`
    })
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
   - Cuerpo conciso (2 párrafos ejecutivos), formal, que invite cordialmente a revisar los documentos adjuntos (Hoja de Vida y Carta de Presentación) y facilite canales de contacto.
6. HOJA DE VIDA EJECUTIVA (DENSIDAD PROFESIONAL Y LONGITUD DE 1 A 2 PÁGINAS):
   - Densidad y estructura ejecutiva: Una hoja de vida corporativa de alto impacto NUNCA es diminuta ni escueta.
   - Para CADA cargo laboral, DEBES desglosar OBLIGATORIAMENTE entre 3 y 5 viñetas (bullets) sustanciales, profundas y exhaustivas en el array "logros". Queda estrictamente prohibido generar un solo resumen o una única viñeta por cargo.
   - Cada viñeta laboral debe tener entre 20 y 45 palabras y estructurarse bajo el método STAR (Situación, Tarea, Acción, Resultado medible), empleando verbos de acción en tercera persona ("Lideró", "Diseñó", "Estructuró", "Negoció", "Optimizó") e incorporando métricas cuantificables (%, cifras, presupuestos, población atendida, indicadores de impacto).
   - Para CADA grado de educación formal, DEBES generar en el array "detalles" de 1 a 2 viñetas que expongan la tesis de grado o investigación aplicada, honores/distinciones académicas, o énfasis temático directamente conectado con el puesto.
   - Perfil profesional sólido (4 a 6 líneas) que sintetice años de experiencia, especialidad de dominio, competencias diferenciales y propuesta de valor hacia la empresa.`

    const promptGen = `
DATOS DE LA VACANTE OBJETIVO:
- Empresa: ${application.empresa}
- Cargo / Rol: ${application.puesto}
- Descripción / Requisitos: ${application.descripcion_corta || 'No especificada'}
- Modalidad de trabajo: ${application.modalidad || 'Híbrida'}
- Seniority: ${application.seniority || 'No especificado'}

DATOS DEL CANDIDATO (PERFIL MAESTRO INTEGRAL):
- Nombre completo: ${profile.nombre || 'Candidato UniSabana'}
- Titular actual: ${profile.titular || 'Profesional'}
- Ubicación: ${profile.ubicacion || 'Bogotá, Colombia'}
- Teléfono: ${profile.telefono || 'No especificado'}
- Correo institucional: ${profile.correo || 'No especificado'}
- Correo personal: ${profile.correo_personal || 'No especificado'}
- Enlaces y redes: ${JSON.stringify(profile.links || [])}
- Resumen maestro: ${profile.resumen || ''}
- Historial completo de experiencias laborales: ${JSON.stringify(profile.experiencia || [])}
- Educación formal (Pregrados, Posgrados, Maestrías): ${JSON.stringify(profile.educacion_formal || [])}
- Formación no formal (Diplomados, Minors, Cursos de especialización): ${JSON.stringify(profile.formacion_no_formal || [])}
- Certificaciones profesionales y licencias: ${JSON.stringify(profile.certificaciones || [])}
- Habilidades técnicas y herramientas categorizadas: ${JSON.stringify(profile.habilidades_tecnicas || [])}
- Habilidades blandas y de liderazgo: ${JSON.stringify(profile.habilidades_blandas || [])}
- Idiomas y niveles: ${JSON.stringify(profile.idiomas || [])}
- Referencias laborales y personales: ${JSON.stringify([...(profile.referencias_laborales || []), ...(profile.referencias_personales || [])])}

INSTRUCCIONES ESPECÍFICAS DE GENERACIÓN Y CURADURÍA ESTRATÉGICA:
El Perfil Maestro del candidato es su inventario profesional completo. Tu rol como headhunter senior de clase mundial es CURAR y ADAPTAR estratégicamente la información para maximizar las probabilidades de entrevista para ${application.puesto} en ${application.empresa}:
1. "titular_adaptado": Título profesional y de especialidad adaptado con máxima precisión a ${application.puesto}, combinando la formación y trayectoria del candidato.
2. "resumen_adaptado": Redacta un perfil ejecutivo de 4 a 6 líneas de altísimo impacto, sin clichés, resaltando la propuesta de valor diferencial y las capacidades operativas y estratégicas que aporta a ${application.empresa}.
3. "experiencia_adaptada": DEBES incluir TODAS las experiencias laborales presentes en el Perfil Maestro (no omitas ningún cargo ni empresa del historial). Para CADA experiencia laboral, genera un objeto que conserve empresa, cargo, fechas y modalidad de trabajo, y un array "logros" con OBLIGATORIAMENTE entre 3 y 5 viñetas (bullets) detalladas, profundas y contundentes (de 25 a 45 palabras cada una) redactadas con el método STAR (Situación, Tarea, Acción, Resultado con métricas cuantificables %, herramientas y contexto). Queda TERMINANTEMENTE PROHIBIDO resumir un cargo en una sola viñeta o en un párrafo corto.
4. "educacion_adaptada": DEBES incluir TODOS los títulos de educación formal del Perfil Maestro (pregrados, especializaciones y maestrías). Para CADA título, genera un objeto con titulo, institucion, periodo y un array "detalles" con OBLIGATORIAMENTE 2 a 3 viñetas que expongan la tesis de investigación aplicada, proyectos académicos, distinciones o áreas de profundización de alta afinidad con ${application.puesto}.
5. "habilidades_tecnicas_destacadas": Selecciona y ordena las 6 a 10 habilidades técnicas y herramientas del Perfil Maestro que mayor relevancia tienen para la vacante de ${application.puesto}.
6. "habilidades_blandas_destacadas": Selecciona las 4 a 6 competencias conductuales y de liderazgo más pertinentes para el rol.
7. "certificaciones_destacadas": Selecciona las certificaciones y licencias del candidato que respalden su idoneidad para el puesto.
8. "formacion_no_formal_destacada": Selecciona los diplomados, minors y programas de especialización más afines al puesto.
9. "idiomas_destacados": Lista de idiomas del candidato con su nivel.
10. "palabras_clave_destacadas": Lista de 6 a 10 palabras clave ATS estratégicas coincidentes entre el perfil y la vacante.
11. "cover_letter": Redacta una carta de presentación completa, altamente personalizada para ${application.empresa}, elocuente, persuasiva y formal (3 a 4 párrafos que expongan logros concretos y afinidad de propósito).
12. "correo": Redacta el asunto y cuerpo de correo ejecutivo para el envío formal de la postulación y adjuntos.

Devuelve estrictamente un objeto JSON con el siguiente esquema exacto:
{
  "cv": {
    "titular_adaptado": "string",
    "resumen_adaptado": "string",
    "experiencia_adaptada": [
      {
        "empresa": "string",
        "cargo": "string",
        "desde": "string",
        "hasta": "string",
        "modalidad": "string o null",
        "logros": [
          "string (viñeta 1 detallada STAR)",
          "string (viñeta 2 detallada STAR)",
          "string (viñeta 3 detallada STAR)",
          "string (viñeta 4 detallada STAR)"
        ]
      }
    ],
    "educacion_adaptada": [
      {
        "titulo": "string",
        "institucion": "string",
        "periodo": "string",
        "detalles": [
          "string (tesis, proyecto de investigación o logro académico 1)",
          "string (distinción o área de profundización 2)"
        ]
      }
    ],
    "habilidades_tecnicas_destacadas": ["string"],
    "habilidades_blandas_destacadas": ["string"],
    "certificaciones_destacadas": [
      {
        "nombre": "string",
        "entidad_emisora": "string o null",
        "anio": "string o null"
      }
    ],
    "formacion_no_formal_destacada": [
      {
        "nombre": "string",
        "tipo": "string o null",
        "institucion": "string o null",
        "anio": "string o null"
      }
    ],
    "idiomas_destacados": [
      {
        "idioma": "string",
        "nivel": "string"
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
    const safeLlmResult = llmResult && typeof llmResult === 'object' ? llmResult : {}
    const generatedDocs = []

    const apellido = (profile.nombre || 'Candidato').split(' ').slice(-1)[0] || 'Alumni'
    const shortId = application_id.toString().slice(-6)
    const slugify = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 20)

    // A. Generar CV adaptado
    if (tipo === 'cv' || tipo === 'todos') {
      const cvBuffer = await generateCvDocx(profile, application, safeLlmResult.cv || {})
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
      const clBuffer = await generateCoverLetterDocx(profile, application, safeLlmResult.cover_letter || '')
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
      const emailBuffer = await generateEmailDocx(profile, application, safeLlmResult.correo || {})
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

/**
 * GET /api/documents/:id/file
 * Proxy autenticado para obtener el binario del documento sin restricciones de CORS.
 */
router.get('/:id/file', requireAuth, async (req, res) => {
  const { id } = req.params
  try {
    const { rows: [doc] } = await query(
      `SELECT id, nombre_archivo, file_url FROM documents WHERE id = $1 AND usuario_id = $2`,
      [id, req.user.id]
    )
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' })

    const response = await fetch(doc.file_url)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Error al obtener el archivo desde el almacenamiento' })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.nombre_archivo)}"`)

    const arrayBuffer = await response.arrayBuffer()
    res.send(Buffer.from(arrayBuffer))
  } catch (err) {
    console.error('Error en GET /api/documents/:id/file:', err.message)
    res.status(500).json({ error: 'Error al servir el documento' })
  }
})

/**
 * POST /api/documents/:id/replace
 * Reemplaza un documento generado con una versión modificada/editada por el usuario (.docx o .pdf).
 */
router.post('/:id/replace', requireAuth, docUpload.single('file'), async (req, res) => {
  const { id } = req.params

  if (!req.file) {
    return res.status(400).json({ error: 'Debes seleccionar un archivo (.docx o .pdf) para reemplazar el documento' })
  }

  const filePath = req.file.path

  try {
    // 1. Validar propiedad del documento
    const { rows: [doc] } = await query(
      `SELECT d.*, a.empresa, a.puesto 
       FROM documents d
       JOIN applications a ON d.application_id = a.id
       WHERE d.id = $1 AND d.usuario_id = $2`,
      [id, req.user.id]
    )

    if (!doc) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      return res.status(404).json({ error: 'Documento no encontrado o no autorizado' })
    }

    // 2. Sanitizar nombre de archivo
    let originalName = req.file.originalname || doc.nombre_archivo || 'documento_editado.docx'
    try {
      const decoded = Buffer.from(originalName, 'latin1').toString('utf8')
      if (decoded && !decoded.includes('\ufffd')) {
        originalName = decoded
      }
    } catch { }

    const ext = path.extname(originalName).toLowerCase() || '.docx'
    const contentType = ext === '.pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    const fileBuffer = fs.readFileSync(filePath)
    const baseName = path.basename(originalName, ext)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 70) || 'documento'

    const storagePath = `documents/${req.user.id}/${Date.now()}-${baseName}${ext}`
    const newFileUrl = await uploadDocumento(fileBuffer, storagePath, contentType)

    // 3. Actualizar registro en Postgres
    const { rows: [updatedDoc] } = await query(
      `UPDATE documents
       SET nombre_archivo = $1, file_url = $2
       WHERE id = $3 AND usuario_id = $4
       RETURNING *`,
      [originalName, newFileUrl, id, req.user.id]
    )

    // 4. Limpiar temporal
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    res.json({
      message: 'Versión modificada subida exitosamente',
      document: {
        ...updatedDoc,
        empresa: doc.empresa,
        puesto: doc.puesto
      }
    })
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    console.error('Error en POST /api/documents/:id/replace:', err.message)
    res.status(500).json({ error: 'Error al reemplazar el documento: ' + err.message })
  }
})

export default router
