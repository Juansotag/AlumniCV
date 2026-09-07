import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { extractTextFromCv } from './src/services/cvService.js'
import { parseCvText } from './src/llm/cvParser.js'
import { runCvAssessment } from './src/llm/cvAssessment.js'

const TEST_DIR = path.resolve('../test_cvs')

// Helper de sanitización idéntico al de routes/cv.js
function sanitizeFilename(originalName) {
  let name = originalName || 'cv.pdf'
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8')
    if (decoded && !decoded.includes('\ufffd')) name = decoded
  } catch {}
  const ext = path.extname(name) || '.pdf'
  const baseName = path.basename(name, ext)
  const safeBaseName = (baseName || 'cv')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60) || 'cv'
  return `${safeBaseName}${ext.toLowerCase()}`
}

async function testRealCv(filename) {
  const fullPath = path.join(TEST_DIR, filename)
  console.log(`\n=================================================================`)
  console.log(`PROCESANDO: ${filename}`)
  console.log(`=================================================================`)

  // 1. Sanitización del nombre
  const sanitized = sanitizeFilename(filename)
  console.log(`[STORAGE] Nombre sanitizado para Supabase: "${sanitized}"`)

  // 2. Lectura y Extracción de texto
  const buffer = fs.readFileSync(fullPath)
  console.log(`[ARCHIVO] Tamaño en disco: ${(buffer.byteLength / 1024).toFixed(1)} KB`)

  const t0 = Date.now()
  let extraction
  try {
    extraction = await extractTextFromCv(buffer)
  } catch (err) {
    console.error(`[ERROR] Falló extractTextFromCv: ${err.message}`)
    return false
  }

  const cvText = extraction.text || String(extraction)
  const timeExtract = Date.now() - t0

  console.log(`[EXTRACCIÓN] Completada en ${timeExtract}ms`)
  console.log(`[EXTRACCIÓN] Total páginas: ${extraction.totalPages}, Procesadas: ${extraction.pagesProcessed}, Truncado: ${extraction.truncated}`)
  console.log(`[EXTRACCIÓN] Longitud de texto extraído: ${cvText.length} caracteres, ${cvText.split(/\s+/).length} palabras`)

  if (cvText.length < 50) {
    console.error(`[ERROR] Texto extraído demasiado corto (<50 caracteres)`)
    return false
  }

  console.log(`[PREVIEW] Primeras 250 letras:\n---\n${cvText.slice(0, 250).trim()}...\n---`)

  // 3. Extracción estructurada con OpenAI (cvParser)
  console.log(`[LLM PARSER] Extrayendo perfil estructurado con OpenAI (MODEL_FAST)...`)
  const t1 = Date.now()
  let perfil
  try {
    perfil = await parseCvText(cvText)
  } catch (err) {
    console.error(`[ERROR] Falló parseCvText: ${err.message}`)
    return false
  }
  const timeParser = Date.now() - t1
  console.log(`[LLM PARSER] Completado en ${(timeParser / 1000).toFixed(1)}s`)
  console.log(`[PARSER RESULTADOS]:`)
  console.log(`  - Resumen profesional: ${perfil.resumen ? perfil.resumen.slice(0, 100) + '...' : '(vacío)'}`)
  console.log(`  - Experiencias laborales detectadas: ${perfil.experiencia?.length || 0}`)
  if (perfil.experiencia?.length > 0) {
    perfil.experiencia.slice(0, 2).forEach((exp, i) => {
      console.log(`     * [${i+1}] ${exp.puesto || exp.cargo} en ${exp.empresa || exp.organizacion} (${exp.periodo || exp.fecha_inicio || ''})`)
    })
  }
  console.log(`  - Educación formal detectada: ${perfil.educacion_formal?.length || 0}`)
  if (perfil.educacion_formal?.length > 0) {
    perfil.educacion_formal.slice(0, 2).forEach((edu, i) => {
      console.log(`     * [${i+1}] ${edu.titulo || edu.carrera} - ${edu.institucion}`)
    })
  }
  console.log(`  - Habilidades técnicas detectadas: ${perfil.habilidades_tecnicas?.length || 0} (${(perfil.habilidades_tecnicas || []).map(h => typeof h === 'object' ? h.nombre : h).slice(0, 8).join(', ')})`)
  console.log(`  - Idiomas detectados: ${perfil.idiomas?.length || 0} (${(perfil.idiomas || []).map(id => typeof id === 'object' ? `${id.idioma}: ${id.nivel}` : id).join(', ')})`)

  return true
}

async function runAll() {
  const files = fs.readdirSync(TEST_DIR).filter(f => 
    f.endsWith('.pdf') && 
    !f.startsWith('1_') && 
    !f.startsWith('2_') && 
    !f.startsWith('3_')
  )

  console.log(`Encontrados ${files.length} CVs reales para probar:`, files)

  let successes = 0
  for (const f of files) {
    const ok = await testRealCv(f)
    if (ok) successes++
  }

  console.log(`\n=================================================================`)
  console.log(`RESUMEN: ${successes} de ${files.length} CVs procesados con éxito total.`)
  console.log(`=================================================================\n`)
}

runAll()
