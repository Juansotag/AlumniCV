import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// Modelos según complejidad
export const MODEL_FRONTIER = process.env.OPENAI_MODEL_FRONTIER || 'gpt-4o'      // Assessment profundo, adaptación de documentos .docx, Coach laboral
export const MODEL_FAST = process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini'        // Extracción estructurada de CV, tareas rápidas y económicas

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

export function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) return null
  return new Anthropic({ apiKey: key })
}

export const openai = getOpenAI()
export const anthropic = getAnthropic()

if (!openai && !anthropic) {
  console.warn('[AVISO] Ni OPENAI_API_KEY ni ANTHROPIC_API_KEY están definidas en las variables de entorno.')
}

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
      console.warn(`[AI QA Retry] Error ${status || err.code}. Reintentando intento ${attempt}/${maxRetries} en ${delay}ms...`)
      await new Promise(res => setTimeout(res, delay))
    }
  }
}

/**
 * Llama al LLM pidiendo una respuesta en JSON puro y la parsea.
 * Utiliza response_format: { type: 'json_object' } en OpenAI para garantizar JSON válido.
 * Incluye reintento automático ante Rate Limits (429) y validación de respuesta.
 *
 * @param {string} prompt
 * @param {{ maxTokens?: number, model?: string }} options
 */
export async function completeJson(prompt, { maxTokens = 4096, model = MODEL_FRONTIER } = {}) {
  const openAiClient = getOpenAI()

  if (openAiClient) {
    try {
      const rawText = await withRetry(async () => {
        const response = await openAiClient.chat.completions.create({
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
        const match = rawText.match(/\{[\s\S]*\}/)
        if (match) return JSON.parse(match[0])
        throw new Error(`Error al procesar JSON de OpenAI: ${parseErr.message}`)
      }
    } catch (openAiErr) {
      const anthropicClient = getAnthropic()
      if (!anthropicClient) throw openAiErr
      console.warn('[Fallback IA] OpenAI falló, recurriendo a Anthropic Claude...', openAiErr.message)
    }
  }

  // Fallback secundario a Anthropic si existiera la key
  const anthropicClient = getAnthropic()
  if (anthropicClient) {
    const rawText = await withRetry(async () => {
      const message = await anthropicClient.messages.create({
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

  throw new Error('No hay proveedor de IA configurado. Por favor define OPENAI_API_KEY o ANTHROPIC_API_KEY en las variables de entorno.')
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
  const openAiClient = getOpenAI()

  if (openAiClient) {
    try {
      return await withRetry(async () => {
        const response = await openAiClient.chat.completions.create({
          model,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
        })
        return response.choices?.[0]?.message?.content ?? ''
      })
    } catch (openAiErr) {
      const anthropicClient = getAnthropic()
      if (!anthropicClient) throw openAiErr
      console.warn('[Fallback IA] OpenAI chat falló, recurriendo a Anthropic Claude...', openAiErr.message)
    }
  }

  const anthropicClient = getAnthropic()
  if (anthropicClient) {
    return await withRetry(async () => {
      const response = await anthropicClient.messages.create({
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

  throw new Error('No hay proveedor de IA configurado. Por favor define OPENAI_API_KEY o ANTHROPIC_API_KEY en las variables de entorno.')
}
