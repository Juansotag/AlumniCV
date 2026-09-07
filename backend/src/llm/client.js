import OpenAI from 'openai'

// Modelos según complejidad
export const MODEL_FRONTIER = process.env.OPENAI_MODEL_FRONTIER || 'gpt-4o'      // Assessment profundo, adaptación de documentos .docx, Coach laboral
export const MODEL_FAST = process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini'        // Extracción estructurada de CV, tareas rápidas y económicas

const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)
const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)

if (!hasOpenAI) {
  console.warn('[AVISO] OPENAI_API_KEY no definida en .env — por favor configúrala para habilitar los modelos de OpenAI.')
}

export const openai = hasOpenAI
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

/**
 * Ejecuta una llamada asíncrona con reintento automático y retroceso exponencial (Backoff).
 * Protege la aplicación contra Rate Limits (429) y caídas temporales de red/servidor (500/503).
 */
async function withRetry(fn, { maxRetries = 3, baseDelayMs = 1000 } = {}) {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      const status = err?.status || err?.statusCode || (err?.response && err.response.status)
      const isRetryable = status === 429 || (status >= 500 && status <= 504) || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT'

      if (attempt > maxRetries || !isRetryable) {
        throw err
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200)
      console.warn(`[OpenAI QA Retry] Error ${status || err.code}. Reintentando intento ${attempt}/${maxRetries} en ${delay}ms...`)
      await new Promise(res => setTimeout(res, delay))
    }
  }
}

/**
 * Llama a OpenAI pidiendo una respuesta en JSON puro y la parsea.
 * Utiliza response_format: { type: 'json_object' } para garantizar JSON válido.
 * Incluye reintento automático ante Rate Limits (429) y validación de respuesta.
 *
 * @param {string} prompt
 * @param {{ maxTokens?: number, model?: string }} options
 */
export async function completeJson(prompt, { maxTokens = 4096, model = MODEL_FRONTIER } = {}) {
  if (openai) {
    const rawText = await withRetry(async () => {
      const response = await openai.chat.completions.create({
        model,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      })
      return response.choices?.[0]?.message?.content ?? ''
    })

    if (!rawText || !rawText.trim()) {
      throw new Error('El modelo de IA devolvió una respuesta vacía')
    }

    try {
      return JSON.parse(rawText)
    } catch (parseErr) {
      // Fallback por si vinieran fences markdown
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
      throw new Error(`Error al procesar JSON de OpenAI: ${parseErr.message}`)
    }
  }

  // Fallback secundario a Anthropic si existiera la key
  if (process.env.ANTHROPIC_API_KEY) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    
    const rawText = await withRetry(async () => {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })
      return message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim()
    })

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude no devolvió un JSON válido: ' + rawText.slice(0, 200))

    return JSON.parse(jsonMatch[0])
  }

  throw new Error('OPENAI_API_KEY no está configurada en .env')
}

/**
 * Llama al LLM para flujos de chat conversacional (Coach Laboral).
 * Utiliza el modelo de frontera con reintento automático.
 *
 * @param {string} systemPrompt
 * @param {{ role: string, content: string }[]} messages
 * @param {{ model?: string }} options
 */
export async function chatCompletion(systemPrompt, messages, { model = MODEL_FRONTIER } = {}) {
  if (openai) {
    return await withRetry(async () => {
      const response = await openai.chat.completions.create({
        model,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      })
      return response.choices?.[0]?.message?.content ?? ''
    })
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    
    return await withRetry(async () => {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages
      })
      return response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
    })
  }

  throw new Error('OPENAI_API_KEY no está configurada en .env')
}
