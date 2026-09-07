import 'dotenv/config'
import PDFDocument from 'pdfkit'
import { extractTextFromCv } from './src/services/cvService.js'
import { completeJson, MODEL_FAST, MODEL_FRONTIER } from './src/llm/client.js'
import { searchLinkedInJobs, detectModalidad } from './src/services/jobSearch.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}`)
    failed++
  }
}

async function createValidPdf() {
  return new Promise((resolve) => {
    const doc = new PDFDocument()
    const buffers = []
    doc.on('data', b => buffers.push(b))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.fontSize(16).text('Juan Pérez - Ingeniero de Software')
    doc.fontSize(12).text('Experiencia en Node.js, React y SQL. Idiomas: Español nativo, Inglés C1.')
    doc.end()
  })
}

async function testCvEdgeCases() {
  console.log('\n--- 1. Pruebas QA: Edge Cases de Archivos PDF ---')

  // Caso 1: Archivo muy pequeño (< 500 bytes)
  try {
    await extractTextFromCv(Buffer.from('Hola mundo'))
    assert(false, 'Debe rechazar archivos menores a 500 bytes')
  } catch (err) {
    assert(err.message.includes('menos de 500 bytes'), 'Rechazó correctamente archivo menor a 500 bytes')
  }

  // Caso 2: Archivo con tamaño pero que NO es PDF (falso .pdf)
  try {
    const fakeBuffer = Buffer.alloc(1000, 65) // 1000 'A's
    await extractTextFromCv(fakeBuffer)
    assert(false, 'Debe rechazar archivos que no inicien con %PDF-')
  } catch (err) {
    assert(err.message.includes('no es un documento PDF válido'), 'Rechazó correctamente archivo falso sin cabecera PDF')
  }

  // Caso 3: PDF válido real
  try {
    const validBuf = await createValidPdf()
    const text = await extractTextFromCv(validBuf)
    assert(text.includes('Juan Pérez') && text.includes('Ingeniero'), 'Extrajo texto correctamente de un PDF legítimo')
  } catch (err) {
    assert(false, 'Error inesperado al extraer PDF legítimo: ' + err.message)
  }
}

async function testOpenAiResilience() {
  console.log('\n--- 2. Pruebas QA: Resiliencia de OpenAI con Reintento ---')

  try {
    const resMini = await completeJson('Devuelve un JSON con clave "ok" booleano y "test" string', { model: MODEL_FAST })
    assert(resMini && resMini.ok !== undefined, `completeJson con ${MODEL_FAST} respondió JSON válido`)
  } catch (err) {
    assert(false, `Fallo en completeJson (${MODEL_FAST}): ` + err.message)
  }
}

async function testJobSearchCacheAndFilters() {
  console.log('\n--- 3. Pruebas QA: Búsqueda de Empleo, Caché y Modalidad ---')

  // Test detección modalidad
  const jobPresencial = { puesto: 'Contador General', descripcion_corta: 'Trabajo en sede norte Bogotá', ubicacion: 'Bogotá' }
  const jobRemoto = { puesto: 'Senior React Dev (Remote Work)', descripcion_corta: 'Trabajo 100% remoto desde casa', ubicacion: 'Colombia' }
  const jobHibrido = { puesto: 'Product Manager', descripcion_corta: 'Modalidad esquema híbrido 2 días en oficina', ubicacion: 'Medellín' }

  assert(detectModalidad(jobPresencial) === 'presencial', 'Clasificó correctamente vacante presencial')
  assert(detectModalidad(jobRemoto) === 'remoto', 'Clasificó correctamente vacante remota')
  assert(detectModalidad(jobHibrido) === 'hibrido', 'Clasificó correctamente vacante híbrida')

  // Test de búsqueda con caché
  try {
    const t0 = Date.now()
    const r1 = await searchLinkedInJobs({ query: 'qa engineer', location: 'Colombia', modalidad: 'todas', limit: 2 })
    const time1 = Date.now() - t0

    const t1 = Date.now()
    const r2 = await searchLinkedInJobs({ query: 'qa engineer', location: 'Colombia', modalidad: 'todas', limit: 2 })
    const time2 = Date.now() - t1

    assert(r1.length > 0 && r2.length === r1.length, 'La búsqueda devuelve resultados consistentes')
    assert(time2 < 50, `El segundo request usó caché en memoria (tiempo: ${time2}ms vs ${time1}ms inicial)`)
  } catch (err) {
    assert(false, 'Fallo en búsqueda de LinkedIn: ' + err.message)
  }
}

async function runAll() {
  console.log('==============================================')
  console.log('EJECUTANDO QA SMOKE TEST SUITE — ALUMNICV')
  console.log('==============================================')
  await testCvEdgeCases()
  await testOpenAiResilience()
  await testJobSearchCacheAndFilters()

  console.log('\n==============================================')
  console.log(`RESUMEN FINAL: ${passed} pruebas exitosas, ${failed} fallidas.`)
  console.log('==============================================')
}

runAll()
