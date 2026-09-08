import { completeJson, MODEL_FRONTIER } from './client.js'

const PROMPT_TEMPLATE = (cvText) => `Eres un extractor experto de perfiles profesionales para el Perfil Maestro de Carrera (Master Career Profile).
Tu misión es procesar el siguiente currículum vitae (que puede estar en ESPAÑOL, INGLÉS o cualquier idioma, con diseño de doble columna o secciones complejas) y extraer TODO su contenido de forma exhaustiva, estructurada y sin pérdidas.

REGLA DE ORO DE EXTRACCIÓN:
PROHIBIDO CONDENSAR O RESUMIR: No sintetices las viñetas ni recortes logros. Si una experiencia tiene 5 logros con métricas, herramientas y proyectos, extrae cada uno de ellos de manera completa e íntegra. El Perfil Maestro debe contener la totalidad de los datos del candidato.

Devuelve ÚNICAMENTE un objeto JSON válido (sin formato markdown adicional) con este esquema exacto:

{
  "titular": "Título profesional o área de especialidad (ej. Psicóloga Especialista en ESG, Ingeniero de Datos, etc.) o null",
  "telefono": "Teléfono de contacto con indicativo si aparece, o null",
  "correo_personal": "Correo electrónico personal si aparece en el encabezado, o null",
  "ubicacion": "Ciudad, País de residencia o null",
  "links": [
    {
      "red": "LinkedIn" | "Portafolio" | "GitHub" | "otro",
      "url": "https://..."
    }
  ],
  "resumen": "Resumen o perfil profesional completo del candidato (conservando tono y amplitud original)",
  "experiencia": [
    {
      "empresa": "Nombre de la empresa o entidad",
      "cargo": "Cargo o título del puesto",
      "ubicacion": "Ciudad, País o null si no se especifica",
      "desde": "YYYY-MM o YYYY",
      "hasta": "YYYY-MM o YYYY o null si es el empleo actual",
      "es_actual": true o false,
      "modalidad": "presencial" | "hibrido" | "virtual" | null,
      "intensidad": "tiempo_completo" | "medio_tiempo" | "freelance" | "fines_de_semana" | "por_proyecto" | "por_horas" | "otro" | null,
      "tipo_contrato": "practicas" | "prestacion_servicios" | "libre_nombramiento" | "carrera_administrativa" | "termino_fijo" | "termino_indefinido" | "obra_labor" | "otro" | null,
      "descripcion": "Descripción detallada completa y viñetas de logros, responsabilidades y proyectos (conservando métricas, porcentajes, herramientas y contexto original)"
    }
  ],
  "educacion_formal": [
    {
      "nivel": "post_doctorado" | "doctorado" | "maestria" | "especializacion" | "pregrado" | "tecnologo" | "tecnico" | "bachillerato" | "otro",
      "titulo": "Nombre oficial del título obtenido o carrera",
      "institucion": "Universidad o institución educativa oficial",
      "desde": "YYYY o null",
      "hasta": "YYYY o null si está en curso",
      "estado": "graduado" | "en_curso" | "aplazado" | "incompleto"
    }
  ],
  "formacion_no_formal": [
    {
      "tipo": "minor" | "diplomado" | "curso" | "taller" | "bootcamp" | "otro",
      "nombre": "Nombre del curso, diplomado, minor o taller",
      "institucion": "Plataforma o entidad educativa (Coursera, UniSabana, Platzi, etc.)",
      "intensidad_horas": "Número de horas o duración si se menciona, o null",
      "fecha": "YYYY-MM o YYYY o null"
    }
  ],
  "certificaciones": [
    {
      "nombre": "Nombre oficial de la certificación o licencia",
      "entidad_emisora": "Entidad acreditadora (ej. Scrum Alliance, AWS, PMI, Google)",
      "id_credencial": "Código, ID o número de licencia si existe, o null",
      "url_credencial": "URL de verificación si existe, o null",
      "fecha_emision": "YYYY-MM o YYYY o null",
      "fecha_vencimiento": "YYYY-MM o YYYY o null",
      "no_vence": true o false
    }
  ],
  "idiomas": [
    {
      "idioma": "Nombre del idioma en español (ej. Español, Inglés, Francés, Alemán)",
      "nivel": "nativo" | "avanzado" | "intermedio" | "básico",
      "nivel_mcer": "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Nativo"
    }
  ],
  "habilidades_tecnicas": [
    {
      "categoria": "software" | "tecnologia_datos" | "metodologias" | "conocimientos_dominio",
      "nombre": "Nombre de la herramienta, lenguaje, metodología o conocimiento técnico",
      "nivel": "básico" | "intermedio" | "avanzado" | null
    }
  ],
  "habilidades_blandas": [
    "string (ej. Liderazgo, Comunicación asertiva, Negociación, Pensamiento crítico)"
  ]
}

Reglas específicas de clasificación:
1. CATEGORÍAS DE HABILIDADES TÉCNICAS ("categoria"):
   - "software": Herramientas ofimáticas, ERP, CRM, diseño y software empresarial (Excel, SAP, Jira, Salesforce, Power BI, Figma).
   - "tecnologia_datos": Lenguajes de programación, librerías, bases de datos y DevOps (Python, SQL, React, Node.js, AWS, Docker).
   - "metodologias": Metodologías y marcos de trabajo (Scrum, Agile, PMI, Lean Six Sigma, OKRs, Design Thinking).
   - "conocimientos_dominio": Especialidades conceptuales o sectoriales (Finanzas corporativas, Regulación financiera, Derecho laboral, Supply Chain).
2. EDUCACIÓN FORMAL vs. NO FORMAL:
   - "educacion_formal": Grados académicos reconocidos por ministerios de educación (Pregrado, Especialización, Maestría, Doctorado, Tecnólogo, Técnico laboral/profesional, Bachillerato).
   - "formacion_no_formal": Cursos cortos, diplomados universitarios, minors, talleres, bootcamps de desarrollo.
3. JORNADA Y CONTRATO:
   - Si en el texto se indica "Full-time" o "Tiempo completo" -> intensidad = "tiempo_completo".
   - Si indica "Part-time" o "Medio tiempo" -> intensidad = "medio_tiempo".
   - Si indica "Freelance", "Independent Contractor" o "Prestación de servicios" -> asigna los valores correspondientes.
   - Si no se especifica en el texto, devuelve null (el usuario podrá completarlo en el formulario interactivo).
4. FECHAS:
   - Normaliza meses en números ("Feb 2022" -> "2022-02"). Si el empleo es actual ("Present", "Current", "Actual"), "hasta" DEBE ser null y "es_actual" true.

---
CONTENIDO DEL CV:
${cvText}`

/**
 * Extrae exhaustivamente todos los campos estructurados del Perfil Maestro a partir del texto de un CV.
 * @param {string} cvText
 * @returns {Promise<object>} — objeto compatible con las columnas jsonb del Perfil Maestro
 */
export async function parseCvText(cvText) {
  return completeJson(PROMPT_TEMPLATE(cvText), { maxTokens: 4096, model: MODEL_FRONTIER })
}
