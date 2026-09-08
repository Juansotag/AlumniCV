/**
 * SIMULACIÓN COMPLETA DE USUARIO E INTEGRACIÓN END-TO-END
 *
 * Perfil evaluado:
 * - Candidata: Lic. Mariana Restrepo Gómez
 * - Profesión: Psicóloga con Maestría en Intervención Social y Comunitaria
 * - Trayectoria: Experiencia en EPS (EPS Sanitas) y como contratista por prestación
 *   de servicios en la Secretaría Distrital de Integración Social.
 * - Objetivo: Puesto en ESG / Sostenibilidad en el sector corporativo.
 * - Salarios: Primero $3.000.000, actualmente $5.500.000 (sin prestaciones sociales).
 * - Acciones:
 *   1. Registro y autenticación de cuenta nueva en Supabase Auth.
 *   2. Generación y subida de CV profesional en formato PDF con assessment de IA.
 *   3. Llenado del Perfil Maestro unificado (educación formal/informal, enlaces dinámicos,
 *      referencias laborales vinculadas a cargos, correo personal, salarios formateados).
 *   4. Búsqueda de empleo en tiempo real para roles ESG.
 *   5. Creación de 20 procesos de selección distintos con estados de pipeline variados.
 *   6. Generación de documentos ejecutivos personalizados (.docx).
 *   7. Consulta interactiva con el Coach Laboral de IA con contexto integrado.
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_URL = 'http://localhost:8000/api'
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas en backend/.env')
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const supabaseClient = createClient(SUPABASE_URL, ANON_KEY)

const TEST_EMAIL = 'mariana.restrepo@unisabana.edu.co'
const TEST_PASSWORD = 'EsgPassword2026!#'

let totalSteps = 0
let passedSteps = 0

function logStep(title) {
  totalSteps++
  console.log(`\n>>> [PASO ${totalSteps}] ${title}`)
}

function assertSuccess(condition, msg) {
  if (condition) {
    passedSteps++
    console.log(`  [OK] ${msg}`)
  } else {
    console.error(`  [FALLO] ${msg}`)
    throw new Error(`Fallo de validación: ${msg}`)
  }
}

// ── 1. Generador del PDF de CV de Mariana Restrepo ─────────────────────────
function generateMarianaCvPdf(outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 })
    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)

    // Encabezado
    doc.fontSize(18).fillColor('#1E3A8A').text('MARIANA RESTREPO GÓMEZ', { align: 'left' })
    doc.fontSize(11).fillColor('#4B5563').text('Psicóloga | Magíster en Intervención Social y Comunitaria | Especialista en Criterios ESG')
    doc.fontSize(9).fillColor('#6B7280').text('Bogotá, Colombia | mariana.restrepo.personal@gmail.com | +57 312 456 7890 | linkedin.com/in/mariana-restrepo-esg')
    doc.moveDown(0.8)

    // Perfil Profesional
    doc.fontSize(13).fillColor('#1E3A8A').text('PERFIL PROFESIONAL', { underline: true })
    doc.fontSize(10).fillColor('#1F2937').text(
      'Psicóloga con Maestría en Intervención Social y Comunitaria con más de 6 años de experiencia en diseño, articulación y evaluación de proyectos sociales de alta complejidad en salud pública (EPS) y administración distrital (Secretaría Distrital de Integración Social). Experta en relacionamiento con grupos de interés (stakeholders), análisis de materialidad social, debida diligencia en derechos humanos y estándares GRI. Orientada a liderar la dimensión Social (S) de marcos ESG corporativos, transformando desafíos comunitarios en estrategias de valor compartido y sostenibilidad empresarial.'
    )
    doc.moveDown(0.8)

    // Experiencia Laboral
    doc.fontSize(13).fillColor('#1E3A8A').text('EXPERIENCIA LABORAL', { underline: true })

    // Cargo 1
    doc.fontSize(11).fillColor('#111827').text('Secretaría Distrital de Integración Social — Consultora y Gestora Social Comunitaria')
    doc.fontSize(9).fillColor('#4B5563').text('Febrero 2022 - Presente | Modalidad: Contratista por Prestación de Servicios | Honorarios: $ 5.500.000 COP')
    doc.fontSize(9.5).fillColor('#1F2937').text(
      '• Lideró el diseño e implementación del modelo de intervención comunitaria participativa en 12 localidades prioritarias de Bogotá, beneficiando a más de 4.500 ciudadanos en situación de vulnerabilidad.'
    )
    doc.text(
      '• Coordinó mesas de diálogo social y articulación interinstitucional con líderes barriales y actores comunitarios, reduciendo niveles de conflictividad territorial en un 35%.'
    )
    doc.text(
      '• Estructuró la batería de 25 indicadores cuantitativos y cualitativos para la medición del impacto social y la trazabilidad de compromisos territoriales.'
    )
    doc.moveDown(0.6)

    // Cargo 2
    doc.fontSize(11).fillColor('#111827').text('EPS Sanitas — Psicóloga de Bienestar y Gestión de Casos Comunitarios')
    doc.fontSize(9).fillColor('#4B5563').text('Enero 2019 - Enero 2022 | Modalidad: Tiempo Completo (Nómina) | Salario: $ 3.000.000 COP')
    doc.fontSize(9.5).fillColor('#1F2937').text(
      '• Diseñó y facilitó programas de promoción y prevención psicosocial para una población asignada de más de 12.000 afiliados, articulando comités interdisciplinarios de salud.'
    )
    doc.text(
      '• Lideró talleres de clima laboral, salud mental y bienestar psicosocial para más de 350 colaboradores de la red prestadora.'
    )
    doc.text(
      '• Implementó protocolos de seguimiento y rutas de atención integral ante situaciones de riesgo psicosocial crítico.'
    )
    doc.moveDown(0.8)

    // Educación
    doc.fontSize(13).fillColor('#1E3A8A').text('EDUCACIÓN FORMAL', { underline: true })
    doc.fontSize(10).fillColor('#111827').text('Maestría en Intervención Social y Comunitaria')
    doc.fontSize(9).fillColor('#4B5563').text('Universidad Nacional de Colombia | 2019 - 2021 | Tesis con distinción meritoria')
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor('#111827').text('Pregrado en Psicología')
    doc.fontSize(9).fillColor('#4B5563').text('Pontificia Universidad Javeriana | 2013 - 2018 | Énfasis Social y Organizacional')
    doc.moveDown(0.8)

    // Formación Continua y Certificaciones
    doc.fontSize(13).fillColor('#1E3A8A').text('CERTIFICACIONES Y FORMACIÓN CONTINUA', { underline: true })
    doc.fontSize(9.5).fillColor('#1F2937').text('• Certificación Oficial en Estándares GRI (Global Reporting Initiative) para Reportes de Sostenibilidad (2023).')
    doc.text('• Diplomado en Derechos Humanos y Empresa: Debida Diligencia ESG — Universidad de los Andes (2023).')
    doc.text('• Curso Avanzado en Gestión y Consulta de Grupos de Interés bajo Estándar AA1000SES (2022).')
    doc.moveDown(0.8)

    // Habilidades
    doc.fontSize(13).fillColor('#1E3A8A').text('COMPETENCIAS Y HABILIDADES CLAVE', { underline: true })
    doc.fontSize(9.5).fillColor('#1F2937').text(
      '• Criterios ESG y Sostenibilidad Corporativa • Mapeo y Consulta de Grupos de Interés • Diagnóstico Social Comunitario • Resolución Pacífica de Conflictos • Medición de Retorno Social (SROI) • Comunicación Estratégica Intercultural • Liderazgo Colaborativo'
    )

    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

// ── 2. Función Principal de Simulación ────────────────────────────────────
async function runSimulation() {
  console.log('=====================================================================')
  console.log('ALUMNICV — SUITE DE SIMULACIÓN Y PRUEBAS CON USUARIO REAL')
  console.log('Candidata: Lic. Mariana Restrepo Gómez')
  console.log('Perfil: Psicóloga, M.Sc. Intervención Social | Aspirante a ESG Corporativo')
  console.log('=====================================================================')

  // PASO 1: Limpieza preventiva y creación de cuenta en Supabase Auth
  logStep('Creación y autenticación de la cuenta nueva en Supabase')

  // Si ya existía de un intento previo, la eliminamos para asegurar pureza total
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const oldUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL)
  if (oldUser) {
    console.log(`  [INFO] Eliminando usuario previo con ID ${oldUser.id} para prueba limpia...`)
    await supabaseAdmin.auth.admin.deleteUser(oldUser.id)
  }

  // Crear usuario con email confirmado
  const { data: { user: newUser }, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      nombre: 'Lic. Mariana Restrepo Gómez'
    }
  })

  if (createErr) throw createErr
  assertSuccess(Boolean(newUser?.id), `Usuario creado exitosamente con ID: ${newUser.id}`)

  // Iniciar sesión para obtener el JWT Bearer
  const { data: authData, error: loginErr } = await supabaseClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })
  if (loginErr) throw loginErr
  const token = authData.session.access_token
  assertSuccess(Boolean(token), 'Sesión iniciada con éxito. Bearer JWT obtenido.')

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  // PASO 2: Sincronización inicial en backend y verificación de usuario
  logStep('Sincronización inicial de usuario contra backend (GET /api/profile)')
  const initRes = await fetch(`${API_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
  const initData = await initRes.json()
  assertSuccess(initRes.ok, `Respuesta 200 OK del perfil. ID usuario: ${initData.usuario?.id}`)

  // PASO 3: Generación del CV PDF y subida a /api/cv/upload
  logStep('Generación del CV en PDF y subida (POST /api/cv/upload)')
  const pdfPath = path.join(__dirname, 'uploads', 'Mariana_Restrepo_Gomez_CV.pdf')
  await generateMarianaCvPdf(pdfPath)
  assertSuccess(fs.existsSync(pdfPath), `Archivo PDF generado correctamente (${fs.statSync(pdfPath).size} bytes)`)

  const pdfBuffer = fs.readFileSync(pdfPath)
  const formData = new FormData()
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
  formData.append('cv', pdfBlob, 'Mariana_Restrepo_Gomez_CV.pdf')

  console.log('  [INFO] Enviando CV a /api/cv/upload (extracción + assessment)...')
  const uploadRes = await fetch(`${API_URL}/cv/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  })
  const uploadData = await uploadRes.json()
  assertSuccess(uploadRes.ok, `CV procesado exitosamente. ID archivo: ${uploadData.cv_file?.id || 'OK'}`)
  console.log(`  [INFO] Score de reclutador obtenido: ${uploadData.assessment?.calificacion?.score || 'N/A'}/10`)

  // PASO 4: Actualización del Perfil Maestro Unificado
  logStep('Llenado del Perfil Maestro Unificado (PUT /api/profile)')
  const perfilData = {
    nombre: 'Lic. Mariana Restrepo Gómez',
    titular: 'Psicóloga Especialista en ESG, Sostenibilidad e Intervención Social',
    resumen: 'Psicóloga con Maestría en Intervención Social y Comunitaria con más de 6 años de experiencia en formulación, gestión y evaluación de proyectos sociales de alta complejidad en salud (EPS) y administración pública distrital (Secretaría Distrital de Integración Social). Especializada en diálogo social con grupos de interés, análisis de materialidad social, debida diligencia en derechos humanos y estándares internacionales GRI / AA1000SES para sostenibilidad corporativa y criterios ESG.',
    correo_personal: 'mariana.restrepo.personal@gmail.com',
    telefono: '+57 312 456 7890',
    ubicacion: 'Bogotá, Colombia',
    links: [
      { red: 'LinkedIn', url: 'https://linkedin.com/in/mariana-restrepo-esg' },
      { red: 'Portafolio de Proyectos de Impacto', url: 'https://marianarestrepo.notion.site/portfolio-social-esg' },
      { red: 'X / Twitter', url: 'https://x.com/marianarestrepo_esg' }
    ],
    experiencia: [
      {
        cargo: 'Consultora y Gestora de Proyectos Sociales Comunitarios',
        empresa: 'Secretaría Distrital de Integración Social',
        desde: '2022-02',
        hasta: 'Presente',
        modalidad: 'Prestación de servicios',
        salario: '$ 5.500.000',
        ubicacion: 'Bogotá, Colombia',
        descripcion: 'Estructuración y despliegue del modelo de intervención psicosocial y comunitaria en 12 localidades prioritarias de Bogotá. Coordinación de mesas de diálogo territorial con más de 4.500 participantes ciudadanos. Medición de impacto social mediante 25 indicadores cualitativos y cuantitativos.'
      },
      {
        cargo: 'Psicóloga de Bienestar y Gestión de Casos Comunitarios',
        empresa: 'EPS Sanitas',
        desde: '2019-01',
        hasta: '2022-01',
        modalidad: 'Tiempo completo',
        salario: '$ 3.000.000',
        ubicacion: 'Bogotá, Colombia',
        descripcion: 'Liderazgo de programas de prevención en salud mental y bienestar integral para una población asignada de más de 12.000 afiliados. Articulación de redes interinstitucionales y facilitación de talleres participativos para colaboradores y usuarios.'
      }
    ],
    educacion_formal: [
      {
        titulo: 'Maestría en Intervención Social y Comunitaria',
        institucion: 'Universidad Nacional de Colombia',
        nivel: 'Maestría',
        anio: '2021',
        desde: '2019',
        hasta: '2021'
      },
      {
        titulo: 'Pregrado en Psicología',
        institucion: 'Pontificia Universidad Javeriana',
        nivel: 'Pregrado',
        anio: '2018',
        desde: '2013',
        hasta: '2018'
      }
    ],
    formacion_no_formal: [
      {
        nombre: 'Diplomado en Derechos Humanos y Empresa: Debida Diligencia ESG',
        institucion: 'Universidad de los Andes',
        tipo: 'Diplomado',
        anio: '2023'
      }
    ],
    certificaciones: [
      'Certificación en Estándares GRI (Global Reporting Initiative) para Reportes de Sostenibilidad',
      'Gestión de Grupos de Interés bajo Norma AA1000SES'
    ],
    habilidades_tecnicas: [
      { nombre: 'Diagnóstico y Mapeo de Grupos de Interés (Stakeholders)', categoria: 'gestion' },
      { nombre: 'Diseño de Programas de Inversión Social y Valor Compartido', categoria: 'gestion' },
      { nombre: 'Estándares GRI y Reportes de Sostenibilidad / ESG', categoria: 'gestion' },
      { nombre: 'Evaluación de Impacto Social (Social ROI)', categoria: 'analitica' },
      { nombre: 'Manejo de Indicadores y Tableros de Control Social', categoria: 'analitica' },
      { nombre: 'Resolución y Mediación de Conflictos Territoriales', categoria: 'gestion' }
    ],
    habilidades_blandas: [
      'Comunicación Asertiva y Negociación Empática',
      'Liderazgo Adaptativo e Interdisciplinario',
      'Pensamiento Estratégico y Sistémico',
      'Resiliencia y Trabajo en Contextos Complejos'
    ],
    idiomas: [
      'Español (Nativo)',
      'Inglés (Intermedio B2)'
    ],
    referencias_laborales: [
      {
        nombre: 'Dra. Claudia Patricia Vargas',
        cargo: 'Directora Técnica de Integración Comunitaria',
        empresa: 'Secretaría Distrital de Integración Social',
        telefono: '+57 310 987 6543',
        correo: 'claudia.vargas@integracionsocial.gov.co'
      },
      {
        nombre: 'Dr. Andrés Felipe Morales',
        cargo: 'Coordinador de Salud Mental y Programas de Bienestar',
        empresa: 'EPS Sanitas',
        telefono: '+57 300 123 4567',
        correo: 'andres.morales@colsanitas.com'
      }
    ],
    referencias_personales: [
      {
        nombre: 'Carlos Mario Gómez',
        profesion: 'Consultor Senior en Políticas Públicas',
        telefono: '+57 315 555 4321',
        relacion: 'Colega de posgrado e investigación'
      }
    ]
  }

  const updateProfileRes = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(perfilData)
  })
  const updatedProfileData = await updateProfileRes.json()
  assertSuccess(updateProfileRes.ok, 'Perfil Maestro unificado actualizado en base de datos con éxito')

  // Verificar la persistencia completa
  const getProfileRes = await fetch(`${API_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
  const verifiedProfile = await getProfileRes.json()
  assertSuccess(verifiedProfile.usuario?.correo_personal === 'mariana.restrepo.personal@gmail.com', 'Correo personal persistido correctamente')
  assertSuccess(Array.isArray(verifiedProfile.usuario?.links) && verifiedProfile.usuario.links.length === 3, '3 enlaces y redes dinámicas persistidas')
  assertSuccess(verifiedProfile.usuario?.referencias_laborales?.length === 2, '2 referencias laborales vinculadas a EPS y Secretaría persistidas')
  assertSuccess(verifiedProfile.usuario?.experiencia[0]?.salario === '$ 5.500.000', 'Salario formateado con miles ($ 5.500.000) persistido')
  assertSuccess(verifiedProfile.usuario?.experiencia[1]?.salario === '$ 3.000.000', 'Salario previo formateado ($ 3.000.000) persistido')

  // PASO 5: Búsqueda de empleo en tiempo real
  logStep('Búsqueda de empleo en tiempo real para roles ESG (POST /api/job-search)')
  const searchRes = await fetch(`${API_URL}/job-search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: 'ESG Sostenibilidad Social',
      location: 'Colombia',
      modalidad: 'todas',
      seniority: 'todos',
      limit: 15
    })
  })
  const searchData = await searchRes.json()
  assertSuccess(searchRes.ok, `Búsqueda ejecutada exitosamente. Se obtuvieron ${searchData.results?.length || 0} resultados`)

  // Obtener inventario acumulado de resultados
  const searchResultsRes = await fetch(`${API_URL}/job-search/results`, { headers: { 'Authorization': `Bearer ${token}` } })
  const searchResultsData = await searchResultsRes.json()
  assertSuccess(searchResultsRes.ok, `Resultados acumulados consultados: ${searchResultsData.results?.length || 0} vacantes`)

  // PASO 6: Creación de 20 procesos de selección distintos
  logStep('Creación de 20 procesos de selección corporativos en ESG con pipelines variados')

  const now = new Date()
  const daysAgo = (n) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return d.toISOString()
  }

  const procesosESG = [
    {
      empresa: 'Grupo Nutresa',
      puesto: 'Especialista en Sostenibilidad y Desarrollo Social Comunitario',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.500.000',
      ubicacion: 'Medellín / Bogotá',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Liderar la estrategia de abastecimiento responsable, diálogo social con proveedores cacaoteros y cafoteros y matriz de materialidad social.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Postulación enviada y CV preseleccionado', historial: [{ estado: 'verde', fecha: daysAgo(14), nota: 'Filtro superado' }] },
        { id: '2', tipo: 'circulo', estado: 'verde', modalidad: 'virtual', notas: 'Entrevista de competencias con Dirección de Talento Humano', historial: [{ estado: 'verde', fecha: daysAgo(7), nota: 'Entrevista muy favorable' }] },
        { id: '3', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Presentación de caso práctico sobre relacionamiento comunitario y valor compartido', historial: [{ estado: 'amarillo', fecha: daysAgo(2), nota: 'En preparación de presentación' }] }
      ]
    },
    {
      empresa: 'Bancolombia',
      puesto: 'Analista Senior de Estrategia ESG y Derechos Humanos',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 8.000.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'Portal Corporativo',
      descripcion_corta: 'Evaluación de riesgos sociales y ambientales en créditos corporativos y debida diligencia de derechos humanos en cartera de proyectos.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'CV filtrado por ATS y analista de selección', historial: [{ estado: 'verde', fecha: daysAgo(20), nota: 'Aprobado' }] },
        { id: '2', tipo: 'circulo', estado: 'verde', modalidad: 'virtual', notas: 'Entrevista con Gerente de Sostenibilidad', historial: [{ estado: 'verde', fecha: daysAgo(10), nota: 'Excelente afinidad con el rol' }] },
        { id: '3', tipo: 'triangulo', estado: 'verde', modalidad: 'virtual', notas: 'Prueba técnica de evaluación de materialidad GRI y taxonomía verde', historial: [{ estado: 'verde', fecha: daysAgo(4), nota: 'Aprobada con 95/100' }] },
        { id: '4', tipo: 'estrella', estado: 'amarillo', modalidad: null, notas: 'Panel final con Vicepresidencia de Reputación y Sostenibilidad', historial: [{ estado: 'amarillo', fecha: daysAgo(1), nota: 'Convocada a panel final' }] }
      ]
    },
    {
      empresa: 'Ecopetrol',
      puesto: 'Profesional de Entorno y Diálogo Social con Grupos de Interés',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 9.200.000',
      ubicacion: 'Barrancabermeja / Bogotá',
      plataforma: 'Convocatoria Pública',
      descripcion_corta: 'Gestión preventiva de conflictos socioambientales, relacionamiento territorial con comunidades étnicas y monitoreo de acuerdos de inversión social.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Cumplimiento de requisitos de formación y experiencia certificada', historial: [{ estado: 'verde', fecha: daysAgo(18), nota: 'Verificación documental OK' }] },
        { id: '2', tipo: 'circulo', estado: 'amarillo', modalidad: 'telefono', notas: 'Validación telefónica de disponibilidad para viajes territoriales', historial: [{ estado: 'amarillo', fecha: daysAgo(5), nota: 'Llamada pendiente' }] }
      ]
    },
    {
      empresa: 'Bavaria (AB InBev)',
      puesto: 'Coordinadora de Impacto Social y Consumo Responsable',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 8.500.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Liderazgo de iniciativas comunitarias de protección de páramos, reciclaje inclusivo y programas de inclusión económica de tenderos.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Postulación en línea aprobada', historial: [{ estado: 'verde', fecha: daysAgo(25), nota: 'Perfil aprobado' }] },
        { id: '2', tipo: 'circulo', estado: 'verde', modalidad: 'virtual', notas: 'Entrevista con People Director', historial: [{ estado: 'verde', fecha: daysAgo(15), nota: 'Paso a etapa final' }] },
        { id: '3', tipo: 'estrella', estado: 'verde', modalidad: null, notas: 'Oferta laboral formal recibida: $8.500.000 + bono anual y medicina prepagada', historial: [{ estado: 'verde', fecha: daysAgo(1), nota: 'Oferta en mano para revisión' }] }
      ]
    },
    {
      empresa: 'Enel Colombia',
      puesto: 'Gestora Social Territorial y Transición Energética Justa',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.800.000',
      ubicacion: 'Cundinamarca / La Guajira',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Implementación del plan de valor compartido y consulta previa en proyectos de energía renovable solar y eólica.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'CV postulado', historial: [{ estado: 'verde', fecha: daysAgo(12), nota: 'Inscripción registrada' }] },
        { id: '2', tipo: 'circulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Entrevista técnica sobre normativa de consulta previa y diálogo social', historial: [{ estado: 'amarillo', fecha: daysAgo(3), nota: 'Programada para esta semana' }] }
      ]
    },
    {
      empresa: 'Cementos Argos',
      puesto: 'Especialista en Relaciones con la Comunidad y Sostenibilidad',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.200.000',
      ubicacion: 'Medellín / Tolima',
      plataforma: 'Portal Argos',
      descripcion_corta: 'Articulación de programas de mejoramiento de vivienda comunitaria, planes de vida comunitaria y reporte de huella social.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Filtro curricular aprobado', historial: [{ estado: 'verde', fecha: daysAgo(8), nota: 'Aprobado' }] }
      ]
    },
    {
      empresa: 'Terpel',
      puesto: 'Líder de Inversión Social y Equidad Territorial',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 8.000.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Diseño estratégico de proyectos educativos de la Fundación Terpel y alianzas público-privadas en regiones no interconectadas.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Postulado por referencia interna', historial: [{ estado: 'verde', fecha: daysAgo(16), nota: 'CV recibido' }] },
        { id: '2', tipo: 'circulo', estado: 'verde', modalidad: 'virtual', notas: 'Entrevista con Gerente de Asuntos Corporativos', historial: [{ estado: 'verde', fecha: daysAgo(9), nota: 'Concepto favorable' }] },
        { id: '3', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Diseño de propuesta para proyecto en Chocó', historial: [{ estado: 'amarillo', fecha: daysAgo(3), nota: 'En elaboración' }] }
      ]
    },
    {
      empresa: 'Alpina',
      puesto: 'Coordinadora de Valor Compartido y Abastecimiento Responsable',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.000.000',
      ubicacion: 'Sopó / Bogotá',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Fortalecimiento asociativo de pequeños productores de leche, bienestar rural e iniciativas de ganadería regenerativa y social.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Registro completado', historial: [{ estado: 'verde', fecha: daysAgo(11), nota: 'Postulada' }] },
        { id: '2', tipo: 'circulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Primera conversación con HR Business Partner', historial: [{ estado: 'amarillo', fecha: daysAgo(4), nota: 'Agendada' }] }
      ]
    },
    {
      empresa: 'Davivienda',
      puesto: 'Analista de Sostenibilidad y Finanzas Sociales',
      modalidad: 'hibrido',
      seniority: 'junior',
      salario_expectativa: '$ 6.500.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'Computrabajo',
      descripcion_corta: 'Desarrollo de líneas de microfinanzas con enfoque de género, educación financiera en comunidades rurales y medición de impacto social.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Filtro automático superado', historial: [{ estado: 'verde', fecha: daysAgo(15), nota: 'Aprobado' }] },
        { id: '2', tipo: 'circulo', estado: 'verde', modalidad: 'virtual', notas: 'Entrevista grupal de evaluación por casos', historial: [{ estado: 'verde', fecha: daysAgo(8), nota: 'Aprobada' }] }
      ]
    },
    {
      empresa: 'Claro Colombia',
      puesto: 'Especialista en Responsabilidad Corporativa e Inclusión Digital',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.500.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Monitoreo de proyectos de conectividad en escuelas rurales y evaluación psicosocial de adopción tecnológica.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'amarillo', modalidad: null, notas: 'CV en revisión por equipo de sostenibilidad', historial: [{ estado: 'amarillo', fecha: daysAgo(3), nota: 'Postulación reciente' }] }
      ]
    },
    {
      empresa: 'ISA (Interconexión Eléctrica S.A.)',
      puesto: 'Especialista de Gestión Social y Consulta Previa',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 9.000.000',
      ubicacion: 'Medellín / Bogotá',
      plataforma: 'Portal ISA',
      descripcion_corta: 'Dirección de planes de manejo ambiental y social en corredores de transmisión eléctrica con enfoque diferencial.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Verificación de hoja de vida aprobada', historial: [{ estado: 'verde', fecha: daysAgo(22), nota: 'Aceptada' }] },
        { id: '2', tipo: 'circulo', estado: 'rojo', modalidad: 'virtual', notas: 'Proceso cerrado por contratación interna de un colaborador', historial: [{ estado: 'rojo', fecha: daysAgo(6), nota: 'No continúa: vacante cubierta internamente' }] }
      ]
    },
    {
      empresa: 'Grupo Éxito',
      puesto: 'Coordinadora de Fundación Éxito y Nutrición Comunitaria',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 6.800.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Gestión de alianzas estratégicas para erradicar la desnutrición crónica infantil y seguimiento psicosocial a madres gestantes.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Postulada', historial: [{ estado: 'verde', fecha: daysAgo(10), nota: 'CV analizado' }] },
        { id: '2', tipo: 'circulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Entrevista con Dirección Ejecutiva de Fundación', historial: [{ estado: 'amarillo', fecha: daysAgo(2), nota: 'Agendada para mañana' }] }
      ]
    },
    {
      empresa: 'GeoPark',
      puesto: 'Coordinadora de Relacionamiento Comunitario y Derechos Humanos',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 9.500.000',
      ubicacion: 'Casanare / Bogotá',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Liderazgo en territorio de la política de debida diligencia en DDHH y concertación de acuerdos de inversión social.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Perfil preseleccionado', historial: [{ estado: 'verde', fecha: daysAgo(13), nota: 'Preseleccionada' }] },
        { id: '2', tipo: 'circulo', estado: 'verde', modalidad: 'virtual', notas: 'Entrevista de competencias', historial: [{ estado: 'verde', fecha: daysAgo(5), nota: 'Aprobada' }] }
      ]
    },
    {
      empresa: 'Corona Industrial',
      puesto: 'Analista de Sostenibilidad y Huella Social',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 6.500.000',
      ubicacion: 'Bogotá / Funza',
      plataforma: 'Magneto',
      descripcion_corta: 'Cálculo de huella social, programas de salud ocupacional comunitaria y diálogo con comunidades vecinas a plantas industriales.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'amarillo', modalidad: null, notas: 'Hoja de vida enviada', historial: [{ estado: 'amarillo', fecha: daysAgo(5), nota: 'Enviada' }] }
      ]
    },
    {
      empresa: 'Postobón',
      puesto: 'Coordinadora de Programas de Desarrollo Agropecuario Sostenible',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.200.000',
      ubicacion: 'Medellín / Bogotá',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Fortalecimiento de asociaciones de pequeños cultivadores de fruta mediante el programa Hit Social Postobón.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Aprobada en filtro inicial', historial: [{ estado: 'verde', fecha: daysAgo(17), nota: 'Filtro OK' }] },
        { id: '2', tipo: 'circulo', estado: 'verde', modalidad: 'virtual', notas: 'Entrevista con Coordinación de Sostenibilidad', historial: [{ estado: 'verde', fecha: daysAgo(11), nota: 'Pasa a panel' }] },
        { id: '3', tipo: 'estrella', estado: 'amarillo', modalidad: null, notas: 'Esperando deliberación del comité de contratación', historial: [{ estado: 'amarillo', fecha: daysAgo(2), nota: 'Comité en curso' }] }
      ]
    },
    {
      empresa: 'Compensar',
      puesto: 'Líder de Alianzas Corporativas para Impacto Social',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.000.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'Portal Compensar',
      descripcion_corta: 'Articulación de proyectos de bienestar y desarrollo social para empresas afiliadas y sus colaboradores.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Postulada', historial: [{ estado: 'verde', fecha: daysAgo(7), nota: 'CV evaluado' }] }
      ]
    },
    {
      empresa: 'Cerrejón',
      puesto: 'Gestora de Acuerdos Comunitarios y Planes de Vida',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 9.800.000',
      ubicacion: 'La Guajira / Barranquilla',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Cumplimiento de la Sentencia T-704, concertación de planes de desarrollo integral con comunidades Wayúu.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Registro completado', historial: [{ estado: 'verde', fecha: daysAgo(19), nota: 'Aprobado' }] },
        { id: '2', tipo: 'circulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Entrevista técnica sobre consulta previa y enfoque diferencial', historial: [{ estado: 'amarillo', fecha: daysAgo(4), nota: 'Pendiente' }] }
      ]
    },
    {
      empresa: 'Colsubsidio',
      puesto: 'Especialista en Evaluación de Proyectos de Sostenibilidad',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 6.800.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'Computrabajo',
      descripcion_corta: 'Evaluación ex-ante y ex-post del impacto social de los programas de subsidio y desarrollo comunitario.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'Postulación aprobada', historial: [{ estado: 'verde', fecha: daysAgo(9), nota: 'Aprobada' }] }
      ]
    },
    {
      empresa: 'Crepes & Waffles',
      puesto: 'Coordinadora de Bienestar Social y Encadenamientos Productivos',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 6.500.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'Convocatoria Directa',
      descripcion_corta: 'Acompañamiento psicosocial integral a madres cabeza de familia y encadenamiento con comunidades agrícolas de Montes de María.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'verde', modalidad: null, notas: 'CV seleccionado por afinidad de valores', historial: [{ estado: 'verde', fecha: daysAgo(14), nota: 'Afinidad alta' }] },
        { id: '2', tipo: 'circulo', estado: 'verde', modalidad: 'virtual', notas: 'Entrevista profunda de valores y propósito', historial: [{ estado: 'verde', fecha: daysAgo(6), nota: 'Muy valorada' }] }
      ]
    },
    {
      empresa: 'Hocol',
      puesto: 'Profesional de Gestión de Entorno y Diálogo Territorial',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 8.800.000',
      ubicacion: 'Huila / Bogotá',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Articulación de mesas comunitarias y monitoreo de inversiones sociales obligatorias y voluntarias.',
      pipeline: [
        { id: '1', tipo: 'cuadrado', estado: 'amarillo', modalidad: null, notas: 'Hoja de vida radicada', historial: [{ estado: 'amarillo', fecha: daysAgo(2), nota: 'Radicada' }] }
      ]
    }
  ]

  const createdApplications = []
  for (const proc of procesosESG) {
    const res = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers,
      body: JSON.stringify(proc)
    })
    const data = await res.json()
    if (res.ok && data.application) {
      createdApplications.push(data.application)
    } else {
      console.error('Error al crear aplicación:', data)
    }
  }

  assertSuccess(createdApplications.length === 20, `Se crearon exactamente 20 procesos de selección en base de datos`)

  // Consultar lista completa de procesos
  const getAppsRes = await fetch(`${API_URL}/applications`, { headers: { 'Authorization': `Bearer ${token}` } })
  const appsList = await getAppsRes.json()
  assertSuccess(appsList.applications?.length === 20, `GET /api/applications retornó los 20 procesos correctamente`)

  // PASO 7: Generación de Documentos (.docx) Personalizados con IA
  logStep('Generación de documentos ejecutivos adaptados a vacante objetivo (POST /api/documents/generate)')

  const nutresaApp = createdApplications.find(a => a.empresa === 'Grupo Nutresa')
  assertSuccess(Boolean(nutresaApp), 'Aplicación de Grupo Nutresa encontrada para generación documental')

  console.log(`  [INFO] Generando documentos personalizados (CV, Cover Letter, Correo) para ${nutresaApp.puesto} en ${nutresaApp.empresa}...`)
  const docGenRes = await fetch(`${API_URL}/documents/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      application_id: nutresaApp.id,
      tipo: 'todos'
    })
  })
  const docGenData = await docGenRes.json()
  assertSuccess(docGenRes.ok, `Documentos generados y almacenados con éxito. Total generados: ${docGenData.documentos?.length || 0}`)

  // Consultar historial de documentos generados
  const getDocsRes = await fetch(`${API_URL}/documents`, { headers: { 'Authorization': `Bearer ${token}` } })
  const docsData = await getDocsRes.json()
  assertSuccess(docsData.documents?.length > 0, `GET /api/documents retornó ${docsData.documents?.length} documentos almacenados`)

  // PASO 8: Consulta de Asesoría Estratégica con el Coach Laboral de IA
  logStep('Prueba interactiva con el Coach Laboral (POST /api/coach/chat)')
  const coachPrompt = 'Hola, soy Mariana Restrepo. Vengo del sector público distrital (Secretaría de Integración Social) y de salud (EPS Sanitas). Tengo entrevistas clave para Especialista en Sostenibilidad en Grupo Nutresa y Bancolombia. ¿Cómo puedo presentar estratégicamente mi experiencia como psicóloga comunitaria y contratista por prestación de servicios como una ventaja competitiva diferencial frente a perfiles tradicionales de ingeniería o finanzas?'

  console.log('  [INFO] Consultando al Coach con el contexto completo de Mariana...')
  const coachRes = await fetch(`${API_URL}/coach/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: [{ role: 'user', content: coachPrompt }]
    })
  })
  const coachData = await coachRes.json()
  assertSuccess(coachRes.ok, 'Respuesta estratégica recibida del Coach Laboral con éxito')
  console.log('\n--- EXTRACTO DE RESPUESTA DEL COACH LABORAL ---')
  console.log(coachData.response ? coachData.response.slice(0, 450) + '...\n' : 'Respuesta OK')

  // RESUMEN FINAL
  console.log('=====================================================================')
  console.log(`[SIMULACIÓN COMPLETADA CON ÉXITO] ${passedSteps}/${totalSteps} validaciones superadas`)
  console.log('Candidata Mariana Restrepo Gómez totalmente integrada en la plataforma.')
  console.log('=====================================================================\n')
}

runSimulation().catch(err => {
  console.error('\n[ERROR FATAL EN SIMULACIÓN]:', err)
  process.exit(1)
})
