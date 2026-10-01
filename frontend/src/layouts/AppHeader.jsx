import { Link } from 'react-router-dom'
import { getRoleHome } from '../routes/roleHome.js'
import { Avatar, CloseIcon, MenuIcon } from '../shared/components'
import { formatRol, getDisplayName } from '../utils/format.js'
import { NAVIGATION } from './navigation.js'
import TicketSearch from './TicketSearch.jsx'
import './AppHeader.css'

/**
 * Cabecera de la sesión iniciada (p10): marca, buscador por código, píldora con el contador del rol y la persona
 * que ingresó. Por debajo de 1024 px muestra el botón «Menú» que abre el menú lateral.
 */
export default function AppHeader({ usuario, contadores, menuId, menuOpen, onMenuToggle, menuButtonRef }) {
  const home = getRoleHome(usuario.rol)
  const { pill } = NAVIGATION[usuario.rol]
  const valor = contadores?.[pill.contador]

  return (
    <header className="app-header">
      <button
        ref={menuButtonRef}
        type="button"
        className="app-header__menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={onMenuToggle}
      >
        {menuOpen ? <CloseIcon /> : <MenuIcon />}
        Menú
      </button>

      <Link to={home.path} className="app-brand">
        <span className="app-brand__mark" aria-hidden="true" />
        Mesa de Ayuda
      </Link>

      <TicketSearch ticketsPath={home.ticketsPath} />

      <div className="app-header__end">
        {valor !== undefined && (
          <p className="app-header__pill">
            <span className="app-header__pill-label">{pill.label}</span> <strong>{valor}</strong>
          </p>
        )}
        <p className="app-header__user">
          <span className="app-header__name">{getDisplayName(usuario)}</span>
          <span className="app-header__role">{formatRol(usuario.rol)}</span>
        </p>
        <Avatar nombres={usuario.nombres} apellidos={usuario.apellidos} size="sm" />
      </div>
    </header>
  )
}
