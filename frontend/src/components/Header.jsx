import React from 'react'
import { useAuth } from '../lib/AuthContext.jsx'

/**
 * Header institucional de GovLab / Universidad de La Sabana.
 * Limpio, elegante y exactamente fiel a la estructura de Germina.
 */
export default function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="germina-header">
      <div className="germina-header-inner">
        {/* Lado izquierdo: Logo GovLab + Divisor + Título AlumniCV */}
        <div className="germina-brand">
          <img
            src="/branding/GovLab_blanco.png"
            alt="GovLab Universidad de La Sabana"
            className="govlab-logo"
          />
          <div className="header-divider" aria-hidden="true" />
          <span className="app-title-badge">AlumniCV</span>
        </div>

        {/* Lado derecho: chip de usuario y cerrar sesión */}
        {user && (
          <div className="germina-header-right">
            <span className="header-user-email">
              {user.email}
            </span>
            <button
              className="header-signout-btn"
              onClick={signOut}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
