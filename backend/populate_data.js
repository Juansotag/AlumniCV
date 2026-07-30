import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const USER_ID = '4496f1d2-f509-437a-ad77-cffd39db745b'

async function populate() {
  const daysAgo = (n) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString()
  }

  try {
    console.log('🧹 Limpiando tablas de base de datos...')
    await pool.query('DELETE FROM documents')
    await pool.query('DELETE FROM applications')
    await pool.query('DELETE FROM job_search_results')
    await pool.query('DELETE FROM job_searches')

    console.log('➕ Creando búsqueda de empleo de referencia...')
    const { rows: [search] } = await pool.query(
      `INSERT INTO job_searches (usuario_id, params, status, completed_at)
       VALUES ($1, $2::jsonb, 'done', NOW())
       RETURNING *`,
      [USER_ID, JSON.stringify({ query: 'Cargado Automático', location: 'Colombia', modalidad: 'todas', seniority: 'todos', limit: 20 })]
    )

    const empresas = [
      { name: 'Bancolombia', role: 'Analista de Datos', mode: 'hibrido', sal: '$4.500.000', post: 120, sen: 'junior' },
      { name: 'Rappi', role: 'Data Engineer', mode: 'virtual', sal: '$8.000.000', post: 250, sen: 'mid_senior' },
      { name: 'MercadoLibre', role: 'Machine Learning Dev', mode: 'virtual', sal: '$9.500.000', post: 310, sen: 'mid_senior' },
      { name: 'Globant', role: 'React Developer', mode: 'virtual', sal: '$6.000.000', post: 190, sen: 'mid_senior' },
      { name: 'Davivienda', role: 'Scrum Master', mode: 'presencial', sal: '$5.500.000', post: 85, sen: 'mid_senior' },
      { name: 'IBM', role: 'Data Architect', mode: 'virtual', sal: '$11.000.000', post: 150, sen: 'director' },
      { name: 'Falabella', role: 'Data Science Lead', mode: 'hibrido', sal: '$10.000.000', post: 140, sen: 'director' },
      { name: 'Accenture', role: 'AI Engineer', mode: 'virtual', sal: '$7.500.000', post: 210, sen: 'mid_senior' },
      { name: 'Nubank', role: 'Business Analyst', mode: 'virtual', sal: '$6.500.000', post: 420, sen: 'junior' },
      { name: 'Ecopetrol', role: 'Analista de BI', mode: 'presencial', sal: '$5.000.000', post: 95, sen: 'junior' },
      { name: 'Corona', role: 'Analista de Datos Senior', mode: 'presencial', sal: '$7.000.000', post: 60, sen: 'mid_senior' },
      { name: 'Alpina', role: 'Coordinador de Analítica', mode: 'hibrido', sal: '$6.500.000', post: 110, sen: 'mid_senior' },
      { name: 'Claro', role: 'Especialista SQL', mode: 'virtual', sal: '$5.200.000', post: 180, sen: 'mid_senior' },
      { name: 'Sura', role: 'Data Analyst Junior', mode: 'virtual', sal: '$3.800.000', post: 160, sen: 'junior' },
      { name: 'Platzi', role: 'Content Creator Tech', mode: 'virtual', sal: '$4.200.000', post: 350, sen: 'junior' },
      { name: 'Habi', role: 'Frontend Engineer', mode: 'virtual', sal: '$5.800.000', post: 130, sen: 'mid_senior' },
      { name: 'Tuya', role: 'Analista de BI', mode: 'presencial', sal: '$4.000.000', post: 70, sen: 'junior' },
      { name: 'Alkosto', role: 'Especialista en Reporting', mode: 'virtual', sal: '$5.000.000', post: 105, sen: 'mid_senior' },
      { name: 'Nutresa', role: 'Lead Analytics Architect', mode: 'presencial', sal: '$12.000.000', post: 50, sen: 'director' },
      { name: 'Bavaria', role: 'Data Scientist Senior', mode: 'virtual', sal: '$9.000.000', post: 220, sen: 'mid_senior' }
    ]

    console.log('➕ Creando anuncios e inventarios...')
    const jobResults = []
    for (const emp of empresas) {
      const { rows: [result] } = await pool.query(
        `INSERT INTO job_search_results (
          search_id, plataforma, empresa, puesto, link, compatibilidad,
          descripcion_corta, postulantes, ubicacion, modalidad, fecha_publicacion
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          search.id, 'LinkedIn', emp.name, emp.role,
          `https://www.linkedin.com/jobs/view/${Math.floor(Math.random() * 1000000000)}`,
          Math.floor(Math.random() * 30) + 70,
          `Vacante para el rol de ${emp.role} en la empresa ${emp.name}. Buscamos personas con experiencia y habilidades de analítica.`,
          emp.post, 'Bogotá, Colombia', emp.mode, daysAgo(3)
        ]
      )
      jobResults.push(result)
    }

    console.log('➕ Creando procesos de selección (applications)...')
    const createdApps = []
    
    // ── 1. Bancolombia (Fracasado - Rechazado tras entrevista) ────────────────
    const p1 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'telefono', notas: 'Llamada inicial de recursos humanos.', historial: [{ estado: 'amarillo', fecha: daysAgo(10), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'rojo', modalidad: 'presencial', notas: 'Rechazado tras entrevista técnica grupal presencial.', historial: [{ estado: 'rojo', fecha: daysAgo(8), nota: 'Fase de entrevista técnica' }] }
    ]
    
    // ── 2. Rappi (Fracasado - Cancelado por presupuesto) ─────────────────────
    const p2 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Primer contacto.', historial: [{ estado: 'amarillo', fecha: daysAgo(12), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'triangulo', estado: 'cancelado', modalidad: 'virtual', notas: 'Posición cancelada de forma indefinida.', historial: [{ estado: 'cancelado', fecha: daysAgo(9), nota: 'Cancelado en cascada' }] }
    ]

    // ── 3. MercadoLibre (Fracasado - Rechazado tras prueba) ──────────────────
    const p3 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Ingreso al portal.', historial: [{ estado: 'amarillo', fecha: daysAgo(14), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'triangulo', estado: 'rojo', modalidad: 'virtual', notas: 'Rechazado en test de Hackerrank.', historial: [{ estado: 'rojo', fecha: daysAgo(11), nota: 'Prueba de programación' }] }
    ]

    // ── 4. Globant (Fracasado - Cancelado en entrevista) ─────────────────────
    const p4 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'telefono', notas: 'Alineación de perfil.', historial: [{ estado: 'amarillo', fecha: daysAgo(8), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Entrevista técnica excelente.', historial: [{ estado: 'amarillo', fecha: daysAgo(6), nota: 'Entrevista técnica' }] },
      { id: 'n2', tipo: 'circulo', estado: 'cancelado', modalidad: 'virtual', notas: 'Proceso cancelado por reestructuración.', historial: [{ estado: 'cancelado', fecha: daysAgo(4), nota: 'Cancelado en cascada' }] }
    ]

    // ── 5. Davivienda (Fracasado - Rechazado en entrevista presencial) ─────────
    const p5 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'presencial', notas: 'Carga de documentos.', historial: [{ estado: 'amarillo', fecha: daysAgo(7), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'rojo', modalidad: 'presencial', notas: 'Entrevista presencial no superada.', historial: [{ estado: 'rojo', fecha: daysAgo(5), nota: 'Rechazado por comité' }] }
    ]

    // ── 6. IBM (Fracasado - Rechazado tras entrevista final) ──────────────────
    const p6 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Cargado.', historial: [{ estado: 'amarillo', fecha: daysAgo(15), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Prueba técnica entregada.', historial: [{ estado: 'amarillo', fecha: daysAgo(12), nota: 'Prueba técnica' }] },
      { id: 'n2', tipo: 'circulo', estado: 'rojo', modalidad: 'virtual', notas: 'Rechazado en fase final de encaje cultural.', historial: [{ estado: 'rojo', fecha: daysAgo(9), nota: 'Entrevista final' }] }
    ]

    // ── 7. Falabella (Fracasado - Cancelado tras contacto telefónico) ─────────
    const p7 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'telefono', notas: 'Llamada de primer filtro.', historial: [{ estado: 'amarillo', fecha: daysAgo(5), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'cancelado', modalidad: 'virtual', notas: 'Cancelado por congelación de vacantes.', historial: [{ estado: 'cancelado', fecha: daysAgo(3), nota: 'Cancelado' }] }
    ]

    // ── 8. Accenture (Fracasado - Rechazado en entrevista) ───────────────────
    const p8 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Proceso iniciado.', historial: [{ estado: 'amarillo', fecha: daysAgo(11), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'rojo', modalidad: 'virtual', notas: 'Rechazado tras entrevista de manager.', historial: [{ estado: 'rojo', fecha: daysAgo(8), nota: 'Entrevista con Manager' }] }
    ]

    // ── 9. Nubank (Fracasado - Cancelado tras primera fase) ───────────────────
    const p9 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Inscripción directa.', historial: [{ estado: 'amarillo', fecha: daysAgo(9), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'cancelado', modalidad: 'virtual', notas: 'Cancelado por decisión interna.', historial: [{ estado: 'cancelado', fecha: daysAgo(7), nota: 'Cancelado' }] }
    ]

    // ── 10. Ecopetrol (Fracasado - Rechazado en entrevista grupal) ───────────
    const p10 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'presencial', notas: 'Registro.', historial: [{ estado: 'amarillo', fecha: daysAgo(13), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'rojo', modalidad: 'presencial', notas: 'Rechazado.', historial: [{ estado: 'rojo', fecha: daysAgo(10), nota: 'Rechazado' }] }
    ]

    // ── 11. Corona (En Proceso - Filtro inicial) ─────────────────────────────
    const p11 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'telefono', notas: 'Primer filtro de RRHH completado.', historial: [{ estado: 'amarillo', fecha: daysAgo(4), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'amarillo', modalidad: 'presencial', notas: 'Esperando fecha para entrevista presencial.', historial: [{ estado: 'amarillo', fecha: daysAgo(2), nota: 'Agendada fase presencial' }] }
    ]

    // ── 12. Alpina (En Proceso - Esperando feedback prueba) ──────────────────
    const p12 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'presencial', notas: 'Contacto presencial.', historial: [{ estado: 'amarillo', fecha: daysAgo(6), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Prueba de arquitectura de datos cargada.', historial: [{ estado: 'amarillo', fecha: daysAgo(3), nota: 'Prueba enviada' }] }
    ]

    // ── 13. Claro (En Proceso - Varias fases mixtas) ─────────────────────────
    const p13 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'telefono', notas: 'Llamada filtro ok.', historial: [{ estado: 'amarillo', fecha: daysAgo(9), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Entrevista técnica inicial ok.', historial: [{ estado: 'amarillo', fecha: daysAgo(7), nota: 'Entrevista' }] },
      { id: 'n2', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Caso de SQL entregado ayer.', historial: [{ estado: 'amarillo', fecha: daysAgo(1), nota: 'Prueba de consultas' }] }
    ]

    // ── 14. Sura (En Proceso - Inicial) ──────────────────────────────────────
    const p14 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Hoja de vida preseleccionada.', historial: [{ estado: 'amarillo', fecha: daysAgo(2), nota: 'Preseleccionado' }] }
    ]

    // ── 15. Platzi (En Proceso - Esperando revisión caso) ────────────────────
    const p15 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Cargado.', historial: [{ estado: 'amarillo', fecha: daysAgo(7), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Enviada prueba de contenido.', historial: [{ estado: 'amarillo', fecha: daysAgo(4), nota: 'Prueba enviada' }] }
    ]

    // ── 16. Habi (En Proceso - Filtro entrevista técnica) ────────────────────
    const p16 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'telefono', notas: 'Alineado.', historial: [{ estado: 'amarillo', fecha: daysAgo(5), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Esperando citación técnica.', historial: [{ estado: 'amarillo', fecha: daysAgo(3), nota: 'En proceso' }] }
    ]

    // ── 17. Tuya (En Proceso - Inicial presencial) ───────────────────────────
    const p17 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'presencial', notas: 'Entrevista de encaje inicial.', historial: [{ estado: 'amarillo', fecha: daysAgo(1), nota: 'Proceso registrado' }] }
    ]

    // ── 18. Alkosto (En Proceso - Esperando feedback test) ───────────────────
    const p18 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Contacto de reclutador.', historial: [{ estado: 'amarillo', fecha: daysAgo(4), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Caso resuelto en Python enviado.', historial: [{ estado: 'amarillo', fecha: daysAgo(2), nota: 'Prueba enviada' }] }
    ]

    // ── 19. Nutresa (Seleccionado - Proceso largo y presencial) ──────────────
    const p19 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'telefono', notas: 'Llamada RRHH ok.', historial: [{ estado: 'amarillo', fecha: daysAgo(18), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'circulo', estado: 'amarillo', modalidad: 'presencial', notas: 'Entrevista con el director de analítica.', historial: [{ estado: 'amarillo', fecha: daysAgo(15), nota: 'Entrevista presencial' }] },
      { id: 'n2', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Caso práctico entregado.', historial: [{ estado: 'amarillo', fecha: daysAgo(12), nota: 'Prueba de negocio' }] },
      { id: 'n3', tipo: 'circulo', estado: 'amarillo', modalidad: 'presencial', notas: 'Entrevista con el vicepresidente financiero.', historial: [{ estado: 'amarillo', fecha: daysAgo(8), nota: 'Entrevista de Vicepresidencia' }] },
      { id: 'n4', tipo: 'estrella', estado: 'verde', modalidad: null, notas: 'Oferta económica aceptada y contrato firmado.', historial: [{ estado: 'verde', fecha: daysAgo(4), nota: 'Oferta de Selección' }] }
    ]

    // ── 20. Bavaria (Seleccionado - Virtual) ─────────────────────────────────
    const p20 = [
      { id: 'init', tipo: 'cuadrado', estado: 'amarillo', modalidad: 'virtual', notas: 'Inicio.', historial: [{ estado: 'amarillo', fecha: daysAgo(12), nota: 'Proceso registrado' }] },
      { id: 'n1', tipo: 'triangulo', estado: 'amarillo', modalidad: 'virtual', notas: 'Examen de SQL finalizado.', historial: [{ estado: 'amarillo', fecha: daysAgo(10), nota: 'Examen SQL' }] },
      { id: 'n2', tipo: 'estrella', estado: 'verde', modalidad: null, notas: 'Oferta aceptada. Inicio el próximo lunes.', historial: [{ estado: 'verde', fecha: daysAgo(5), nota: 'Contrato Aceptado' }] }
    ]

    const pipelines = [
      p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
      p11, p12, p13, p14, p15, p16, p17, p18, p19, p20
    ]

    console.log('➕ Insertando procesos...')
    for (let i = 0; i < 20; i++) {
      const emp = empresas[i]
      const res = jobResults[i]
      const { rows: [app] } = await pool.query(
        `INSERT INTO applications (
           usuario_id, job_search_result_id, empresa, puesto, plataforma,
           descripcion_corta, salario_expectativa, postulantes, seniority,
           ubicacion, modalidad, link, pipeline, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $14)
         RETURNING *`,
        [
          USER_ID, res.id, emp.name, emp.role, 'LinkedIn',
          res.descripcion_corta, emp.sal, emp.post, emp.sen,
          'Bogotá, Colombia', emp.mode, res.link,
          JSON.stringify(pipelines[i]),
          daysAgo(20 - i)
        ]
      )
      createdApps.push(app)
    }

    console.log('➕ Generando CVs para cada 3 procesos (6 documentos en total)...')
    const indicesConDocumentos = [2, 5, 8, 11, 14, 17] // Procesos 3, 6, 9, 12, 15, 18
    for (const idx of indicesConDocumentos) {
      const app = createdApps[idx]
      const shortId = app.id.toString().slice(-6)
      const filename = `Sotelo_CV_${app.empresa.replace(/[^a-zA-Z0-9]/g, '')}_${shortId}.docx`
      
      await pool.query(
        `INSERT INTO documents (application_id, usuario_id, tipo, nombre_archivo, file_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          app.id, USER_ID, 'cv', filename,
          'https://hctbxubdgrwhgudmdkqu.supabase.co/storage/v1/object/public/cv-templates/Juan_Diego_Sotelo_Aguilar_Resume.pdf'
        ]
      )
    }

    console.log('✅ Base de datos poblada exitosamente con 20 procesos de selección (10 fallidos, 8 en proceso, 2 seleccionados) y 6 CVs asociados.')
  } catch (err) {
    console.error('❌ Error general de carga:', err.message)
  } finally {
    await pool.end()
  }
}

populate()
