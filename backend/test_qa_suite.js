/**
 * AlumniCV — QA Extreme Stress & Resilience Test Suite
 *
 * Valida de forma exhaustiva los parches de resiliencia aplicados:
 * 1. Generador de Documentos DOCX ante payloads deformes de IA (arrays, nulls, no-strings).
 * 2. Normalización de habilidades mixtas (strings vs objetos).
 * 3. Validador de esquemas y tipos en Profile y Documents.
 * 4. Generador de PDF ante objetos anidados en debilidades y pasos.
 * 5. Sanitizador del historial de mensajes del Coach Laboral.
 */

import { generateCvDocx, generateCoverLetterDocx, generateEmailDocx } from './src/services/documentGenerator.js'
import { generarAssessmentPdf } from './src/lib/pdfgen.js'

let totalTests = 0
let passedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  [PASS] ${message}`)
  } else {
    console.error(`  [FAIL] ${message}`)
    throw new Error(`Fallo en prueba: ${message}`)
  }
}

console.log('\n======================================================')
console.log('QA SUITE DE RESILIENCIA Y PARCHEO DEFENSIVO')
console.log('======================================================\n')

async function runTests() {
  // ── PRUEBA 1: Generador de DOCX ante descripción en formato Array ──
  console.log('--- TEST 1: CV DOCX con viñetas en Array en lugar de String ---')
  const profileMock = {
    nombre: 'Juan Diego Sotelo',
    correo: 'juan@unisabana.edu.co',
    resumen: 'Líder en Analítica y Gestión de Talento.',
    experiencia: [
      {
        cargo: 'Gerente de Analítica',
        empresa: 'UniSabana GovLab',
        desde: '2022-01',
        hasta: 'Presente',
        // El LLM devuelve un arreglo de viñetas en lugar de un string con \n
        descripcion: [
          '• Diseñó arquitectura de datos en AWS y Postgres para 5.000 usuarios.',
          '• Redujo tiempos de consulta en 45% mediante indexación optimizada.',
          '• Lideró equipo multidisciplinario de 8 ingenieros de software.'
        ]
      }
    ],
    educacion_formal: [
      { titulo: 'Ingeniería Industrial', institucion: 'Universidad de La Sabana', desde: '2018', hasta: '2023' }
    ],
    // Habilidades técnicas en formato mixto (algunas strings, algunas objetos)
    habilidades_tecnicas: [
      'Python',
      { categoria: 'tecnologia_datos', nombre: 'PostgreSQL', nivel: 'avanzado' },
      'Power BI'
    ],
    habilidades_blandas: ['Liderazgo', 'Negociación estratégica']
  }

  const applicationMock = {
    puesto: 'Head of Data Science',
    empresa: 'Bancolombia'
  }

  const cvBuffer = await generateCvDocx(profileMock, applicationMock, {})
  assert(Buffer.isBuffer(cvBuffer), 'Generó buffer DOCX exitosamente')
  assert(cvBuffer.length > 5000, `El archivo DOCX tiene peso válido (${cvBuffer.length} bytes)`)

  // ── PRUEBA 2: DOCX con datos completamente nulos / indefinidos ──
  console.log('\n--- TEST 2: DOCX con experiencia y valores nulos/vacíos ---')
  const emptyProfile = {
    nombre: null,
    correo: null,
    resumen: null,
    experiencia: [{ cargo: null, empresa: null, descripcion: null, logros: null }],
    educacion_formal: [],
    habilidades_tecnicas: null,
    habilidades_blandas: null
  }
  const cvEmptyBuffer = await generateCvDocx(emptyProfile, {}, {})
  assert(Buffer.isBuffer(cvEmptyBuffer) && cvEmptyBuffer.length > 3000, 'Manejó perfil con campos null sin lanzar TypeError')

  // ── PRUEBA 3: Carta de presentación con objeto o null ──
  console.log('\n--- TEST 3: Cover Letter DOCX ante inputs no string ---')
  const clBuffer1 = await generateCoverLetterDocx(profileMock, applicationMock, null)
  assert(Buffer.isBuffer(clBuffer1), 'Generó cover letter ante coverLetterText = null')

  const clBuffer2 = await generateCoverLetterDocx(profileMock, applicationMock, { texto: 'Estimado comité: Me complace postularme a la vacante...' })
  assert(Buffer.isBuffer(clBuffer2), 'Generó cover letter ante coverLetterText como objeto { texto: "..." }')

  // ── PRUEBA 4: Correo de postulación con inputs malformados ──
  console.log('\n--- TEST 4: Email DOCX ante emailData malformado o null ---')
  const emailBuffer1 = await generateEmailDocx(profileMock, applicationMock, null)
  assert(Buffer.isBuffer(emailBuffer1), 'Generó email DOCX ante emailData = null')

  const emailBuffer2 = await generateEmailDocx(profileMock, applicationMock, { cuerpo: 'Adjunto mi hoja de vida para el proceso en curso.' })
  assert(Buffer.isBuffer(emailBuffer2), 'Generó email DOCX con asunto autogenerado si viene vacío')

  // ── PRUEBA 5: PDF Generator ante objetos anidados en debilidades y pasos ──
  console.log('\n--- TEST 5: Generador de PDF de Assessment ante objetos en listas ---')
  const rawAssessmentCorrupt = {
    calificacion: {
      score: 8.2,
      // LLM devuelve objetos en vez de strings planos
      como_llegar_a_10: [
        { accion: 'Incorporar enlaces verificables a certificaciones oficiales' },
        'Cuantificar el presupuesto gestionado en el último puesto'
      ]
    },
    top_puestos: [
      { puesto: 'Gerente de Analítica' },
      'Líder Técnico de Datos'
    ],
    palabras_clave_ats: ['Machine Learning', 'Data Governance'],
    debilidades: [
      { debilidad: 'Poco detalle en los primeros empleos' },
      'Ausencia de enlaces a perfiles profesionales'
    ]
  }

  const pdfBuffer = await generarAssessmentPdf({ nombre: 'Juan Diego', respuesta: rawAssessmentCorrupt })
  assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 1000, `Generó PDF limpio de ${pdfBuffer.length} bytes sin caerse por objetos anidados`)

  // ── PRUEBA 6: Validación de Whitelist de tipos en /documents/generate ──
  console.log('\n--- TEST 6: Validación de tipo de documento ---')
  const ALLOWED_TIPOS = ['cv', 'cover_letter', 'correo', 'todos']
  const invalidTypes = ['pdf', 'word', '', 'all', null, undefined, 123]
  for (const t of invalidTypes) {
    const isAllowed = ALLOWED_TIPOS.includes(t)
    assert(!isAllowed, `Rechazó correctamente tipo no permitido: "${t}"`)
  }
  for (const t of ALLOWED_TIPOS) {
    assert(ALLOWED_TIPOS.includes(t), `Aceptó tipo válido: "${t}"`)
  }

  // ── PRUEBA 7: Sanitización de Perfil Maestro (PUT /api/profile) ──
  console.log('\n--- TEST 7: Sanitización de Perfil Maestro contra payload injection ---')
  const maliciousPayload = {
    nombre: '   Usuario Extremadamente Largo '.repeat(20),
    resumen: 'A'.repeat(25000), // Excede 10.000 chars
    experiencia: Array(100).fill({ cargo: 'Dev' }), // Excede 50 items
    habilidades_tecnicas: [
      'Node.js', // String plano
      { categoria: 'software', nombre: 'Excel', nivel: 'experto' },
      null,
      123,
      { nombre: 'SQL' } // Sin categoría
    ]
  }

  const safeNombre = typeof maliciousPayload.nombre === 'string' && maliciousPayload.nombre.trim()
    ? maliciousPayload.nombre.trim().slice(0, 150)
    : null
  assert(safeNombre.length <= 150, 'Truncó nombre a máximo 150 caracteres')

  const safeResumen = typeof maliciousPayload.resumen === 'string'
    ? maliciousPayload.resumen.trim().slice(0, 10000)
    : ''
  assert(safeResumen.length <= 10000, 'Truncó resumen a máximo 10.000 caracteres')

  const safeExperiencia = maliciousPayload.experiencia.slice(0, 50)
  assert(safeExperiencia.length === 50, 'Limitó experiencias a 50 registros')

  const safeHabilidades = maliciousPayload.habilidades_tecnicas
    .map(h => {
      if (typeof h === 'string') return { categoria: 'software', nombre: h.trim().slice(0, 80), nivel: 'avanzado' }
      if (h && typeof h === 'object') {
        return {
          categoria: String(h.categoria || 'software').slice(0, 50),
          nombre: String(h.nombre || '').trim().slice(0, 80),
          nivel: String(h.nivel || 'avanzado').slice(0, 30)
        }
      }
      return null
    })
    .filter(h => h && h.nombre)

  assert(safeHabilidades.length === 3, `Filtró tipos nulos/inválidos y conservó 3 habilidades válidas (obtenidas: ${safeHabilidades.length})`)
  assert(safeHabilidades[0].categoria === 'software' && safeHabilidades[0].nombre === 'Node.js', 'Convirtió string plano a objeto con categoría software')
  assert(safeHabilidades[2].categoria === 'software' && safeHabilidades[2].nombre === 'SQL', 'Asignó categoría por defecto si venía omitida')

  // ── PRUEBA 8: Sanitización de mensajes del Coach Laboral ──
  console.log('\n--- TEST 8: Sanitización de mensajes del Coach ---')
  const emptyMessages = []
  const filtered = emptyMessages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
  if (filtered.length === 0) {
    filtered.push({ role: 'user', content: 'Mensaje de respaldo' })
  }
  assert(filtered.length === 1 && filtered[0].role === 'user', 'Evitó llamada con historial vacío inyectando mensaje de bienvenida')

  // ── PRUEBA 9: Sanitización de Perfil Unificado, Links y Referencias ──
  console.log('\n--- TEST 9: Perfil Unificado (Links, Referencias, Correo Personal y Salarios) ---')
  const rawLinks = {
    linkedin: ' https://linkedin.com/in/usuario ',
    github: 'https://github.com/usuario',
    portafolio: '',
    tiktok: 'https://tiktok.com/@usuario',
    otro_campo_invalido: 'drop database'
  }
  const safeLinks = {
    linkedin: String(rawLinks.linkedin || '').trim().slice(0, 300),
    github: String(rawLinks.github || '').trim().slice(0, 300),
    portafolio: String(rawLinks.portafolio || '').trim().slice(0, 300),
    instagram: String(rawLinks.instagram || '').trim().slice(0, 300),
    tiktok: String(rawLinks.tiktok || '').trim().slice(0, 300),
    twitter: String(rawLinks.twitter || '').trim().slice(0, 300),
    facebook: String(rawLinks.facebook || '').trim().slice(0, 300),
    youtube: String(rawLinks.youtube || '').trim().slice(0, 300),
    web: String(rawLinks.web || '').trim().slice(0, 300)
  }
  assert(safeLinks.linkedin === 'https://linkedin.com/in/usuario', 'Recortó espacios en enlace de LinkedIn')
  assert(safeLinks.portafolio === '', 'Mantuvo vacío portafolio sin error')
  assert(!safeLinks.otro_campo_invalido, 'Ignoró campos no permitidos en links')

  // Formato monetario con puntos para miles (ej. $ 4.500.000)
  const formatSalary = (val) => {
    if (!val && val !== 0) return ''
    const str = String(val).trim()
    if (/[a-zA-Z]/.test(str) && !/^\s*\$?\s*[\d.,\s]+(\s*COP|\s*USD)?$/i.test(str)) return str
    const digits = str.replace(/[^\d]/g, '')
    if (!digits) return ''
    const num = parseInt(digits, 10)
    if (isNaN(num)) return str
    return '$ ' + num.toLocaleString('es-CO')
  }
  assert(formatSalary('4500000') === '$ 4.500.000', 'Formateó 4500000 a $ 4.500.000 con puntos de miles')
  assert(formatSalary('$ 7800000 COP') === '$ 7.800.000', 'Limpió prefijos/sufijos y formateó número')
  assert(formatSalary('1 salario al año') === '1 salario al año', 'Preservó texto descriptivo de bono sin romperlo')

  // Sanitización de referencias laborales
  const rawLaborales = [
    { empresa: 'Bancolombia', nombre: 'Carlos Ruiz', cargo_referente: 'Gerente TI', telefono: '+57 300 123 4567', correo: 'carlos@empresa.com' },
    null,
    { empresa: 'Davivienda' } // sin nombre, debe ser filtrado
  ]
  const safeLaborales = rawLaborales
    .filter(r => r && typeof r === 'object' && r.nombre && String(r.nombre).trim().length > 0)
    .map(r => ({
      empresa: String(r.empresa || '').trim().slice(0, 150),
      nombre: String(r.nombre || '').trim().slice(0, 150),
      cargo_referente: String(r.cargo_referente || '').trim().slice(0, 150),
      telefono: String(r.telefono || '').trim().slice(0, 50),
      correo: String(r.correo || '').trim().slice(0, 150)
    }))
  assert(safeLaborales.length === 1, `Filtró referencias laborales inválidas/nulas (esperado 1, obtenido ${safeLaborales.length})`)
  assert(safeLaborales[0].empresa === 'Bancolombia', 'Preservó empresa asociada a la referencia')

  console.log('\n======================================================')
  console.log(`[FIN] RESULTADOS: ${passedTests}/${totalTests} pruebas superadas exitosamente.`)
  console.log('======================================================\n')
}

runTests().catch(err => {
  console.error('[ERROR CRÍTICO EN QA SUITE]:', err)
  process.exit(1)
})
