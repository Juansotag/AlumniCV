import { query } from './src/db/index.js';

async function populateExampleAccount() {
  const emails = [
    'mariana.restrepo@unisabana.edu.co',
    'mariana.restrepo.esg@alumnicv-sim.com'
  ];

  console.log('=== POBLANDO CUENTAS DE EJEMPLO CON PERFIL COMPLETO Y PROCESOS DE SELECCIÓN ===');

  const now = new Date();
  const daysAgo = (n, hour = 10, min = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

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
        descripcion: 'Estructuración y despliegue del modelo de intervención psicosocial y comunitaria en 12 localidades prioritarias de Bogotá, beneficiando a más de 4.500 ciudadanos en situación de vulnerabilidad. Coordinación de mesas de diálogo territorial e interinstitucional, reduciendo niveles de conflictividad territorial en un 35%. Medición de impacto social mediante una batería de 25 indicadores cualitativos y cuantitativos para la toma de decisiones basada en evidencia.'
      },
      {
        cargo: 'Psicóloga de Bienestar y Gestión de Casos Comunitarios',
        empresa: 'EPS Sanitas',
        desde: '2019-01',
        hasta: '2022-01',
        modalidad: 'Tiempo completo',
        salario: '$ 3.000.000',
        ubicacion: 'Bogotá, Colombia',
        descripcion: 'Liderazgo de programas de prevención en salud mental y bienestar integral para una población asignada de más de 12.000 afiliados. Articulación de redes interinstitucionales y facilitación de talleres participativos comunitarios para colaboradores y usuarios.'
      }
    ],
    educacion_formal: [
      {
        titulo: 'Maestría en Intervención Social y Comunitaria',
        institucion: 'Universidad Nacional de Colombia',
        nivel: 'maestria',
        anio: '2021',
        desde: '2019',
        hasta: '2021',
        estado: 'graduado',
        logros: 'Tesis meritoria laureada: "Modelos de participación comunitaria en salud mental colectiva". Beca de Excelencia Académica para Posgrados. Reconocimiento por mejor promedio de la cohorte (4.85/5.0).'
      },
      {
        titulo: 'Pregrado en Psicología',
        institucion: 'Pontificia Universidad Javeriana',
        nivel: 'pregrado',
        anio: '2018',
        desde: '2013',
        hasta: '2018',
        estado: 'graduado',
        logros: 'Mención de Honor en Grado por rendimiento académico sobresaliente. Monitora de investigación en Psicología Social y Comunitaria durante 4 semestres consecutivos. Trabajo de grado publicado en revista institucional indexada.'
      }
    ],
    formacion_no_formal: [
      {
        nombre: 'Diplomado en Derechos Humanos y Empresa: Debida Diligencia ESG',
        institucion: 'Universidad de los Andes',
        tipo: 'Diplomado',
        anio: '2023',
        intensidad_horas: '120 horas'
      },
      {
        nombre: 'Minor en Sostenibilidad Corporativa y Economía Circular',
        institucion: 'Universidad de La Sabana',
        tipo: 'Minor',
        anio: '2022',
        intensidad_horas: '80 horas'
      }
    ],
    certificaciones: [
      {
        nombre: 'GRI Certified Sustainability Professional',
        entidad_emisora: 'Global Reporting Initiative (GRI)',
        anio: '2023'
      },
      {
        nombre: 'Auditor Líder en Diálogo con Stakeholders AA1000SES',
        entidad_emisora: 'AccountAbility',
        anio: '2024'
      }
    ],
    habilidades_tecnicas: [
      { nombre: 'Diagnóstico y Mapeo de Grupos de Interés (Stakeholders)', categoria: 'gestion', nivel: 'avanzado' },
      { nombre: 'Diseño de Programas de Inversión Social y Valor Compartido', categoria: 'gestion', nivel: 'avanzado' },
      { nombre: 'Estándares GRI y Reportes de Sostenibilidad / ESG', categoria: 'gestion', nivel: 'avanzado' },
      { nombre: 'Debida Diligencia en Derechos Humanos', categoria: 'gestion', nivel: 'avanzado' },
      { nombre: 'Evaluación de Impacto Social (Social ROI)', categoria: 'analitica', nivel: 'avanzado' },
      { nombre: 'Manejo de Indicadores y Tableros de Control Social', categoria: 'analitica', nivel: 'avanzado' },
      { nombre: 'Investigación Cualitativa y Métodos Mixtos', categoria: 'analitica', nivel: 'avanzado' },
      { nombre: 'Resolución y Mediación de Conflictos Territoriales', categoria: 'gestion', nivel: 'avanzado' },
      { nombre: 'Excel Avanzado', categoria: 'software', nivel: 'avanzado' },
      { nombre: 'Power BI', categoria: 'software', nivel: 'intermedio' }
    ],
    habilidades_blandas: [
      'Comunicación Asertiva y Negociación Empática',
      'Liderazgo Adaptativo e Interdisciplinario',
      'Pensamiento Estratégico y Sistémico',
      'Resiliencia y Trabajo en Contextos Complejos',
      'Facilitación de Diálogos Comunitarios y Mesas de Concertación'
    ],
    idiomas: [
      { idioma: 'Español', nivel: 'nativo', nivel_mcer: 'Nativo' },
      { idioma: 'Inglés', nivel: 'avanzado', nivel_mcer: 'B2' }
    ],
    referencias_laborales: [
      {
        nombre: 'Dra. Claudia Patricia Vargas',
        empresa: 'Secretaría Distrital de Integración Social',
        cargo_referente: 'Directora Técnica de Integración Comunitaria',
        telefono: '+57 310 987 6543',
        correo: 'claudia.vargas@integracionsocial.gov.co',
        relacion: 'Jefe inmediato',
        notas: 'Excelente concepto sobre liderazgo en territorio, concertación con comunidades vulnerables y cumplimiento estricto de metas.'
      },
      {
        nombre: 'Dr. Andrés Felipe Morales',
        empresa: 'EPS Sanitas',
        cargo_referente: 'Coordinador de Salud Mental y Programas de Bienestar',
        telefono: '+57 300 123 4567',
        correo: 'andres.morales@colsanitas.com',
        relacion: 'Jefe inmediato',
        notas: 'Respalda capacidades de diseño de programas de bienestar, articulación institucional y empatía profesional.'
      }
    ],
    referencias_personales: [
      {
        nombre: 'Carlos Mario Gómez',
        profesion: 'Consultor Senior en Políticas Públicas',
        telefono: '+57 315 555 4321',
        correo: 'carlos.gomez.consultor@gmail.com',
        relacion: 'Colega de maestría e investigación'
      },
      {
        nombre: 'Laura Sofia Mendoza',
        profesion: 'Coordinadora de Sostenibilidad en Sector Privado',
        telefono: '+57 318 765 4321',
        correo: 'laura.mendoza@sostenibilidad.org',
        relacion: 'Colega profesional y mentora'
      }
    ]
  };

  const procesos = [
    {
      empresa: 'Grupo Nutresa',
      puesto: 'Especialista en Sostenibilidad y Desarrollo Social Comunitario',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.500.000',
      ubicacion: 'Medellín / Bogotá',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Liderar la estrategia de abastecimiento responsable, diálogo social con proveedores cacaoteros y cafeteros y matriz de materialidad social corporativa.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Postulación enviada mediante portal de empleo de Nutresa. CV preseleccionado con score sobresaliente en fit cultural.',
          historial: [
            { estado: 'verde', fecha: daysAgo(21, 9, 30), nota: 'Postulación formal enviada con CV adaptado' },
            { estado: 'verde', fecha: daysAgo(17, 14, 15), nota: 'Filtro curricular aprobado por analista de atracción de talento' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'verde',
          modalidad: 'virtual',
          notas: 'Entrevista por competencias con Dirección de Talento Humano. Enfoque en resolución de conflictos territoriales y valores corporativos.',
          historial: [
            { estado: 'verde', fecha: daysAgo(12, 10, 0), nota: 'Entrevista realizada vía Microsoft Teams. Concepto muy favorable' }
          ]
        },
        {
          id: '3',
          tipo: 'triangulo',
          estado: 'amarillo',
          modalidad: 'virtual',
          notas: 'Presentación de caso práctico sobre relacionamiento comunitario y medición de Social ROI en cadenas de valor agrícola.',
          historial: [
            { estado: 'verde', fecha: daysAgo(6, 11, 30), nota: 'Caso recibido. Planteamiento de matriz de riesgos comunitarios' },
            { estado: 'amarillo', fecha: daysAgo(1, 16, 0), nota: 'En preparación de diapositivas ejecutivas para panel con Gerencia de Sostenibilidad' }
          ]
        }
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
      descripcion_corta: 'Evaluación de riesgos sociales y ambientales en créditos corporativos y debida diligencia de derechos humanos bajo estándares GRI y Principios del Ecuador.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Inscripción en portal institucional. Filtro ATS superado al 100% por coincidencia en estándares GRI y taxonomía verde.',
          historial: [
            { estado: 'verde', fecha: daysAgo(25, 8, 45), nota: 'CV recibido y validado por sistema ATS' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'verde',
          modalidad: 'virtual',
          notas: 'Entrevista con Gerente de Sostenibilidad. Excelente química y discusión profunda sobre materialidad financiera vs. social.',
          historial: [
            { estado: 'verde', fecha: daysAgo(16, 15, 0), nota: 'Entrevista virtual completada con feedback sobresaliente' }
          ]
        },
        {
          id: '3',
          tipo: 'triangulo',
          estado: 'verde',
          modalidad: 'virtual',
          notas: 'Prueba técnica de evaluación de materialidad GRI y cuestionario de diligencia debida en derechos humanos.',
          historial: [
            { estado: 'verde', fecha: daysAgo(8, 11, 0), nota: 'Prueba técnica entregada y calificada con 96/100' }
          ]
        },
        {
          id: '4',
          tipo: 'estrella',
          estado: 'amarillo',
          modalidad: 'presencial',
          notas: 'Panel final con Vicepresidencia de Reputación y Sostenibilidad en Torre Bancolombia.',
          historial: [
            { estado: 'amarillo', fecha: daysAgo(2, 9, 30), nota: 'Convocatoria oficial recibida para reunión presencial con la Vicepresidenta' }
          ]
        }
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
      descripcion_corta: 'Gestión preventiva de conflictividad socioambiental, relacionamiento territorial con comunidades étnicas y monitoreo de acuerdos de inversión social.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Verificación de requisitos mínimos habilitantes (título convalidado, experiencia certificada en sector público/privado).',
          historial: [
            { estado: 'verde', fecha: daysAgo(30, 10, 0), nota: 'Radicación de documentos habilitantes en plataforma' },
            { estado: 'verde', fecha: daysAgo(22, 17, 0), nota: 'Puntaje de mérito curricular: 100/100 puntos' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'amarillo',
          modalidad: 'telefono',
          notas: 'Validación telefónica de disponibilidad para comisiones técnicas en territorio y prueba de polígrafo/seguridad.',
          historial: [
            { estado: 'amarillo', fecha: daysAgo(4, 14, 20), nota: 'Llamada de coordinación de agenda programada para esta semana' }
          ]
        }
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
      descripcion_corta: 'Liderazgo de iniciativas comunitarias de protección de cuencas y páramos (MiPáramo), inclusión económica de tenderos y consumo moderado.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Postulación en LinkedIn Easy Apply y screening con Talent Specialist.',
          historial: [
            { estado: 'verde', fecha: daysAgo(28, 11, 0), nota: 'Postulación completada' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'verde',
          modalidad: 'virtual',
          notas: 'Entrevista estratégica con People Director para Colombia y Perú.',
          historial: [
            { estado: 'verde', fecha: daysAgo(18, 16, 30), nota: 'Entrevista finalizada con recomendación unánime' }
          ]
        },
        {
          id: '3',
          tipo: 'estrella',
          estado: 'verde',
          modalidad: null,
          notas: 'Oferta laboral formal recibida: $8.500.000 básico + 2.5 salarios de bono por desempeño anual y póliza de salud.',
          historial: [
            { estado: 'verde', fecha: daysAgo(3, 11, 0), nota: 'Carta de oferta formal recibida en correo electrónico para firma' }
          ]
        }
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
      descripcion_corta: 'Implementación del plan de valor compartido y consulta previa en proyectos de energía solar fotovoltaica y eólica.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'CV postulado a través del portal de empleo Enel Careers.',
          historial: [
            { estado: 'verde', fecha: daysAgo(19, 14, 0), nota: 'Inscripción exitosa' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'amarillo',
          modalidad: 'virtual',
          notas: 'Entrevista técnica sobre normativa de consulta previa (Convenio 169 OIT) y metodología de diálogo social.',
          historial: [
            { estado: 'amarillo', fecha: daysAgo(5, 10, 0), nota: 'Invitación a sesión virtual agendada' }
          ]
        }
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
      descripcion_corta: 'Articulación de programas de mejoramiento de vivienda comunitaria, planes de desarrollo barrial y reporte de huella social.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Filtro curricular aprobado por consultora externa de reclutamiento.',
          historial: [
            { estado: 'verde', fecha: daysAgo(14, 15, 40), nota: 'CV aprobado para lista corta' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'amarillo',
          modalidad: 'virtual',
          notas: 'Entrevista con el Jefe de Asuntos Corporativos y Comunidades Regional Centro.',
          historial: [
            { estado: 'amarillo', fecha: daysAgo(2, 11, 15), nota: 'Citación para panel evaluador la próxima semana' }
          ]
        }
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
      descripcion_corta: 'Diseño estratégico de programas educativos de Fundación Terpel y alianzas público-privadas en regiones no interconectadas.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Postulado por referencia interna. Revisión curricular directa por la Dirección de Sostenibilidad.',
          historial: [
            { estado: 'verde', fecha: daysAgo(24, 16, 0), nota: 'Hoja de vida entregada directamente a selección' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'verde',
          modalidad: 'virtual',
          notas: 'Entrevista profunda sobre experiencia en articulación distrital y alianzas interinstitucionales.',
          historial: [
            { estado: 'verde', fecha: daysAgo(13, 9, 30), nota: 'Excelente evaluación por parte del comité' }
          ]
        },
        {
          id: '3',
          tipo: 'triangulo',
          estado: 'amarillo',
          modalidad: 'virtual',
          notas: 'Propuesta de formulación de proyecto de alfabetización digital comunitaria en zonas rurales.',
          historial: [
            { estado: 'amarillo', fecha: daysAgo(4, 17, 0), nota: 'En redacción de la propuesta técnica y estimación de presupuesto' }
          ]
        }
      ]
    },
    {
      empresa: 'Alpina',
      puesto: 'Coordinadora de Valor Compartido y Abastecimiento Responsable',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.600.000',
      ubicacion: 'Sopó / Bogotá',
      plataforma: 'Portal Alpina',
      descripcion_corta: 'Programas de asociatividad con ganaderos campesinos de Cundinamarca y Boyacá, fomento de ganadería regenerativa y empoderamiento de mujeres rurales.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Registro en plataforma y test de valores culturales Alpina.',
          historial: [
            { estado: 'verde', fecha: daysAgo(18, 10, 0), nota: 'Match cultural aprobado con 98%' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'rojo',
          modalidad: 'presencial',
          notas: 'Entrevista en planta Sopó. El perfil buscado se inclinaba más hacia zootecnia/agronomía que gestión social psicosocial.',
          historial: [
            { estado: 'verde', fecha: daysAgo(10, 11, 0), nota: 'Entrevista realizada' },
            { estado: 'rojo', fecha: daysAgo(7, 16, 0), nota: 'Feedback respetuoso indicando preferencia por perfil de ciencias agrarias' }
          ]
        }
      ]
    },
    {
      empresa: 'Davivienda',
      puesto: 'Especialista en Sostenibilidad y Finanzas Verdes',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 8.300.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Monitoreo de riesgos climáticos y sociales en créditos comerciales y desarrollo de productos financieros con propósito social.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'CV postulado vía portal de talento Davivienda.',
          historial: [
            { estado: 'verde', fecha: daysAgo(15, 9, 15), nota: 'Inscripción confirmada' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'amarillo',
          modalidad: 'virtual',
          notas: 'Entrevista inicial con Líder de Selección Corporativa.',
          historial: [
            { estado: 'amarillo', fecha: daysAgo(3, 14, 0), nota: 'Reunión virtual confirmada para mañana a las 10:00 AM' }
          ]
        }
      ]
    },
    {
      empresa: 'ISA (Interconexión Eléctrica S.A.)',
      puesto: 'Profesional Senior de Gestión Social y Consulta Previa',
      modalidad: 'presencial',
      seniority: 'mid_senior',
      salario_expectativa: '$ 9.000.000',
      ubicacion: 'Medellín / Territorio Nacional',
      plataforma: 'Convocatoria Pública',
      descripcion_corta: 'Negociación y acuerdos comunitarios para servidumbres de líneas de transmisión de energía de alto voltaje.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Validación de títulos y certificaciones de posgrado.',
          historial: [
            { estado: 'verde', fecha: daysAgo(27, 8, 30), nota: 'Documentación completa radicada' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'verde',
          modalidad: 'virtual',
          notas: 'Evaluación técnica con la Gerencia de Sostenibilidad y Territorio.',
          historial: [
            { estado: 'verde', fecha: daysAgo(17, 10, 0), nota: 'Prueba de conocimiento de la jurisprudencia de consulta previa aprobada' }
          ]
        },
        {
          id: '3',
          tipo: 'triangulo',
          estado: 'amarillo',
          modalidad: 'virtual',
          notas: 'Estudio de caso sobre manejo de tensiones con comunidades afrodescendientes e indígenas en el Magdalena Medio.',
          historial: [
            { estado: 'amarillo', fecha: daysAgo(6, 15, 0), nota: 'En proceso de sustentación técnica ante panel evaluador' }
          ]
        }
      ]
    },
    {
      empresa: 'Seguros Sura',
      puesto: 'Consultora de Gestión Social y Riesgos Reputacionales',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.900.000',
      ubicacion: 'Bogotá, Colombia',
      plataforma: 'LinkedIn',
      descripcion_corta: 'Acompañamiento a clientes empresariales en la gestión de su entorno social y reducción de riesgos de continuidad operativa por conflictividad comunitaria.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Postulación recomendada por Alumni Sabana.',
          historial: [
            { estado: 'verde', fecha: daysAgo(16, 11, 0), nota: 'CV recibido por Talent Acquisition' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'verde',
          modalidad: 'virtual',
          notas: 'Entrevista de competencias con Psicóloga Senior de Selección.',
          historial: [
            { estado: 'verde', fecha: daysAgo(9, 14, 30), nota: 'Concepto psicolaboral muy positivo' }
          ]
        },
        {
          id: '3',
          tipo: 'triangulo',
          estado: 'verde',
          modalidad: 'virtual',
          notas: 'Simulación de asesoría estratégica a un cliente del sector minero-energético.',
          historial: [
            { estado: 'verde', fecha: daysAgo(4, 16, 0), nota: 'Caso simulado resuelto con alta empatía y rigor metodológico' }
          ]
        },
        {
          id: '4',
          tipo: 'estrella',
          estado: 'verde',
          modalidad: null,
          notas: 'Seleccionada para el cargo. Oferta económica en validación final.',
          historial: [
            { estado: 'verde', fecha: daysAgo(1, 12, 0), nota: 'Comunicación oficial de selección para el rol' }
          ]
        }
      ]
    },
    {
      empresa: 'Postobón',
      puesto: 'Líder de Proyectos de Sostenibilidad y Economía Circular',
      modalidad: 'hibrido',
      seniority: 'mid_senior',
      salario_expectativa: '$ 7.400.000',
      ubicacion: 'Bogotá / Cundinamarca',
      plataforma: 'Portal Postobón',
      descripcion_corta: 'Coordinación de los programas "Faro Postobón" y "Litros que Ayudan", relacionamiento con recicladores de oficio y alianzas comunitarias.',
      pipeline: [
        {
          id: '1',
          tipo: 'cuadrado',
          estado: 'verde',
          modalidad: null,
          notas: 'Filtro inicial de selección y verificación de antecedentes profesionales.',
          historial: [
            { estado: 'verde', fecha: daysAgo(11, 9, 0), nota: 'Verificación documental exitosa' }
          ]
        },
        {
          id: '2',
          tipo: 'circulo',
          estado: 'amarillo',
          modalidad: 'virtual',
          notas: 'Entrevista técnica con la Gerente de Sostenibilidad y Asuntos Corporativos.',
          historial: [
            { estado: 'amarillo', fecha: daysAgo(2, 15, 30), nota: 'Agendada para este viernes a las 3:00 PM' }
          ]
        }
      ]
    }
  ];

  for (const email of emails) {
    try {
      const { rows: [user] } = await query('SELECT id, correo FROM usuarios WHERE correo = $1', [email]);
      if (!user) {
        console.log(`[WARN] Usuario con correo ${email} no encontrado en tabla usuarios. Omitiendo.`);
        continue;
      }

    console.log(`\n======================================================`);
    console.log(`Actualizando Perfil y Procesos para: ${email} (${user.id})`);
    console.log(`======================================================`);

    // 1. Actualizar perfil del usuario
    await query(
      `UPDATE usuarios SET
        nombre = $1,
        titular = $2,
        resumen = $3,
        correo_personal = $4,
        telefono = $5,
        ubicacion = $6,
        links = $7::jsonb,
        experiencia = $8::jsonb,
        educacion_formal = $9::jsonb,
        formacion_no_formal = $10::jsonb,
        certificaciones = $11::jsonb,
        idiomas = $12::jsonb,
        habilidades_tecnicas = $13::jsonb,
        habilidades_blandas = $14::jsonb,
        referencias_laborales = $15::jsonb,
        referencias_personales = $16::jsonb,
        updated_at = NOW()
       WHERE id = $17`,
      [
        perfilData.nombre,
        perfilData.titular,
        perfilData.resumen,
        perfilData.correo_personal,
        perfilData.telefono,
        perfilData.ubicacion,
        JSON.stringify(perfilData.links),
        JSON.stringify(perfilData.experiencia),
        JSON.stringify(perfilData.educacion_formal),
        JSON.stringify(perfilData.formacion_no_formal),
        JSON.stringify(perfilData.certificaciones),
        JSON.stringify(perfilData.idiomas),
        JSON.stringify(perfilData.habilidades_tecnicas),
        JSON.stringify(perfilData.habilidades_blandas),
        JSON.stringify(perfilData.referencias_laborales),
        JSON.stringify(perfilData.referencias_personales),
        user.id
      ]
    );
    console.log(`[OK] Perfil actualizado exitosamente con logros académicos y todos los campos para ${email}.`);

    // 2. Limpiar procesos antiguos de esta cuenta para repoblarlos limpiamente
    await query('DELETE FROM applications WHERE usuario_id = $1', [user.id]);
    console.log(`[OK] Procesos de selección antiguos limpiados.`);

    // 3. Insertar los nuevos 12 procesos con pipeline detallado, fechas y notas
    for (const proc of procesos) {
      const { rows: [createdApp] } = await query(
        `INSERT INTO applications (
          usuario_id,
          empresa,
          puesto,
          plataforma,
          descripcion_corta,
          salario_expectativa,
          ubicacion,
          modalidad,
          pipeline,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $10)
        RETURNING id, empresa, puesto`,
        [
          user.id,
          proc.empresa,
          proc.puesto,
          proc.plataforma,
          proc.descripcion_corta,
          proc.salario_expectativa,
          proc.ubicacion,
          proc.modalidad,
          JSON.stringify(proc.pipeline),
          proc.pipeline[0]?.historial[0]?.fecha || daysAgo(15)
        ]
      );
      console.log(`  + Creado proceso: ${createdApp.puesto} en ${createdApp.empresa} (${proc.pipeline.length} fases con notas y fechas)`);
    }

    console.log(`[EXITO] ${procesos.length} procesos de selección creados para ${email}`);
    } catch (err) {
      console.error(`[ERROR] en ${email}:`, err);
    }
  }

  console.log('\n[FINALIZADO] Todas las cuentas de ejemplo quedaron perfectamente pobladas.');
}

populateExampleAccount().catch(err => console.error('FATAL:', err)).finally(() => process.exit(0));
