import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db/index.js'
import { extractTextFromCv } from '../services/cvService.js'
import { parseCvText } from '../llm/cvParser.js'
import { runCvAssessment } from '../llm/cvAssessment.js'
import { generarAssessmentPdf } from '../lib/pdfgen.js'
import { uploadCvFile, uploadAssessmentPdf } from '../lib/storage.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, '../../uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB para soportar PDFs de Canva con gráficos de alta resolución
  fileFilter: (_req, file, cb) => {
    const isPdfMime = !file.mimetype || file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf' || file.mimetype === 'application/octet-stream'
    const isPdfExt = (file.originalname || '').toLowerCase().endsWith('.pdf')
    if (!isPdfMime && !isPdfExt) {
      return cb(new Error('Solo se aceptan archivos PDF por ahora'))
    }
    cb(null, true)
  },
})

/**
 * POST /api/cv/upload
 *
 * Flujo de onboarding completo en un solo request:
 * 1. Extrae el texto del PDF subido
 * 2. Sube el archivo original a Storage y lo registra en cv_files (marcando las anteriores como inactivas)
 * 3. Usa el LLM para extraer los campos del perfil y actualiza `usuarios`
 * 4. Corre el assessment de reclutador, genera el PDF y lo guarda en cv_assessments
 *
 * También se usa para "reintentar el assessment" desde el perfil — subir un CV nuevo
 * siempre reescribe las variables del perfil y genera un assessment nuevo.
 */
