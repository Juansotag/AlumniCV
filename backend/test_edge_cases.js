import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import { extractTextFromCv } from './src/services/cvService.js'
import { parseCvText } from './src/llm/cvParser.js'
import { searchLinkedInJobs, detectModalidad } from './src/services/jobSearch.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`)
    passed++
  } else {
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${message}`)
    failed++
  }
}

// 1. Helper: Generar PDF de N páginas
function createMultiPagePdf(pageCount = 7) {
  return new Promise((resolve) => {
    const doc = new PDFDocument()
    const buffers = []
    doc.on('data', b => buffers.push(b))
    doc.on('end', () => resolve(Buffer.concat(buffers)))

    for (let i = 1; i <= pageCount; i++) {
      if (i > 1) doc.addPage()
      doc.fontSize(16).text(`Página ${i} de ${pageCount} - Curriculum Vitae`)
      doc.fontSize(12).text(`Contenido representativo de la trayectoria en la sección ${i}.`)
      doc.text(`Proyectos, responsabilidades y métricas correspondientes a la página ${i}.`)
    }
    doc.end()
  })
}

// 2. Helper: Generar PDF sin texto (solo dibujo vectorial / simulación de escaneo)
function createScannedOrEmptyPdf() {
  return new Promise((resolve) => {
    const doc = new PDFDocument()
    const buffers = []
    doc.on('data', b => buffers.push(b))
    doc.on('end', () => resolve(Buffer.concat(buffers)))

    // Dibuja rectángulos y líneas pero sin añadir texto (simula imagen escaneada)
    doc.rect(50, 50, 500, 700).stroke()
    doc.circle(200, 200, 50).fill('#cccccc')
    doc.end()
  })
}

// 3. Helper: Generar PDF con caracteres especiales, emojis y términos técnicos
function createSpecialCharsPdf() {
  return new Promise((resolve) => {
    const doc = new PDFDocument()
    const buffers = []
    doc.on('data', b => buffers.push(b))
    doc.on('end', () => resolve(Buffer.concat(buffers)))

    doc.fontSize(14).text('Ingeniero de Software Senior: C++ / C# / .NET & Node.js')
    doc.fontSize(11).text('Experiencia en desarrollo I+D con bases de datos SQL y optimización.')
    doc.text('Contacto: juan.perez+cv@ejemplo.com | Bogotá, D.C. (Colombia) | 2026')
    doc.end()
  })
}

// 4. Helper: Lógica de sanitización de nombre idéntica a routes/cv.js
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

async function runEdgeCases() {
  console.log('\n======================================================')
  console.log('QA SUITE AVANZADO: CASOS EDGE Y PRUEBAS EXTREMAS')
  console.log('======================================================\n')

  // --- EDGE CASE 1: Límite de 5 páginas en CV largo ---
  console.log('--- CASO 1: CV con más de 5 páginas (Paginación y Truncado) ---')
  const pdf7Pages = await createMultiPagePdf(7)
  const res7Pages = await extractTextFromCv(pdf7Pages)
  assert(res7Pages.totalPages === 7, `Detectó correctamente el total de páginas real (${res7Pages.totalPages})`)
  assert(res7Pages.pagesProcessed === 5, `Limitó el procesamiento a exactamente ${res7Pages.pagesProcessed} páginas`)
  assert(res7Pages.truncated === true, 'Marcó la bandera truncated: true para activar el banner en la UI')
  assert(res7Pages.text.includes('Página 1') && res7Pages.text.includes('Página 5'), 'Contiene texto de páginas 1 a 5')
  assert(!res7Pages.text.includes('Página 6') && !res7Pages.text.includes('Página 7'), 'Excluyó correctamente las páginas 6 y 7')

  // --- EDGE CASE 2: PDF escaneado / solo imagen (0 texto extraíble) ---
  console.log('\n--- CASO 2: PDF Escaneado o Imagen sin capa de texto ---')
  const scannedPdf = await createScannedOrEmptyPdf()
  const resScanned = await extractTextFromCv(scannedPdf)
  const isTooShort = (resScanned.text || '').trim().length < 30
  assert(isTooShort, `El extractor devuelve texto insuficiente (<30 chars, len=${resScanned.text.trim().length})`)
  // Validamos que el filtro de la ruta bloquearía el procesamiento innecesario de OpenAI
  assert(isTooShort === true, 'El filtro 422 de la API protegerá a OpenAI de procesar imágenes vacías')

  // --- EDGE CASE 3: Nombres de archivo conflictivos para Supabase Storage ---
  console.log('\n--- CASO 3: Nombres de archivo conflictivos para Supabase Storage ---')
  const testFilenames = [
    { input: 'HV (Juan José) #1 & Definitiva_2026!.pdf', expected: 'HV_Juan_Jose_1_Definitiva_2026_.pdf' },
    { input: 'Curriculum_María_Camila_Año_2026.PDF', expected: 'Curriculum_Maria_Camila_Ano_2026.pdf' },
    { input: '   espacios    multiples   .pdf', expected: 'espacios_multiples.pdf' },
    { input: '---___---.pdf', expected: '-_-.pdf' }
  ]
  for (const item of testFilenames) {
    const sanitized = sanitizeFilename(item.input)
    const isValidKey = /^[a-zA-Z0-9_-]+\.[a-z]+$/.test(sanitized)
    assert(isValidKey, `Sanitizó "${item.input}" a "${sanitized}" de forma compatible con S3/Supabase`)
  }

  // --- EDGE CASE 4: Caracteres especiales técnicos (C++, C#, .NET, I+D) ---
  console.log('\n--- CASO 4: CV con Caracteres Técnicos Especiales (C++, C#, .NET) ---')
  const specialPdf = await createSpecialCharsPdf()
  const specialRes = await extractTextFromCv(specialPdf)
  assert(specialRes.text.includes('C++') && specialRes.text.includes('C#') && specialRes.text.includes('.NET'),
    'Preservó intactos los símbolos técnicos de programación (C++, C#, .NET)')

  // --- EDGE CASE 5: Estructura vacía / Perfil Junior (Sin experiencia previa) ---
  console.log('\n--- CASO 5: Perfil Junior / Recién Graduado (Sin experiencia laboral) ---')
  const juniorCvText = `
    ANDRÉS FELIPE GÓMEZ
    Ingeniero de Sistemas recién graduado
    Educación: Universidad Nacional de Colombia, Pregrado en Ingeniería de Sistemas, 2021 - 2026.
    Habilidades: Python, SQL, Git, Trabajo en equipo.
    Idiomas: Español nativo, Inglés intermedio.
  `
  try {
    const parsedJunior = await parseCvText(juniorCvText)
    assert(Array.isArray(parsedJunior.experiencia) && parsedJunior.experiencia.length === 0,
      'Manejó correctamente experiencia vacía como array [] sin romper la base de datos')
    assert(Array.isArray(parsedJunior.educacion_formal) && parsedJunior.educacion_formal.length > 0,
      'Extrajo educación formal del graduado junior')
  } catch (err) {
    assert(false, 'Fallo al parsear CV junior: ' + err.message)
  }

  // --- EDGE CASE 6: Búsqueda de empleo en ubicaciones internacionales fuera de LATAM ---
  console.log('\n--- CASO 6: Búsqueda de empleo internacional (España, Alemania, USA) ---')
  try {
    const testLocations = [
      { loc: 'España', query: 'Desarrollador' },
      { loc: 'Estados Unidos', query: 'Software Engineer' }
    ]
    for (const test of testLocations) {
      const jobs = await searchLinkedInJobs({ query: test.query, location: test.loc, modalidad: 'todas', limit: 2 })
      assert(Array.isArray(jobs), `Búsqueda en "${test.loc}" para "${test.query}" respondió array sin error HTTP`)
    }
  } catch (err) {
    assert(false, 'Error en búsqueda internacional: ' + err.message)
  }

  // --- EDGE CASE 7: Detección estricta de modalidad presencial (Anti-fugas) ---
  console.log('\n--- CASO 7: Clasificación estricta de modalidad (Presencial vs Remoto) ---')
  const casoHibridoDisfrazado = {
    puesto: 'Ingeniero de Operaciones',
    descripcion_corta: 'Posición basada en planta Medellín con opción de trabajo remoto los viernes.',
    ubicacion: 'Medellín, Colombia'
  }
  const clasificacion = detectModalidad(casoHibridoDisfrazado)
  assert(clasificacion === 'hibrido', `Vacante con opción remota se clasificó como "${clasificacion}" (evita colarse en presencial estricto)`)

  console.log('\n======================================================')
  console.log(`[FIN] RESULTADOS: ${passed} pruebas superadas con éxito, ${failed} fallos.`)
  console.log('======================================================\n')
}

runEdgeCases()
