import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  UploadCloud,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Sparkles,
  Award,
  FileText,
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import Header from '../components/Header.jsx'
import AssessmentResult from '../components/AssessmentResult.jsx'

export default function Profile() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('experiencia')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  // Estado del Perfil Maestro
  const [nombre, setNombre] = useState('')
  const [resumen, setResumen] = useState('')
  const [experiencia, setExperiencia] = useState([])
  const [educacionFormal, setEducacionFormal] = useState([])
  const [formacionNoFormal, setFormacionNoFormal] = useState([])
  const [certificaciones, setCertificaciones] = useState([])
  const [idiomas, setIdiomas] = useState([])
  const [habilidadesTecnicas, setHabilidadesTecnicas] = useState([])
  const [habilidadesBlandas, setHabilidadesBlandas] = useState([])

  // Inputs para agregar habilidades rápidamente
  const [newSkillText, setNewSkillText] = useState({
    software: '',
    tecnologia_datos: '',
    metodologias: '',
    conocimientos_dominio: '',
    blandas: ''
  })
  const [newIdioma, setNewIdioma] = useState({ idioma: '', nivel_mcer: 'B2' })

  // Cargar datos del perfil al montar o actualizar
  useEffect(() => {
    if (profile?.usuario) {
      const u = profile.usuario
      setNombre(u.nombre || '')
      setResumen(u.resumen || '')
      setExperiencia(Array.isArray(u.experiencia) ? u.experiencia : [])
      setEducacionFormal(Array.isArray(u.educacion_formal) ? u.educacion_formal : [])
      setFormacionNoFormal(Array.isArray(u.formacion_no_formal) ? u.formacion_no_formal : [])
      setCertificaciones(Array.isArray(u.certificaciones) ? u.certificaciones : [])
      setIdiomas(Array.isArray(u.idiomas) ? u.idiomas : [])

      const rawTech = Array.isArray(u.habilidades_tecnicas) ? u.habilidades_tecnicas : []
      const normalizedTech = rawTech.map(h => {
        if (typeof h === 'string') return { categoria: 'software', nombre: h, nivel: 'avanzado' }
        if (h && typeof h === 'object') {
          return {
            categoria: h.categoria || 'software',
            nombre: h.nombre || h.habilidad || '',
            nivel: h.nivel || 'avanzado'
          }
        }
        return null
      }).filter(h => h && h.nombre)

      const rawSoft = Array.isArray(u.habilidades_blandas) ? u.habilidades_blandas : []
      const normalizedSoft = rawSoft.map(b => typeof b === 'string' ? b : (b?.nombre || '')).filter(Boolean)

      setHabilidadesTecnicas(normalizedTech)
      setHabilidadesBlandas(normalizedSoft)
    }
  }, [profile])

  // Guardar cambios en el Perfil Maestro
  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setError('')
      setSaveSuccess(false)

      await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          nombre,
          resumen,
          experiencia,
          educacion_formal: educacionFormal,
          formacion_no_formal: formacionNoFormal,
          certificaciones,
          idiomas,
          habilidades_tecnicas: habilidadesTecnicas,
          habilidades_blandas: habilidadesBlandas
        })
      })

      setSaveSuccess(true)
      await refreshProfile()
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err) {
      setError('Error al guardar el perfil: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Manejo de subida de CV PDF
  const handleReuploadClick = () => {
    if (!uploading) fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || uploading) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor selecciona un archivo en formato PDF (.pdf).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setError('')
    setAviso('')
    setUploading(true)
    const formData = new FormData()
    formData.append('cv', file)
    try {
      const data = await apiFetch('/cv/upload', { method: 'POST', body: formData })
      if (data?.aviso) setAviso(data.aviso)
      await refreshProfile()
    } catch (err) {
      setError('No se pudo procesar el CV: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Helpers de Experiencia
  const addExperiencia = () => {
    setExperiencia([
      {
        cargo: '',
        empresa: '',
        ubicacion: 'Bogotá, Colombia',
        desde: '',
        hasta: '',
        es_actual: false,
        modalidad: 'presencial',
        intensidad: 'tiempo_completo',
        tipo_contrato: 'termino_indefinido',
        salario_nominal: '',
        salario_real: '',
        tiene_prima_legal: true,
        tiene_prima_extralegal: false,
        prima_productividad: '',
        es_variable: false,
        promedio_variable: '',
        descripcion: '',
        aspectos_positivos: '',
        aspectos_negativos: '',
        motivo_retiro: ''
      },
      ...experiencia
    ])
  }

  const updateExperiencia = (index, field, value) => {
    const updated = [...experiencia]
    updated[index] = { ...updated[index], [field]: value }
    setExperiencia(updated)
  }

  const removeExperiencia = (index) => {
    setExperiencia(experiencia.filter((_, i) => i !== index))
  }

  // Helpers de Educación Formal
  const addEducacionFormal = () => {
    setEducacionFormal([
      {
        nivel: 'pregrado',
        titulo: '',
        institucion: 'Universidad de La Sabana',
        desde: '',
        hasta: '',
        estado: 'graduado'
      },
      ...educacionFormal
    ])
  }

  const updateEducacionFormal = (index, field, value) => {
    const updated = [...educacionFormal]
    updated[index] = { ...updated[index], [field]: value }
    setEducacionFormal(updated)
  }

  const removeEducacionFormal = (index) => {
    setEducacionFormal(educacionFormal.filter((_, i) => i !== index))
  }

  // Helpers de Educación No Formal
  const addFormacionNoFormal = () => {
    setFormacionNoFormal([
      {
        tipo: 'diplomado',
        nombre: '',
        institucion: '',
        intensidad_horas: '',
        fecha: ''
      },
      ...formacionNoFormal
    ])
  }

  const updateFormacionNoFormal = (index, field, value) => {
    const updated = [...formacionNoFormal]
    updated[index] = { ...updated[index], [field]: value }
    setFormacionNoFormal(updated)
  }

  const removeFormacionNoFormal = (index) => {
    setFormacionNoFormal(formacionNoFormal.filter((_, i) => i !== index))
  }

  // Helpers de Certificaciones
  const addCertificacion = () => {
    setCertificaciones([
      {
        nombre: '',
        entidad_emisora: '',
        id_credencial: '',
        url_credencial: '',
        fecha_emision: '',
        fecha_vencimiento: '',
        no_vence: true
      },
      ...certificaciones
    ])
  }

  const updateCertificacion = (index, field, value) => {
    const updated = [...certificaciones]
    updated[index] = { ...updated[index], [field]: value }
    setCertificaciones(updated)
  }

  const removeCertificacion = (index) => {
    setCertificaciones(certificaciones.filter((_, i) => i !== index))
  }

  // Helpers de Habilidades
  const addSkillToCategory = (categoria) => {
    const val = newSkillText[categoria]?.trim()
    if (!val) return
    setHabilidadesTecnicas([...habilidadesTecnicas, { categoria, nombre: val, nivel: 'avanzado' }])
    setNewSkillText({ ...newSkillText, [categoria]: '' })
  }

  const removeHabilidadTecnica = (index) => {
    setHabilidadesTecnicas(habilidadesTecnicas.filter((_, i) => i !== index))
  }

  const addHabilidadBlanda = () => {
    const val = newSkillText.blandas?.trim()
    if (!val) return
    setHabilidadesBlandas([...habilidadesBlandas, val])
    setNewSkillText({ ...newSkillText, blandas: '' })
  }

  const removeHabilidadBlanda = (index) => {
    setHabilidadesBlandas(habilidadesBlandas.filter((_, i) => i !== index))
  }

  const addIdioma = () => {
    const nombre = newIdioma.idioma?.trim()
    if (!nombre) return
    setIdiomas([...idiomas, { idioma: nombre, nivel_mcer: newIdioma.nivel_mcer, nivel: 'avanzado' }])
    setNewIdioma({ idioma: '', nivel_mcer: 'B2' })
  }

  const removeIdioma = (index) => {
    setIdiomas(idiomas.filter((_, i) => i !== index))
  }

  const assessment = profile?.ultimo_assessment

  return (
    <div className="app-shell">
      <Header />
      <div className="workspace">
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>
          
          {/* Barra superior de navegación y guardado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              onClick={() => navigate('/dashboard/mis-procesos')}
              style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--c-blue-light)', fontWeight: 600 }}
            >
              <ArrowLeft size={16} /> Volver a Procesos
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {saveSuccess && (
                <span style={{ color: 'var(--c-green)', fontSize: 'var(--fs-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={16} /> Perfil Maestro guardado
                </span>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="btn-auth-submit"
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          {/* Encabezado del Perfil Maestro */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ margin: 0, color: 'var(--c-blue-dark)', fontSize: '1.75rem' }}>Perfil Maestro Integral</h1>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                  Base de datos exhaustiva de tu trayectoria profesional. Alimenta de forma inteligente y adaptada cada hoja de vida que generes.
                </p>
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', background: 'rgba(0,19,91,0.06)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', color: 'var(--c-blue-dark)', fontWeight: 600 }}>
                {profile?.usuario?.correo}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                />
              </div>
              <div className="form-group">
                <label>Resumen Profesional Maestro</label>
                <textarea
                  rows={2}
                  value={resumen}
                  onChange={e => setResumen(e.target.value)}
                  placeholder="Resumen ejecutivo integral de tu propuesta de valor, trayectoria y fortalezas principales..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Alertas */}
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', color: 'var(--c-red)', fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {aviso && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', color: '#1e40af', fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} /> {aviso}
            </div>
          )}

          {/* Barra de pestañas */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.2rem', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('experiencia')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'experiencia' ? '3px solid var(--c-blue-dark)' : '3px solid transparent',
                padding: '0.65rem 1.25rem',
                fontWeight: 700,
                fontSize: 'var(--fs-sm)',
                color: activeTab === 'experiencia' ? 'var(--c-blue-dark)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Briefcase size={16} /> Experiencia Laboral ({experiencia.length})
            </button>

            <button
              onClick={() => setActiveTab('educacion')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'educacion' ? '3px solid var(--c-blue-dark)' : '3px solid transparent',
                padding: '0.65rem 1.25rem',
                fontWeight: 700,
                fontSize: 'var(--fs-sm)',
                color: activeTab === 'educacion' ? 'var(--c-blue-dark)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <GraduationCap size={16} /> Educación ({educacionFormal.length + formacionNoFormal.length})
            </button>

            <button
              onClick={() => setActiveTab('habilidades')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'habilidades' ? '3px solid var(--c-blue-dark)' : '3px solid transparent',
                padding: '0.65rem 1.25rem',
                fontWeight: 700,
                fontSize: 'var(--fs-sm)',
                color: activeTab === 'habilidades' ? 'var(--c-blue-dark)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Sparkles size={16} /> Habilidades & Idiomas ({habilidadesTecnicas.length + habilidadesBlandas.length + idiomas.length})
            </button>

            <button
              onClick={() => setActiveTab('certificaciones')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'certificaciones' ? '3px solid var(--c-blue-dark)' : '3px solid transparent',
                padding: '0.65rem 1.25rem',
                fontWeight: 700,
                fontSize: 'var(--fs-sm)',
                color: activeTab === 'certificaciones' ? 'var(--c-blue-dark)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Award size={16} /> Certificaciones ({certificaciones.length})
            </button>

            <button
              onClick={() => setActiveTab('assessment')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'assessment' ? '3px solid var(--c-blue-dark)' : '3px solid transparent',
                padding: '0.65rem 1.25rem',
                fontWeight: 700,
                fontSize: 'var(--fs-sm)',
                color: activeTab === 'assessment' ? 'var(--c-blue-dark)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <FileText size={16} /> Diagnóstico ATS & Resubir CV
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              PESTAÑA 1: EXPERIENCIA LABORAL
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'experiencia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0 }}>Historial de Experiencias Laborales</h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                    Registra tu trayectoria con salarios, tipos de contrato, jornadas y logros detallados.
                  </p>
                </div>
                <button
                  onClick={addExperiencia}
                  className="btn-auth-submit"
                  style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                >
                  <Plus size={16} /> Agregar Experiencia
                </button>
              </div>

              {experiencia.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem' }}>No tienes experiencias registradas aún.</p>
                  <button onClick={addExperiencia} className="btn-auth-submit" style={{ width: 'auto' }}>+ Agregar Primera Experiencia</button>
                </div>
              ) : (
                experiencia.map((exp, idx) => (
                  <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--c-blue-dark)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--c-blue-dark)', fontSize: 'var(--fs-md)' }}>
                        #{idx + 1} {exp.cargo || 'Nuevo Cargo'} {exp.empresa ? `en ${exp.empresa}` : ''}
                      </span>
                      <button
                        onClick={() => removeExperiencia(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--c-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--fs-xs)' }}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>

                    {/* Datos Básicos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label>Cargo / Rol *</label>
                        <input
                          type="text"
                          required
                          value={exp.cargo || ''}
                          onChange={e => updateExperiencia(idx, 'cargo', e.target.value)}
                          placeholder="Ej. Líder de Analítica"
                        />
                      </div>
                      <div className="form-group">
                        <label>Empresa / Organización *</label>
                        <input
                          type="text"
                          required
                          value={exp.empresa || ''}
                          onChange={e => updateExperiencia(idx, 'empresa', e.target.value)}
                          placeholder="Ej. Universidad de La Sabana"
                        />
                      </div>
                      <div className="form-group">
                        <label>Ubicación</label>
                        <input
                          type="text"
                          value={exp.ubicacion || ''}
                          onChange={e => updateExperiencia(idx, 'ubicacion', e.target.value)}
                          placeholder="Ej. Chía, Cundinamarca"
                        />
                      </div>
                    </div>

                    {/* Fechas y Modalidad */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label>Fecha Inicio (YYYY-MM)</label>
                        <input
                          type="text"
                          value={exp.desde || ''}
                          onChange={e => updateExperiencia(idx, 'desde', e.target.value)}
                          placeholder="2021-03"
                        />
                      </div>
                      <div className="form-group">
                        <label>Fecha Fin (o vacío si actual)</label>
                        <input
                          type="text"
                          disabled={exp.es_actual}
                          value={exp.es_actual ? '' : (exp.hasta || '')}
                          onChange={e => updateExperiencia(idx, 'hasta', e.target.value)}
                          placeholder={exp.es_actual ? 'Presente' : '2023-10'}
                        />
                      </div>
                      <div className="form-group">
                        <label>Modalidad</label>
                        <select
                          value={exp.modalidad || 'presencial'}
                          onChange={e => updateExperiencia(idx, 'modalidad', e.target.value)}
                        >
                          <option value="presencial">Presencial</option>
                          <option value="hibrido">Híbrido</option>
                          <option value="virtual">Virtual / Remoto</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', marginTop: '1.25rem' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(exp.es_actual)}
                            onChange={e => {
                              updateExperiencia(idx, 'es_actual', e.target.checked)
                              if (e.target.checked) updateExperiencia(idx, 'hasta', null)
                            }}
                          />
                          <span>Trabajo actual</span>
                        </label>
                      </div>
                    </div>

                    {/* Intensidad y Tipo de Contrato */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label>Intensidad / Jornada Laboral</label>
                        <select
                          value={exp.intensidad || 'tiempo_completo'}
                          onChange={e => updateExperiencia(idx, 'intensidad', e.target.value)}
                        >
                          <option value="tiempo_completo">Tiempo completo (Full-time)</option>
                          <option value="medio_tiempo">Medio tiempo (Part-time)</option>
                          <option value="freelance">Freelance / Independiente</option>
                          <option value="fines_de_semana">Fines de semana</option>
                          <option value="por_proyecto">Por proyecto</option>
                          <option value="por_horas">Por horas</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Tipo de Contratación</label>
                        <select
                          value={exp.tipo_contrato || 'termino_indefinido'}
                          onChange={e => updateExperiencia(idx, 'tipo_contrato', e.target.value)}
                        >
                          <option value="termino_indefinido">Contrato laboral a término indefinido</option>
                          <option value="termino_fijo">Contrato laboral a término fijo</option>
                          <option value="prestacion_servicios">Prestación de servicios (Honorarios)</option>
                          <option value="practicas">Prácticas formativas / Pasantía</option>
                          <option value="carrera_administrativa">Puesto de carrera en el sector público</option>
                          <option value="libre_nombramiento">Libre nombramiento y remoción (Sector público)</option>
                          <option value="obra_labor">Contrato de obra o labor</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                    </div>

                    {/* Compensación y Salarios */}
                    <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--fs-xs)', color: 'var(--c-blue-dark)' }}>Compensación y Remuneración (Confidencial para entrenamiento de IA y filtros salariales)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.6rem' }}>
                        <div className="form-group">
                          <label>Salario Nominal Mensual</label>
                          <input
                            type="text"
                            value={exp.salario_nominal || ''}
                            onChange={e => updateExperiencia(idx, 'salario_nominal', e.target.value)}
                            placeholder="Ej. $6.500.000 COP"
                          />
                        </div>
                        <div className="form-group">
                          <label>Salario Real Total Integrado</label>
                          <input
                            type="text"
                            value={exp.salario_real || ''}
                            onChange={e => updateExperiencia(idx, 'salario_real', e.target.value)}
                            placeholder="Ej. $7.800.000 COP"
                          />
                        </div>
                        <div className="form-group">
                          <label>Bono / Prima Productividad</label>
                          <input
                            type="text"
                            value={exp.prima_productividad || ''}
                            onChange={e => updateExperiencia(idx, 'prima_productividad', e.target.value)}
                            placeholder="Ej. 1 salario al año"
                          />
                        </div>
                        <div className="form-group">
                          <label>Promedio Variable Mensual</label>
                          <input
                            type="text"
                            value={exp.promedio_variable || ''}
                            onChange={e => updateExperiencia(idx, 'promedio_variable', e.target.value)}
                            placeholder="Ej. $1.200.000 COP"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: 'var(--fs-xs)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(exp.tiene_prima_legal)}
                            onChange={e => updateExperiencia(idx, 'tiene_prima_legal', e.target.checked)}
                          />
                          <span>Prima legal</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(exp.tiene_prima_extralegal)}
                            onChange={e => updateExperiencia(idx, 'tiene_prima_extralegal', e.target.checked)}
                          />
                          <span>Prima extralegal</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(exp.es_variable)}
                            onChange={e => updateExperiencia(idx, 'es_variable', e.target.checked)}
                          />
                          <span>Tiene salario variable / comisiones</span>
                        </label>
                      </div>
                    </div>

                    {/* Logros Detallados STAR */}
                    <div className="form-group">
                      <label>Logros, Responsabilidades e Impacto Cuantificable (Metodología STAR / Google X-Y-Z)</label>
                      <textarea
                        rows={4}
                        value={exp.descripcion || ''}
                        onChange={e => updateExperiencia(idx, 'descripcion', e.target.value)}
                        placeholder="• Lideró la implementación del sistema CRM alcanzando un 35% de adopción en 6 meses...&#10;• Optimizó el presupuesto del área en $150M COP mediante renegociación de proveedores..."
                      />
                    </div>

                    {/* Evaluación Cualitativa: Pros, Contras y Retiro */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label>Aspectos Positivos del Trabajo</label>
                        <textarea
                          rows={2}
                          value={exp.aspectos_positivos || ''}
                          onChange={e => updateExperiencia(idx, 'aspectos_positivos', e.target.value)}
                          placeholder="Aprendizajes, cultura, autonomía, proyectos insignia..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Aspectos Negativos / Retos</label>
                        <textarea
                          rows={2}
                          value={exp.aspectos_negativos || ''}
                          onChange={e => updateExperiencia(idx, 'aspectos_negativos', e.target.value)}
                          placeholder="Desafíos de liderazgo, burocracia, falta de recursos superada..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Motivo Real de Retiro / Transición</label>
                        <textarea
                          rows={2}
                          value={exp.motivo_retiro || ''}
                          onChange={e => updateExperiencia(idx, 'motivo_retiro', e.target.value)}
                          placeholder="Búsqueda de mayor impacto, cambio de sector, fin de proyecto..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PESTAÑA 2: EDUCACIÓN (FORMAL E INFORMAL)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'educacion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Sección Educación Formal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Educación Formal</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                      Títulos universitarios, pregrados, posgrados y carreras técnicas reconocidas.
                    </p>
                  </div>
                  <button
                    onClick={addEducacionFormal}
                    className="btn-auth-submit"
                    style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                  >
                    <Plus size={16} /> Agregar Grado Formal
                  </button>
                </div>

                {educacionFormal.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <p style={{ color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>No tienes títulos formales registrados.</p>
                    <button onClick={addEducacionFormal} className="btn-auth-submit" style={{ width: 'auto' }}>+ Agregar Título Formal</button>
                  </div>
                ) : (
                  educacionFormal.map((edu, idx) => (
                    <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--c-blue-dark)' }}>
                          #{idx + 1} {edu.titulo || 'Nuevo Título'}
                        </span>
                        <button
                          onClick={() => removeEducacionFormal(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--c-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--fs-xs)' }}
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.5fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label>Nivel Académico *</label>
                          <select
                            value={edu.nivel || 'pregrado'}
                            onChange={e => updateEducacionFormal(idx, 'nivel', e.target.value)}
                          >
                            <option value="post_doctorado">Post-doctorado</option>
                            <option value="doctorado">Doctorado</option>
                            <option value="maestria">Maestría</option>
                            <option value="especializacion">Especialización</option>
                            <option value="pregrado">Pregrado / Licenciatura</option>
                            <option value="tecnologo">Tecnólogo</option>
                            <option value="tecnico">Técnico</option>
                            <option value="bachillerato">Bachillerato</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Título Obtenido o en Curso *</label>
                          <input
                            type="text"
                            value={edu.titulo || ''}
                            onChange={e => updateEducacionFormal(idx, 'titulo', e.target.value)}
                            placeholder="Ej. Ingeniería Industrial"
                          />
                        </div>
                        <div className="form-group">
                          <label>Institución Universitaria *</label>
                          <input
                            type="text"
                            value={edu.institucion || ''}
                            onChange={e => updateEducacionFormal(idx, 'institucion', e.target.value)}
                            placeholder="Ej. Universidad de La Sabana"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label>Año Inicio</label>
                          <input
                            type="text"
                            value={edu.desde || ''}
                            onChange={e => updateEducacionFormal(idx, 'desde', e.target.value)}
                            placeholder="2018"
                          />
                        </div>
                        <div className="form-group">
                          <label>Año Fin (o vacío si en curso)</label>
                          <input
                            type="text"
                            value={edu.hasta || ''}
                            onChange={e => updateEducacionFormal(idx, 'hasta', e.target.value)}
                            placeholder="2023"
                          />
                        </div>
                        <div className="form-group">
                          <label>Estado</label>
                          <select
                            value={edu.estado || 'graduado'}
                            onChange={e => updateEducacionFormal(idx, 'estado', e.target.value)}
                          >
                            <option value="graduado">Graduado / Titulado</option>
                            <option value="en_curso">En curso / Estudiando</option>
                            <option value="aplazado">Aplazado</option>
                            <option value="incompleto">Incompleto</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sección Educación No Formal / Continua */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Educación No Formal y Continua</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                      Minors universitarios, diplomados, cursos de profundización, talleres y bootcamps.
                    </p>
                  </div>
                  <button
                    onClick={addFormacionNoFormal}
                    className="btn-auth-submit"
                    style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                  >
                    <Plus size={16} /> Agregar Programa Continuo
                  </button>
                </div>

                {formacionNoFormal.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <p style={{ color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>No tienes formación continua registrada.</p>
                    <button onClick={addFormacionNoFormal} className="btn-auth-submit" style={{ width: 'auto' }}>+ Agregar Curso o Diplomado</button>
                  </div>
                ) : (
                  formacionNoFormal.map((f, idx) => (
                    <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--c-blue-dark)' }}>
                          #{idx + 1} {f.nombre || 'Nuevo Programa'}
                        </span>
                        <button
                          onClick={() => removeFormacionNoFormal(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--c-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--fs-xs)' }}
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.5fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label>Tipo de Programa</label>
                          <select
                            value={f.tipo || 'diplomado'}
                            onChange={e => updateFormacionNoFormal(idx, 'tipo', e.target.value)}
                          >
                            <option value="minor">Minor universitario</option>
                            <option value="diplomado">Diplomado</option>
                            <option value="curso">Curso de especialización</option>
                            <option value="taller">Taller / Workshop</option>
                            <option value="bootcamp">Bootcamp intensivo</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Nombre del Programa / Curso *</label>
                          <input
                            type="text"
                            value={f.nombre || ''}
                            onChange={e => updateFormacionNoFormal(idx, 'nombre', e.target.value)}
                            placeholder="Ej. Diplomado en Finanzas Cuantitativas"
                          />
                        </div>
                        <div className="form-group">
                          <label>Entidad / Plataforma</label>
                          <input
                            type="text"
                            value={f.institucion || ''}
                            onChange={e => updateFormacionNoFormal(idx, 'institucion', e.target.value)}
                            placeholder="Ej. UniSabana / Coursera"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label>Intensidad Horaria (Horas)</label>
                          <input
                            type="text"
                            value={f.intensidad_horas || ''}
                            onChange={e => updateFormacionNoFormal(idx, 'intensidad_horas', e.target.value)}
                            placeholder="Ej. 120 horas"
                          />
                        </div>
                        <div className="form-group">
                          <label>Año o Fecha de Realización</label>
                          <input
                            type="text"
                            value={f.fecha || ''}
                            onChange={e => updateFormacionNoFormal(idx, 'fecha', e.target.value)}
                            placeholder="Ej. 2023"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PESTAÑA 3: HABILIDADES & IDIOMAS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'habilidades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Habilidades Categorizadas e Idiomas</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                  Organizadas en categorías estratégicas para alimentar filtros ATS y descripciones de CVs.
                </p>
              </div>

              {/* Categoría 1: Software & Ofimática */}
              <div className="card">
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--c-blue-dark)' }}>1. Software & Herramientas de Gestión</h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>ERP, CRM, software ofimático, visualización y suites (Excel, SAP, Jira, Salesforce, Power BI, Figma).</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {habilidadesTecnicas.map((h, i) => (h.categoria === 'software' || h.tipo === 'programa') && (
                    <span key={i} className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem' }}>
                      {h.nombre}
                      <button onClick={() => removeHabilidadTecnica(i)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Agregar software (ej. Power BI, SAP)..."
                    value={newSkillText.software}
                    onChange={e => setNewSkillText({ ...newSkillText, software: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillToCategory('software'); } }}
                    style={{ maxWidth: 320 }}
                  />
                  <button onClick={() => addSkillToCategory('software')} className="btn-auth-submit" style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: 'var(--fs-xs)' }}>+ Añadir</button>
                </div>
              </div>

              {/* Categoría 2: Programación & Datos */}
              <div className="card">
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--c-blue-dark)' }}>2. Programación, Datos & Tecnología</h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Lenguajes, frameworks, bases de datos y cloud (Python, SQL, React, Node.js, AWS, Docker).</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {habilidadesTecnicas.map((h, i) => (h.categoria === 'tecnologia_datos' || h.tipo === 'programacion') && (
                    <span key={i} className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem' }}>
                      {h.nombre}
                      <button onClick={() => removeHabilidadTecnica(i)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Agregar tecnología (ej. SQL, Python)..."
                    value={newSkillText.tecnologia_datos}
                    onChange={e => setNewSkillText({ ...newSkillText, tecnologia_datos: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillToCategory('tecnologia_datos'); } }}
                    style={{ maxWidth: 320 }}
                  />
                  <button onClick={() => addSkillToCategory('tecnologia_datos')} className="btn-auth-submit" style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: 'var(--fs-xs)' }}>+ Añadir</button>
                </div>
              </div>

              {/* Categoría 3: Metodologías */}
              <div className="card">
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--c-blue-dark)' }}>3. Metodologías & Marcos de Trabajo</h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Metodologías ágiles y marcos de gestión (Scrum, PMI, Lean Six Sigma, OKRs, Design Thinking).</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {habilidadesTecnicas.map((h, i) => (h.categoria === 'metodologias' || h.tipo === 'conocimiento') && (
                    <span key={i} className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem' }}>
                      {h.nombre}
                      <button onClick={() => removeHabilidadTecnica(i)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Agregar metodología (ej. Scrum, PMI)..."
                    value={newSkillText.metodologias}
                    onChange={e => setNewSkillText({ ...newSkillText, metodologias: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillToCategory('metodologias'); } }}
                    style={{ maxWidth: 320 }}
                  />
                  <button onClick={() => addSkillToCategory('metodologias')} className="btn-auth-submit" style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: 'var(--fs-xs)' }}>+ Añadir</button>
                </div>
              </div>

              {/* Categoría 4: Conocimientos de Dominio */}
              <div className="card">
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--c-blue-dark)' }}>4. Conocimientos Sectoriales & Dominio</h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Especialidades conceptuales (Finanzas corporativas, Derecho laboral, Supply Chain, M&A).</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {habilidadesTecnicas.map((h, i) => h.categoria === 'conocimientos_dominio' && (
                    <span key={i} className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem' }}>
                      {h.nombre}
                      <button onClick={() => removeHabilidadTecnica(i)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Agregar especialidad (ej. Finanzas corporativas)..."
                    value={newSkillText.conocimientos_dominio}
                    onChange={e => setNewSkillText({ ...newSkillText, conocimientos_dominio: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillToCategory('conocimientos_dominio'); } }}
                    style={{ maxWidth: 320 }}
                  />
                  <button onClick={() => addSkillToCategory('conocimientos_dominio')} className="btn-auth-submit" style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: 'var(--fs-xs)' }}>+ Añadir</button>
                </div>
              </div>

              {/* Categoría 5: Habilidades Blandas */}
              <div className="card">
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--c-blue-dark)' }}>5. Habilidades Blandas & Liderazgo</h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Competencias interpersonales (Negociación, Liderazgo, Comunicación asertiva, Gestión de crisis).</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {habilidadesBlandas.map((h, i) => (
                    <span key={i} className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem' }}>
                      {h}
                      <button onClick={() => removeHabilidadBlanda(i)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Agregar habilidad blanda..."
                    value={newSkillText.blandas}
                    onChange={e => setNewSkillText({ ...newSkillText, blandas: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHabilidadBlanda(); } }}
                    style={{ maxWidth: 320 }}
                  />
                  <button onClick={addHabilidadBlanda} className="btn-auth-submit" style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: 'var(--fs-xs)' }}>+ Añadir</button>
                </div>
              </div>

              {/* Categoría 6: Idiomas con Marco MCER */}
              <div className="card">
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--c-blue-dark)' }}>6. Idiomas & Dominio Internacional</h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Niveles clasificados según el estándar internacional MCER (A1 a C2 o Nativo).</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {idiomas.map((idi, i) => (
                    <span key={i} className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem' }}>
                      {idi.idioma} ({idi.nivel_mcer || idi.nivel})
                      <button onClick={() => removeIdioma(i)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Idioma (ej. Inglés, Francés)..."
                    value={newIdioma.idioma}
                    onChange={e => setNewIdioma({ ...newIdioma, idioma: e.target.value })}
                    style={{ maxWidth: 220 }}
                  />
                  <select
                    value={newIdioma.nivel_mcer}
                    onChange={e => setNewIdioma({ ...newIdioma, nivel_mcer: e.target.value })}
                    style={{ maxWidth: 140 }}
                  >
                    <option value="A1">A1 (Principiante)</option>
                    <option value="A2">A2 (Básico)</option>
                    <option value="B1">B1 (Pre-Intermedio)</option>
                    <option value="B2">B2 (Intermedio)</option>
                    <option value="C1">C1 (Avanzado)</option>
                    <option value="C2">C2 (Dominio Pleno)</option>
                    <option value="Nativo">Nativo / Bilingüe</option>
                  </select>
                  <button onClick={addIdioma} className="btn-auth-submit" style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: 'var(--fs-xs)' }}>+ Añadir</button>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PESTAÑA 4: CERTIFICACIONES
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'certificaciones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0 }}>Certificaciones & Licencias Oficiales</h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                    Credenciales emitidas por entidades globales con ID y enlaces de verificación.
                  </p>
                </div>
                <button
                  onClick={addCertificacion}
                  className="btn-auth-submit"
                  style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                >
                  <Plus size={16} /> Agregar Certificación
                </button>
              </div>

              {certificaciones.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem' }}>No tienes certificaciones registradas.</p>
                  <button onClick={addCertificacion} className="btn-auth-submit" style={{ width: 'auto' }}>+ Agregar Certificación</button>
                </div>
              ) : (
                certificaciones.map((cert, idx) => (
                  <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--c-blue-dark)' }}>
                        #{idx + 1} {cert.nombre || 'Nueva Certificación'}
                      </span>
                      <button
                        onClick={() => removeCertificacion(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--c-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--fs-xs)' }}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label>Nombre de la Certificación *</label>
                        <input
                          type="text"
                          value={cert.nombre || ''}
                          onChange={e => updateCertificacion(idx, 'nombre', e.target.value)}
                          placeholder="Ej. AWS Certified Solutions Architect"
                        />
                      </div>
                      <div className="form-group">
                        <label>Entidad Emisora *</label>
                        <input
                          type="text"
                          value={cert.entidad_emisora || ''}
                          onChange={e => updateCertificacion(idx, 'entidad_emisora', e.target.value)}
                          placeholder="Ej. Amazon Web Services / Scrum Alliance"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label>ID de la Credencial</label>
                        <input
                          type="text"
                          value={cert.id_credencial || ''}
                          onChange={e => updateCertificacion(idx, 'id_credencial', e.target.value)}
                          placeholder="Ej. AWS-ASA-192837"
                        />
                      </div>
                      <div className="form-group">
                        <label>URL de Validación</label>
                        <input
                          type="url"
                          value={cert.url_credencial || ''}
                          onChange={e => updateCertificacion(idx, 'url_credencial', e.target.value)}
                          placeholder="https://credly.com/badges/..."
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label>Fecha de Expedición</label>
                        <input
                          type="text"
                          value={cert.fecha_emision || ''}
                          onChange={e => updateCertificacion(idx, 'fecha_emision', e.target.value)}
                          placeholder="2023-05"
                        />
                      </div>
                      <div className="form-group">
                        <label>Fecha de Expiración</label>
                        <input
                          type="text"
                          disabled={cert.no_vence}
                          value={cert.no_vence ? '' : (cert.fecha_vencimiento || '')}
                          onChange={e => updateCertificacion(idx, 'fecha_vencimiento', e.target.value)}
                          placeholder={cert.no_vence ? 'No vence' : '2026-05'}
                        />
                      </div>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', marginTop: '1.25rem', fontSize: 'var(--fs-xs)' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(cert.no_vence)}
                            onChange={e => {
                              updateCertificacion(idx, 'no_vence', e.target.checked)
                              if (e.target.checked) updateCertificacion(idx, 'fecha_vencimiento', null)
                            }}
                          />
                          <span>Credencial vitalicia (No vence)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PESTAÑA 5: DIAGNÓSTICO ATS & RESUBIR CV
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'assessment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Tarjeta de resubida */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h2 style={{ margin: 0 }}>Actualizar CV y Recalcular Assessment</h2>
                <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                  Subir un nuevo CV extrae automáticamente la información para prellenar tu Perfil Maestro y genera una calificación con la nueva rúbrica objetiva de reclutamiento.
                </p>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
                <div>
                  <button
                    className="btn-auth-submit"
                    style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
                    onClick={handleReuploadClick}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {uploading ? 'Procesando CV con IA…' : 'Subir archivo PDF de CV'}
                  </button>
                </div>
              </div>

              {/* Resultado del Assessment */}
              {assessment && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h2 style={{ margin: 0, color: 'var(--c-blue-dark)' }}>Última Evaluación Objetiva de Reclutador</h2>
                  <AssessmentResult respuesta={assessment.respuesta_json} pdfUrl={assessment.pdf_url} />
                </div>
              )}
            </div>
          )}

          {/* Botón flotante / inferior de guardado */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-auth-submit"
              style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: 'var(--fs-base)' }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Guardando Perfil Maestro...' : 'Guardar Todos los Cambios'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