router.post('/upload', requireAuth, upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Debes subir un archivo de currículum (PDF)' })
  }

  const filePath = req.file.path

  try {
    const fileBuffer = fs.readFileSync(filePath)
    const extraction = await extractTextFromCv(fileBuffer)
    const cvText = extraction.text || String(extraction)

    if (!cvText || cvText.trim().length < 30) {
      return res.status(422).json({
        error: 'No se pudo extraer texto de tu PDF. Esto sucede cuando el documento es una imagen o foto escaneada sin capa de texto. Si lo creaste en Canva o Word, expórtalo como "PDF Estándar" (asegurándote de no marcar la opción "Aplanar PDF") o usa la opción "Imprimir → Guardar como PDF".'
      })
    }

    const aviso = extraction.truncated
      ? `Tu documento tiene ${extraction.totalPages} páginas. Para optimizar el análisis y enfocarse en tu trayectoria profesional, se procesaron las primeras 5 páginas.`
      : null

    // 1. Subir el archivo original sanitizando el nombre para Supabase Storage
    let originalName = req.file.originalname || 'cv.pdf'
    try {
      // Corregir codificación si busboy interpretó UTF-8 como latin1
      const decoded = Buffer.from(originalName, 'latin1').toString('utf8')
      if (decoded && !decoded.includes('\ufffd')) {
        originalName = decoded
      }
    } catch {}

    const ext = path.extname(originalName) || '.pdf'
    const baseName = path.basename(originalName, ext)
    const safeBaseName = (baseName || 'cv')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover tildes
      .replace(/[^a-zA-Z0-9_-]/g, '_')  // Reemplazar espacios y caracteres especiales
      .replace(/_+/g, '_')
      .slice(0, 60) || 'cv'

    const storagePath = `${req.user.id}/${Date.now()}-${safeBaseName}${ext.toLowerCase()}`
    const freshBuffer = fs.readFileSync(filePath)
    const cvUrl = await uploadCvFile(freshBuffer, storagePath)

    // 2. Registrar en cv_files, desactivando versiones anteriores
    await query(`UPDATE cv_files SET activa = FALSE WHERE usuario_id = $1`, [req.user.id])
    const { rows: [cvFile] } = await query(
      `INSERT INTO cv_files (usuario_id, url, texto_extraido, activa)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, url, created_at`,
      [req.user.id, cvUrl, cvText]
    )

    // 3. Extraer perfil estructurado y actualizar usuarios con sanitización defensiva
    const rawPerfil = await parseCvText(cvText)
    const perfil = {
      titular: typeof rawPerfil?.titular === 'string' && rawPerfil.titular.trim() ? rawPerfil.titular.trim().slice(0, 150) : null,
      telefono: typeof rawPerfil?.telefono === 'string' && rawPerfil.telefono.trim() ? rawPerfil.telefono.trim().slice(0, 40) : null,
      correo_personal: typeof rawPerfil?.correo_personal === 'string' && rawPerfil.correo_personal.trim() ? rawPerfil.correo_personal.trim().slice(0, 120) : null,
      ubicacion: typeof rawPerfil?.ubicacion === 'string' && rawPerfil.ubicacion.trim() ? rawPerfil.ubicacion.trim().slice(0, 100) : null,
      links: Array.isArray(rawPerfil?.links) ? rawPerfil.links.filter(l => l && (l.url || typeof l === 'string')) : [],
      resumen: typeof rawPerfil?.resumen === 'string' ? rawPerfil.resumen.trim() : null,
      experiencia: Array.isArray(rawPerfil?.experiencia) ? rawPerfil.experiencia : [],
      educacion_formal: Array.isArray(rawPerfil?.educacion_formal) ? rawPerfil.educacion_formal : [],
      certificaciones: Array.isArray(rawPerfil?.certificaciones) ? rawPerfil.certificaciones : [],
      formacion_no_formal: Array.isArray(rawPerfil?.formacion_no_formal) ? rawPerfil.formacion_no_formal : [],
      idiomas: Array.isArray(rawPerfil?.idiomas) ? rawPerfil.idiomas : [],
      habilidades_tecnicas: Array.isArray(rawPerfil?.habilidades_tecnicas) ? rawPerfil.habilidades_tecnicas : [],
      habilidades_blandas: Array.isArray(rawPerfil?.habilidades_blandas) ? rawPerfil.habilidades_blandas : []
    }

    const { rows: [usuario] } = await query(
      `UPDATE usuarios SET
         titular = COALESCE($1, usuarios.titular),
         telefono = COALESCE($2, usuarios.telefono),
         correo_personal = COALESCE($3, usuarios.correo_personal),
         ubicacion = COALESCE($4, usuarios.ubicacion),
         links = CASE
           WHEN $5::jsonb != '[]'::jsonb AND (
             usuarios.links IS NULL
             OR usuarios.links = '{}'::jsonb
             OR usuarios.links = '[]'::jsonb
             OR (CASE WHEN jsonb_typeof(usuarios.links) = 'array' THEN jsonb_array_length(usuarios.links) ELSE 0 END) = 0
           ) THEN $5::jsonb
           ELSE COALESCE(
             CASE WHEN jsonb_typeof(usuarios.links) = 'array' THEN usuarios.links ELSE '[]'::jsonb END,
             '[]'::jsonb
           )
         END,
         resumen = $6,
         experiencia = $7,
         educacion_formal = $8,
         certificaciones = $9,
         formacion_no_formal = $10,
         idiomas = $11,
         habilidades_tecnicas = $12,
         habilidades_blandas = $13
       WHERE id = $14
       RETURNING *`,
      [
        perfil.titular,
        perfil.telefono,
        perfil.correo_personal,
        perfil.ubicacion,
        JSON.stringify(perfil.links),
        perfil.resumen,
        JSON.stringify(perfil.experiencia),
        JSON.stringify(perfil.educacion_formal),
        JSON.stringify(perfil.certificaciones),
        JSON.stringify(perfil.formacion_no_formal),
        JSON.stringify(perfil.idiomas),
        JSON.stringify(perfil.habilidades_tecnicas),
        JSON.stringify(perfil.habilidades_blandas),
        req.user.id,
      ]
    )

    // 4. Assessment de reclutador + PDF con sanitización defensiva
    const rawAssessment = await runCvAssessment(cvText)
    const assessmentData = {
      top_puestos: Array.isArray(rawAssessment?.top_puestos) ? rawAssessment.top_puestos : [],
      palabras_clave_ats: Array.isArray(rawAssessment?.palabras_clave_ats) ? rawAssessment.palabras_clave_ats : [],
      debilidades: Array.isArray(rawAssessment?.debilidades) ? rawAssessment.debilidades : [],
      calificacion: {
        score: typeof rawAssessment?.calificacion?.score === 'number'
          ? rawAssessment.calificacion.score
          : (parseFloat(rawAssessment?.calificacion?.score) || 7.0),
        como_llegar_a_10: Array.isArray(rawAssessment?.calificacion?.como_llegar_a_10)
          ? rawAssessment.calificacion.como_llegar_a_10
          : []
      }
    }

    const pdfBuffer = await generarAssessmentPdf({ nombre: req.user.nombre, respuesta: assessmentData })
    const pdfPath = `${req.user.id}/${cvFile.id}.pdf`
    const pdfUrl = await uploadAssessmentPdf(pdfBuffer, pdfPath)

    const { rows: [assessment] } = await query(
      `INSERT INTO cv_assessments (usuario_id, cv_file_id, respuesta_json, pdf_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, respuesta_json, pdf_url, created_at`,
      [req.user.id, cvFile.id, assessmentData, pdfUrl]
    )

    res.json({ usuario, cv_file: cvFile, assessment, aviso })
  } catch (err) {
    console.error('Error en POST /api/cv/upload:', err)
    const isClientError = /contraseña|password|corrupto|válido|vencid|no tiene texto|texto seleccionable|menos de 500 bytes/i.test(err.message)
    const isRateLimit = /alta demanda|límite de peticiones|rate limit|429/i.test(err.message)

    let userMessage = err.message
    if (isRateLimit) {
      userMessage = 'El servicio de IA está experimentando alta demanda en este momento (límite de peticiones de OpenAI). Por favor espera 30 segundos y vuelve a intentarlo.'
    }

    res.status(isClientError ? 422 : 500).json({
      error: userMessage,
      isRateLimit
    })
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
})

export default router
