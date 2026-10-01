import { useEffect, useId, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ROUTES } from '../routes/routePaths.js'
import { Badge } from '../shared/components'
import { cx } from '../utils/classNames.js'
import LogoutButton from './LogoutButton.jsx'
import { NAVIGATION } from './navigation.js'
import './Sidebar.css'

/**
 * Menú lateral del rol (p10, p22, p24) con sus contadores y el bloque «Mi cuenta» / «Cerrar sesión». Desde 1024 px
 * está siempre visible; por debajo es un panel que abre el botón «Menú» de la cabecera y que se cierra con Esc, al
 * tocar el fondo, al navegar (AppLayout) o cuando el foco sale de él.
 */
export default function Sidebar({ id, rol, contadores, open, onClose, menuButtonRef }) {
  const { title, items } = NAVIGATION[rol]
  const panelRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    panelRef.current.querySelector('a[href]')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose({ restoreFocus: true })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  function handleBlur(event) {
    const next = event.relatedTarget
    if (open && next && !panelRef.current.contains(next) && next !== menuButtonRef.current) onClose()
  }

  return (
    <>
      {open && <div className="app-sidebar__overlay" aria-hidden="true" onClick={() => onClose({ restoreFocus: true })} />}
      <div ref={panelRef} id={id} className={cx('app-sidebar', open && 'is-open')} onBlur={handleBlur}>
        <nav className="app-sidebar__nav" aria-labelledby={titleId}>
          <h2 id={titleId} className="app-sidebar__title">
            {title}
          </h2>
          <ul className="app-sidebar__list">
            {items.map((item) => {
              const total = item.contador ? contadores?.[item.contador] : undefined
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => cx('app-sidebar__link', isActive && 'is-active')}
                  >
                    {item.label}
                    {total > 0 && (
                      <>
                        {' '}
                        <Badge className="app-sidebar__badge">{total}</Badge>
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="app-sidebar__account">
          <Link to={ROUTES.miCuenta} className="app-sidebar__account-action">
            Mi cuenta
          </Link>
          <LogoutButton className="app-sidebar__account-action" />
        </div>
      </div>
    </>
  )
}
