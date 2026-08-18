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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
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
    const cvText = await extractTextFromCv(fileBuffer)

    if (!cvText || cvText.trim().length < 50) {
      return res.status(422).json({ error: 'No se pudo extraer texto legible del PDF' })
    }

    // 1. Subir el archivo original
    const storagePath = `${req.user.id}/${Date.now()}-${req.file.originalname}`
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

    // 3. Extraer perfil estructurado y actualizar usuarios
    const perfil = await parseCvText(cvText)
    const { rows: [usuario] } = await query(
      `UPDATE usuarios SET
         resumen = $1,
         experiencia = $2,
         educacion_formal = $3,
         certificaciones = $4,
         formacion_no_formal = $5,
         idiomas = $6,
         habilidades_tecnicas = $7,
         habilidades_blandas = $8
       WHERE id = $9
       RETURNING *`,
      [
        perfil.resumen ?? null,
        JSON.stringify(perfil.experiencia ?? []),
        JSON.stringify(perfil.educacion_formal ?? []),
        JSON.stringify(perfil.certificaciones ?? []),
        JSON.stringify(perfil.formacion_no_formal ?? []),
        JSON.stringify(perfil.idiomas ?? []),
        JSON.stringify(perfil.habilidades_tecnicas ?? []),
        JSON.stringify(perfil.habilidades_blandas ?? []),
        req.user.id,
      ]
    )

    // 4. Assessment de reclutador + PDF
    const respuestaAssessment = await runCvAssessment(cvText)
    const pdfBuffer = await generarAssessmentPdf({ nombre: req.user.nombre, respuesta: respuestaAssessment })
    const pdfPath = `${req.user.id}/${cvFile.id}.pdf`
    const pdfUrl = await uploadAssessmentPdf(pdfBuffer, pdfPath)

    const { rows: [assessment] } = await query(
      `INSERT INTO cv_assessments (usuario_id, cv_file_id, respuesta_json, pdf_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, respuesta_json, pdf_url, created_at`,
      [req.user.id, cvFile.id, respuestaAssessment, pdfUrl]
    )

    res.json({ usuario, cv_file: cvFile, assessment })
  } catch (err) {
    console.error('Error en POST /api/cv/upload:', err.message)
    res.status(500).json({ error: 'No se pudo procesar el currículum: ' + err.message })
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
})

export default router
