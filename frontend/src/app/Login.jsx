import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ correo: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (!form.correo.endsWith('@unisabana.edu.co')) {
      setError('Solo se permiten correos del dominio @unisabana.edu.co')
      return
    }

    setLoading(true)
    const { error: sbError } = await supabase.auth.signInWithPassword({
      email: form.correo,
      password: form.password,
    })
    setLoading(false)

    if (sbError) {
      if (sbError.message.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos')
      } else if (sbError.message.includes('Email not confirmed')) {
        setError('Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.')
      } else {
        setError(sbError.message)
      }
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="auth-container">
      <div className="auth-panel-brand" aria-hidden="true">
        <div style={{ marginBottom: '1.5rem' }}>
          <img src="/branding/GovLab_blanco.png" alt="GovLab Universidad de La Sabana" style={{ height: 42 }} />
        </div>
        <h1 className="auth-brand-title">AlumniCV</h1>
        <p className="auth-brand-desc">
          Herramienta institucional del GovLab y la Dirección de Alumni para la Universidad de La Sabana. Construye tu CV, analízalo con IA y gestiona tus postulaciones laborales.
        </p>
      </div>

      <div className="auth-panel-form">
        <div className="auth-form-box">
          <div className="auth-form-header">
            <h1>Bienvenido de nuevo</h1>
            <p>Ingresa con tu correo institucional para continuar.</p>
          </div>

          <form className="auth-form-card" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-correo">Correo institucional</label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={16} /></span>
                <input id="login-correo" name="correo" type="email" placeholder="usuario@unisabana.edu.co"
                  value={form.correo} onChange={handleChange} required autoComplete="email" autoFocus />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Contraseña</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={16} /></span>
                <input id="login-password" name="password" type="password" placeholder="Tu contraseña"
                  value={form.password} onChange={handleChange} required autoComplete="current-password" />
              </div>
            </div>

            {error && (
              <p role="alert" style={{ color: 'var(--c-red)', fontSize: 'var(--fs-sm)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={15} /> {error}
              </p>
            )}

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="auth-switch">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
        </div>
      </div>
    </div>
  )
}
