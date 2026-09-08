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

    const systemPrompt = `Eres el Asesor Ejecutivo Principal de Empleabilidad de Alta Dirección y Headhunter Corporativo Senior de Alumni Sabana (Universidad de La Sabana).
Tu especialidad es redactar documentos de postulación ejecutiva de nivel Fortune 500 y Big Tech, logrando una tasa del 100% de éxito en filtros ATS (Applicant Tracking Systems) y causando una impresión excepcional ante Directores de Talento, VPs y Comités de Contratación.

PRINCIPIOS FUNDAMENTALES DE REDACCIÓN EJECUTIVA:
1. TONO: Formal, de alta autoridad intelectual, sofisticado, persuasivo, seguro y orientado a resultados medibles. En español impecable y culto.
2. PRESERVACIÓN Y AMPLIFICACIÓN DE MÉTRICAS Y KPIs REALES (REGLA DE ORO):
   - Queda TERMINANTEMENTE PROHIBIDO omitir, diluir, ignorar o reemplazar por generalidades las métricas numéricas, porcentajes, cifras monetarias, volúmenes de registros/datos, tecnologías específicas y nombres propios de clientes o instituciones que el candidato ha consignado en su perfil.
   - Toda cifra o métrica mencionada por el candidato (e.g. "450.000 registros", "USD 1 millón en medios", "40 municipios", "100 startups", "150 estudiantes", etc.) y entidades aliadas (ICBF, UNICEF, Banco Santander, Invamer, Forbes, Alcaldía de Sopó, FONDECUN, etc.) DEBEN estar explícitamente incorporadas y destacadas en las viñetas laborales correspondientes.
   - Aplica rigurosamente la fórmula Google / Harvard para viñetas ejecutivas:
     [Verbo de acción en tercera persona ("Lideró", "Diseñó", "Desarrolló", "Estructuró", "Optimizó")] + [Qué construyó o implementó con tecnologías y metodologías específicas] + [Métrica cuantitativa / KPI / Impacto demostrable] + [Contexto estratégico / Metodología / Stakeholder].
3. DENSIDAD PROFESIONAL Y COBERTURA DEL 100%:
   - Para TODOS Y CADA UNO de los cargos laborales del perfil del candidato, genera OBLIGATORIAMENTE entre 3 y 5 viñetas sustanciales (de 25 a 45 palabras cada una) en el array "logros". Queda terminantemente prohibido generar menos de 3 viñetas para ningún cargo.
   - Para TODAS Y CADA UNA de las titulaciones de educación formal del perfil, genera OBLIGATORIAMENTE entre 2 y 3 viñetas sustanciales en el array "detalles", articulando proyectos de investigación aplicada, tesis, modelado econométrico o cuantitativo, y conexión directa con el cargo postulado.
4. CARTA DE PRESENTACIÓN EJECUTIVA:
   - Debe constar de 3 a 4 párrafos sustanciales, elocuentes y personalizados para la empresa y el cargo.
   - Párrafo 1: Postulación formal y alineación con los objetivos estratégicos de la empresa.
   - Párrafo 2: Exposición de los mayores logros cuantitativos y trayectoria más relevante vinculada al desafío principal del puesto.
   - Párrafo 3: Sinergia de habilidades técnicas de vanguardia, liderazgo analítico y propuesta de valor diferencial.
   - Párrafo 4: Agradecimiento protocolario y disposición para entrevista.
5. CORREO DE POSTULACIÓN:
   - Asunto profesional, directo y pulcro.
   - Cuerpo conciso (2 párrafos ejecutivos), formal, invitando a revisar los adjuntos y facilitando canales de contacto.
6. ALINEACIÓN TOTAL CON LA VACANTE OBJETIVO:
   - Analiza a fondo los requerimientos y lenguaje de la vacante para sincronizar el titular, el resumen y las viñetas con la cultura y expectativas del empleador.`

    const educacionList = Array.isArray(profile.educacion_formal) ? profile.educacion_formal : []
    const experienciaList = Array.isArray(profile.experiencia) ? profile.experiencia : []

    const promptGen = `
DATOS DE LA VACANTE OBJETIVO:
- Empresa: ${application.empresa}
- Cargo / Rol: ${application.puesto}
- Descripción y Requisitos del Puesto:
${application.descripcion_corta || 'No especificada'}
- Modalidad de trabajo: ${application.modalidad || 'Híbrida'}
- Seniority: ${application.seniority || 'Senior / Lead'}

DATOS DEL CANDIDATO (PERFIL MAESTRO COMPLETO):
- Nombre completo: ${profile.nombre || 'Candidato UniSabana'}
- Titular actual: ${profile.titular || 'Profesional'}
- Ubicación: ${profile.ubicacion || 'Bogotá, Colombia'}
- Teléfono: ${profile.telefono || 'No especificado'}
- Correo institucional: ${profile.correo || 'No especificado'}
- Correo personal: ${profile.correo_personal || 'No especificado'}
- Enlaces profesionales: ${JSON.stringify(profile.links || [])}
- Resumen maestro: ${profile.resumen || ''}
- Historial completo de experiencias laborales (${experienciaList.length} cargos obligatorios):
${JSON.stringify(experienciaList, null, 2)}
- Educación formal completa (${educacionList.length} títulos obligatorios):
${JSON.stringify(educacionList, null, 2)}
- Formación no formal / Diplomados:
${JSON.stringify(profile.formacion_no_formal || [], null, 2)}
- Certificaciones profesionales:
${JSON.stringify(profile.certificaciones || [], null, 2)}
- Habilidades técnicas y herramientas categorizadas:
${JSON.stringify(profile.habilidades_tecnicas || [], null, 2)}
- Habilidades blandas y de liderazgo:
${JSON.stringify(profile.habilidades_blandas || [], null, 2)}
- Idiomas y niveles:
${JSON.stringify(profile.idiomas || [], null, 2)}
- Referencias:
${JSON.stringify([...(profile.referencias_laborales || []), ...(profile.referencias_personales || [])])}

INSTRUCCIONES ESPECÍFICAS DE GENERACIÓN Y CURADURÍA:
1. "titular_adaptado": Título ejecutivo de alto nivel adaptado con máxima precisión a ${application.puesto} en ${application.empresa}.
2. "resumen_adaptado": Perfil profesional ejecutivo de 5 a 6 líneas de altísimo impacto, sin clichés, destacando la propuesta de valor diferencial y las capacidades operativas y estratégicas que aporta a ${application.empresa}.
3. "experiencia_adaptada": DEBES incluir los ${experienciaList.length} cargos del candidato sin omitir ninguno. Para CADA cargo, genera un objeto con empresa, cargo, desde, hasta, modalidad, y un array "logros" con OBLIGATORIAMENTE entre 3 y 5 viñetas detalladas STAR (de 25 a 45 palabras cada una). DEBES MANTENER TODOS LOS DATOS Y KPIs REALES (cifras de registros, USD generados, municipios, modelos de machine learning, clientes corporativos y entidades aliadas).
4. "educacion_adaptada": DEBES incluir los ${educacionList.length} títulos de educación formal del perfil sin omitir ninguno. Para CADA título, genera titulo, institucion, periodo y un array "detalles" con OBLIGATORIAMENTE entre 2 y 3 viñetas sustanciales que demuestren cómo la investigación, modelado cuantitativo y rigor académico de esa titulación fortalecen su idoneidad para ${application.puesto}.
5. "habilidades_tecnicas_destacadas": Selecciona y ordena entre 8 y 12 habilidades técnicas del perfil que mayor relevancia tengan para ${application.puesto}.
6. "habilidades_blandas_destacadas": Selecciona entre 5 y 6 competencias conductuales y de liderazgo más pertinentes.
7. "certificaciones_destacadas": Lista de certificaciones del candidato pertinentes.
8. "formacion_no_formal_destacada": Programas de formación continua del candidato pertinentes.
9. "idiomas_destacados": Idiomas con su nivel.
10. "palabras_clave_destacadas": Lista de 8 a 12 palabras clave ATS estratégicas para la vacante.
11. "cover_letter": Redacta una carta de presentación ejecutiva formal (3 a 4 párrafos elocuentes y persuasivos) personalizada para ${application.empresa}.
12. "correo": Asunto y cuerpo formal para el envío de postulación.

Devuelve estrictamente un objeto JSON con este esquema exacto:
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
          "string (viñeta 1 detallada STAR con KPIs reales)",
          "string (viñeta 2 detallada STAR con KPIs reales)",
          "string (viñeta 3 detallada STAR con KPIs reales)",
          "string (viñeta 4 detallada STAR con KPIs reales)"
        ]
      }
    ],
    "educacion_adaptada": [
      {
        "titulo": "string",
        "institucion": "string",
        "periodo": "string",
        "detalles": [
          "string (investigación, econometría o foco académico aplicado 1)",
          "string (competencia diferencial o distinción 2)"
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
