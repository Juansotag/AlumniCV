import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, Building2, AlertCircle, MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', correo: '', password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmPending, setConfirmPending] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (!form.correo.endsWith('@unisabana.edu.co')) {
      setError('Solo se permiten correos del dominio @unisabana.edu.co')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { data, error: sbError } = await supabase.auth.signUp({
      email: form.correo,
      password: form.password,
      options: {
        data: { nombre: form.nombre, full_name: form.nombre },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })
    setLoading(false)

    if (sbError) { setError(sbError.message); return }

    if (data.session) {
      navigate('/onboarding')
    } else {
      setConfirmPending(true)
    }
  }

  if (confirmPending) {
    return (
      <div className="auth-panel-form" style={{ minHeight: '100vh' }}>
        <div className="auth-form-box" style={{ textAlign: 'center', alignItems: 'center' }}>
          <MailCheck size={40} color="var(--c-blue-dark)" />
          <div className="auth-form-header">
            <h1>Revisa tu correo</h1>
            <p>Enviamos un enlace de confirmación a <strong>{form.correo}</strong>. Haz clic en el enlace y luego inicia sesión.</p>
          </div>
          <button className="btn-auth-submit" onClick={() => navigate('/login')}>Ir a iniciar sesión</button>
        </div>
      </div>
    )
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
            <h1>Crea tu cuenta</h1>
            <p>Herramienta de Alumni — Universidad de La Sabana.</p>
          </div>

          <div className="auth-domain-note">
            <Building2 size={15} />
            <span>Acceso restringido a correos <strong>@unisabana.edu.co</strong></span>
          </div>

          <form className="auth-form-card" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="reg-nombre">Nombre completo</label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={16} /></span>
                <input id="reg-nombre" name="nombre" type="text" placeholder="Tu nombre completo"
                  value={form.nombre} onChange={handleChange} required autoComplete="name" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-correo">Correo institucional</label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={16} /></span>
                <input id="reg-correo" name="correo" type="email" placeholder="usuario@unisabana.edu.co"
                  value={form.correo} onChange={handleChange} required autoComplete="email" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Contraseña</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={16} /></span>
                <input id="reg-password" name="password" type="password" placeholder="Mínimo 8 caracteres"
                  value={form.password} onChange={handleChange} required autoComplete="new-password" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirmar">Confirmar contraseña</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={16} /></span>
                <input id="reg-confirmar" name="confirmar" type="password" placeholder="Repite tu contraseña"
                  value={form.confirmar} onChange={handleChange} required autoComplete="new-password" />
              </div>
            </div>

            {error && (
              <p role="alert" style={{ color: 'var(--c-red)', fontSize: 'var(--fs-sm)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={15} /> {error}
              </p>
            )}

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="auth-switch">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        </div>
      </div>
    </div>
  )
}
