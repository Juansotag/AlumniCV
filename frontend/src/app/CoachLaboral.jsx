import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api.js'

export default function CoachLaboral() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('Candidato')
  const messagesEndRef = useRef(null)

  // Carga del perfil del usuario para personalizar el saludo
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiFetch('/profile')
        if (data.profile?.usuario?.nombre) {
          const first = data.profile.usuario.nombre.split(' ')[0]
          setUserName(first)
        }
      } catch (err) {
        console.error('Error al obtener perfil:', err)
      }
    }
    fetchProfile()
  }, [])

  // Inicialización o carga de mensajes desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('alumnicv_coach_messages')
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
        return
      } catch (e) {
        console.error('Error al parsear mensajes de localStorage:', e)
      }
    }

    const initChat = async () => {
      try {
        const data = await apiFetch('/applications')
        const apps = data.applications || []
        
        const seleccionados = apps.filter(a => 
          a.pipeline?.some(n => n.tipo === 'estrella' && n.estado === 'verde')
        ).length
        const fracasados = apps.filter(a => 
          a.pipeline?.some(n => n.estado === 'cancelado' || n.estado === 'rojo')
        ).length
        const enCurso = apps.length - seleccionados - fracasados

        const welcomeText = `¡Hola, ${userName}! Soy tu Coach Laboral de la Dirección de Alumni de la Universidad de La Sabana. 

Estoy aquí para ayudarte a prepararte para tus entrevistas, mejorar tu CV, analizar ofertas de empleo o trazar la mejor estrategia para tus postulaciones.

Actualmente en tu inventario veo que tienes **${apps.length} procesos registrados**:
* **${enCurso}** en curso 
* **${seleccionados}** ofertas seleccionadas con éxito
* **${fracasados}** procesos finalizados o pausados

¿De cuál de tus procesos de selección te gustaría hablar hoy, o en qué te puedo ayudar?`

        const initialMsgs = [{ role: 'assistant', content: welcomeText }]
        setMessages(initialMsgs)
        localStorage.setItem('alumnicv_coach_messages', JSON.stringify(initialMsgs))
      } catch (err) {
        const fallbackMsgs = [{ role: 'assistant', content: `¡Hola, ${userName}! Soy tu Coach Laboral de Alumni Sabana. ¿En qué te puedo asesorar hoy con tus búsquedas de empleo y entrevistas?` }]
        setMessages(fallbackMsgs)
        localStorage.setItem('alumnicv_coach_messages', JSON.stringify(fallbackMsgs))
      }
    }
    
    if (userName !== 'Candidato') {
      initChat()
    }
  }, [userName])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    localStorage.setItem('alumnicv_coach_messages', JSON.stringify(newMessages))
    setInput('')
    setLoading(true)

    try {
      const data = await apiFetch('/coach/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: newMessages
        })
      })

      const finalMessages = [...newMessages, { role: 'assistant', content: data.reply }]
      setMessages(finalMessages)
      localStorage.setItem('alumnicv_coach_messages', JSON.stringify(finalMessages))
    } catch (err) {
      console.error(err)
      const errMessages = [...newMessages, { role: 'assistant', content: 'Lo siento, en este momento tengo dificultades para conectarme. Por favor, intenta de nuevo en unos instantes.' }]
      setMessages(errMessages)
      localStorage.setItem('alumnicv_coach_messages', JSON.stringify(errMessages))
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    if (!window.confirm('¿Deseas reiniciar la conversación con tu coach?')) return
    localStorage.removeItem('alumnicv_coach_messages')
    
    // Forzamos la re-inicialización del chat simulando un cambio sutil
    const resetWelcome = `Hola de nuevo, ${userName}. He reiniciado nuestro historial de conversación. ¿En qué te puedo ayudar o asesorar hoy en tu búsqueda de empleo?`
    const resetMsgs = [{ role: 'assistant', content: resetWelcome }]
    setMessages(resetMsgs)
    localStorage.setItem('alumnicv_coach_messages', JSON.stringify(resetMsgs))
  }

  // Parseador de Markdown minimalista nativo
  const renderMarkdown = (text) => {
    if (!text) return ''
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      let trimmed = line.trim()

      // Heading ## (h2 — banner secundario)
      if (trimmed.startsWith('## ')) {
        const headingText = trimmed.substring(3)
        return (
          <div key={idx} style={{
            fontFamily: '\'Publico Banner\', \'Georgia\', serif',
            fontWeight: 800,
            fontSize: '1rem',
            color: 'var(--c-blue-dark)',
            borderBottom: '2px solid var(--c-blue-dark)',
            paddingBottom: '3px',
            margin: '0.9rem 0 0.4rem 0',
            letterSpacing: '0.01em'
          }}>
            {headingText}
          </div>
        )
      }

      // Heading # (h1 — banner principal)
      if (trimmed.startsWith('# ')) {
        const headingText = trimmed.substring(2)
        return (
          <div key={idx} style={{
            fontFamily: '\'Publico Banner\', \'Georgia\', serif',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'var(--c-blue-dark)',
            borderBottom: '2px solid var(--c-blue-dark)',
            paddingBottom: '4px',
            margin: '1rem 0 0.5rem 0',
            letterSpacing: '0.01em'
          }}>
            {headingText}
          </div>
        )
      }

      // Viñetas * o -
      let isBullet = false
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        isBullet = true
        trimmed = trimmed.substring(2)
      }

      // Parsear negritas **texto**
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g)
      const content = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>
        }
        return part
      })

      if (isBullet) {
        return (
          <li key={idx} style={{ marginLeft: '1.2rem', listStyleType: 'disc', margin: '3px 0' }}>
            {content}
          </li>
        )
      }

      return (
        <p key={idx} style={{ margin: '0 0 0.4rem 0', minHeight: trimmed === '' ? '0.4rem' : 'auto' }}>
          {content}
        </p>
      )
    })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '1rem' }}>
      
      {/* Encabezado con Botón de Reiniciar */}
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--c-blue-dark)' }}>Coach Laboral</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 'var(--fs-sm)' }}>
            Tu tutor personalizado de empleabilidad con acceso completo a tus procesos, documentos y vacantes.
          </p>
        </div>
        <button
          onClick={handleClearChat}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.35rem 0.75rem',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
        >
          Reiniciar chat
        </button>
      </div>

      {/* Caja del Chat */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: '#fff' }}>
        
        {/* Historial de Mensajes */}
        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
          {messages.map((m, i) => {
            const isAssistant = m.role === 'assistant'
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: isAssistant ? 'flex-start' : 'flex-end',
                  width: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    borderTopLeftRadius: isAssistant ? '2px' : '12px',
                    borderTopRightRadius: isAssistant ? '12px' : '2px',
                    background: isAssistant ? '#ffffff' : 'var(--c-blue-dark)',
                    color: isAssistant ? 'var(--text-primary)' : '#ffffff',
                    border: isAssistant ? '1px solid var(--border-color)' : 'none',
                    boxShadow: isAssistant ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    fontSize: 'var(--fs-sm)',
                    lineHeight: 1.5
                  }}
                >
                  {isAssistant && (
                    <div style={{ fontSize: '10px', color: 'var(--c-blue-dark)', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Coach Alumni Sabana
                    </div>
                  )}
                  {renderMarkdown(m.content)}
                </div>
              </div>
            )
          })}

          {/* Animación de Carga (Coach escribiendo) */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  borderTopLeftRadius: '2px',
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--c-blue-dark)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '6px' }}>
                  Pensando
                </span>
                <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--c-blue-dark)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out' }} />
                <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--c-blue-dark)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--c-blue-dark)', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', padding: '0.75rem 1rem', background: '#ffffff', borderTop: '1px solid var(--border-color)', gap: '0.75rem', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Hazle una pregunta a tu coach (ej: ¿cómo me preparo para la entrevista técnica de Claro?)"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-color)',
              fontSize: 'var(--fs-sm)',
              outline: 'none',
              background: '#f8fafc'
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-auth-submit"
            style={{
              padding: '0.65rem 1.5rem',
              fontSize: 'var(--fs-sm)',
              fontWeight: 700,
              cursor: loading || !input.trim() ? 'default' : 'pointer'
            }}
          >
            Preguntar
          </button>
        </form>

      </div>

      {/* Keyframe animation in inline style tag */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>

    </div>
  )
}
