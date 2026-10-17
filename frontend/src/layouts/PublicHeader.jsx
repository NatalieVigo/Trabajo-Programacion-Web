import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { getRoleHome } from '../routes/roleHome.js'
import { LANDING_SECTIONS, ROUTES, landingSectionPath } from '../routes/routePaths.js'
import { Avatar, Button, CloseIcon, MenuIcon } from '../shared/components'
import { cx } from '../utils/classNames.js'
import { formatRol, getDisplayName } from '../utils/format.js'
import LogoutButton from './LogoutButton.jsx'
import './PublicHeader.css'

const NAV_LINKS = [
  { label: 'Inicio', to: ROUTES.home },
  { label: 'Cómo reportar', to: landingSectionPath(LANDING_SECTIONS.comoReportar) },
  { label: 'Categorías de servicio', to: landingSectionPath(LANDING_SECTIONS.categorias) },
  { label: 'Tiempos de atención', to: landingSectionPath(LANDING_SECTIONS.tiempos) },
]

// En móvil el menú se cierra al elegir un enlace, con Esc o al tocar fuera.
export default function PublicHeader() {
  const { usuario } = useAuth()
  const vistaDelRol = usuario ? getRoleHome(usuario.rol) : null
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef(null)
  const toggleRef = useRef(null)
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen) return undefined
    function handlePointerDown(event) {
      if (!headerRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

  function handleKeyDown(event) {
    if (event.key === 'Escape' && menuOpen) {
      closeMenu()
      toggleRef.current?.focus()
    }
  }

  return (
    <header ref={headerRef} className="public-header" onKeyDown={handleKeyDown}>
      <div className="container public-header__inner">
        <Link to={ROUTES.home} className="brand" onClick={closeMenu}>
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Mesa de Ayuda</span>
          <span className="brand__suffix">· Campus Ulima</span>
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className="public-header__toggle"
          aria-expanded={menuOpen}
          aria-controls="menu-publico"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
          Menú
        </button>

        <div id="menu-publico" className={cx('public-header__menu', menuOpen && 'is-open')}>
          <nav aria-label="Principal">
            <ul className="public-nav">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="public-nav__link" onClick={closeMenu}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {vistaDelRol ? (
            <div className="public-header__actions public-header__actions--sesion">
              <p className="public-header__cuenta">
                <Avatar nombres={usuario.nombres} apellidos={usuario.apellidos} size="sm" />
                <span className="public-header__identidad">
                  <span className="public-header__nombre">{getDisplayName(usuario)}</span>
                  <span className="public-header__rol">{formatRol(usuario.rol)}</span>
                </span>
              </p>
              <Button to={vistaDelRol.path} size="sm" onClick={closeMenu}>
                {vistaDelRol.label}
              </Button>
              <LogoutButton className="btn btn--secondary btn--sm" />
            </div>
          ) : (
            <div className="public-header__actions">
              <Button to={ROUTES.iniciarSesion} variant="secondary" size="sm" onClick={closeMenu}>
                Iniciar sesión
              </Button>
              <Button to={ROUTES.registro} size="sm" onClick={closeMenu}>
                Registrarme
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
