import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db/index.js'
import { chatCompletion } from '../llm/client.js'

const router = Router()

/**
 * POST /api/coach/chat
 * Recibe un historial de chat y responde utilizando Claude LLM enriquecido
 * con todos los datos contextuales del usuario (perfil, procesos, anuncios, documentos).
 */
router.post('/chat', requireAuth, async (req, res) => {
  const { messages = [] } = req.body

  try {
    // 1. Cargar perfil del usuario
    const { rows: [profile] } = await query(
      `SELECT nombre, resumen, habilidades_tecnicas, experiencia, educacion_formal 
       FROM usuarios WHERE id = $1`,
      [req.user.id]
    )

    // 2. Cargar todos sus procesos activos/históricos
    const { rows: applications } = await query(
      `SELECT id, empresa, puesto, plataforma, modalidad, seniority, salario_expectativa, 
              postulantes, pipeline, created_at
       FROM applications 
       WHERE usuario_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    // 3. Cargar todos los anuncios e inventario en su historial
    const { rows: jobResults } = await query(
      `SELECT r.empresa, r.puesto, r.plataforma, r.modalidad, r.ubicacion, r.compatibilidad, r.postulantes
       FROM job_search_results r
       JOIN job_searches s ON r.search_id = s.id
       WHERE s.usuario_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    )

    // 4. Cargar documentos generados
    const { rows: documents } = await query(
      `SELECT tipo, nombre_archivo, created_at 
       FROM documents 
       WHERE usuario_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    // 5. Estructurar el contexto para el System Prompt del Coach Laboral
    const userContextText = `
INFORMACIÓN CONTEXTUAL DEL CANDIDATO:
- Nombre: ${profile?.nombre || 'Candidato'}
- Resumen Profesional: ${profile?.resumen || 'No especificado'}
- Habilidades Técnicas: ${JSON.stringify(profile?.habilidades_tecnicas || [])}
- Experiencia Laboral: ${JSON.stringify(profile?.experiencia || [])}
- Educación Formal: ${JSON.stringify(profile?.educacion_formal || [])}

PROCESOS DE POSTULACIÓN ACTIVOS/HISTÓRICOS (Total: ${applications.length}):
${applications.map((app, i) => `
Proceso ${i + 1}:
  * Empresa: ${app.empresa}
  * Cargo: ${app.puesto}
  * Modalidad: ${app.modalidad || '—'}
  * Nivel: ${app.seniority || '—'}
  * Salario de expectativa: ${app.salario_expectativa || '—'}
  * Postulantes: ${app.postulantes || '—'}
  * Estado / Pipeline: ${JSON.stringify(app.pipeline || [])}
`).join('\n')}

INVENTARIO DE ANUNCIOS DE EMPLEO ENCONTRADOS (Total: ${jobResults.length}):
${jobResults.slice(0, 15).map((job, i) => `
Anuncio ${i + 1}:
  * Empresa: ${job.empresa}
  * Cargo: ${job.puesto}
  * Modalidad: ${job.modalidad || '—'}
  * Afinidad / Scoring: ${job.compatibilidad}%
  * Postulantes: ${job.postulantes || '—'}
`).join('\n')}

DOCUMENTOS (.DOCX) GENERADOS HASTA LA FECHA (Total: ${documents.length}):
${documents.map((doc, i) => `
Documento ${i + 1}:
  * Tipo: ${doc.tipo}
  * Nombre de archivo: ${doc.nombre_archivo}
  * Fecha de generación: ${new Date(doc.created_at).toLocaleDateString('es-CO')}
`).join('\n')}
`

    const systemPrompt = `
Actúa como un Coach Laboral altamente capacitado de la Dirección de Alumni de la Universidad de La Sabana y el GovLab.
Tu rol es acompañar al candidato en su búsqueda de empleo, prepararlo para entrevistas técnicas/comportamentales, darle recomendaciones estratégicas basadas en el estado real de sus procesos de postulación, su compatibilidad con los anuncios de vacantes encontrados y los documentos que ha generado.

Directrices de interacción:
1. Sé extremadamente profesional, empático, motivador y práctico en tus respuestas.
2. Utiliza el contexto brindado sobre sus habilidades, experiencia, procesos actuales y documentos generados para dar respuestas personalizadas.
3. Si te pregunta sobre cómo prepararse para una entrevista específica (ej. la de Nutresa o Bavaria), analiza sus fases en el pipeline para orientarlo (ej: "Veo que en tu proceso de Nutresa ya pasaste la entrevista técnica y vas a la entrevista con Vicepresidencia presencial...").
4. Si ves que tiene procesos fracasados o rechazados, aliéntalo a seguir adelante analizando qué pudo salir mal o sugiriendo que revise otros anuncios del inventario con alta afinidad.
5. Mantén tus respuestas enfocadas en el ámbito laboral y de empleabilidad sabanera.
6. Nunca menciones que eres una IA o un LLM, sino el Coach de Alumni Sabana.
7. Si el usuario te saluda o es el inicio de la conversación, dale una bienvenida calurosa mencionando el estado general de su búsqueda (ej: "Tienes X procesos en total: Y en curso, Z seleccionados y W finalizados...").
8. NUNCA uses emojis en ninguna parte de tus respuestas. Tu comunicación es siempre escrita, formal y ejecutiva.
9. Para respuestas extensas o estructuradas, usa encabezados Markdown (## Título) para organizar las secciones claramente.

${userContextText}
`

    // Limpiamos o mapeamos el historial recibido del cliente para asegurarnos que cumple con el esquema de Anthropic API
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))

    // 6. Invocar al LLM
    const reply = await chatCompletion(systemPrompt, formattedMessages)

    res.json({ reply })
  } catch (err) {
    console.error('Error en POST /api/coach/chat:', err.message)
    res.status(500).json({ error: 'Error al procesar la respuesta del Coach Laboral: ' + err.message })
  }
})

export default router
