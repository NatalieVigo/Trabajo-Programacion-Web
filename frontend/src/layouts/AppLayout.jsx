import { useCallback, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useContadores } from '../hooks/useContadores.js'
import { useScrollToHash } from '../hooks/useScrollToHash.js'
import AppFooter from './AppFooter.jsx'
import AppHeader from './AppHeader.jsx'
import Sidebar from './Sidebar.jsx'
import './AppLayout.css'

const MENU_ID = 'menu-lateral'

export default function AppLayout() {
  const { usuario } = useAuth()
  const location = useLocation()
  const contadores = useContadores(usuario)
  const menuButtonRef = useRef(null)
  // se guarda dónde se abrió el menú, así al navegar se cierra solo
  const [menuAbiertoEn, setMenuAbiertoEn] = useState(null)
  const menuOpen = menuAbiertoEn === location.key
  useScrollToHash()

  const closeMenu = useCallback(({ restoreFocus = false } = {}) => {
    setMenuAbiertoEn(null)
    if (restoreFocus) menuButtonRef.current?.focus()
  }, [])

  function toggleMenu() {
    setMenuAbiertoEn(menuOpen ? null : location.key)
  }

  return (
    <div className="app-layout">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <AppHeader
        usuario={usuario}
        contadores={contadores}
        menuId={MENU_ID}
        menuOpen={menuOpen}
        onMenuToggle={toggleMenu}
        menuButtonRef={menuButtonRef}
      />
      <div className="app-layout__body">
        <Sidebar
          id={MENU_ID}
          rol={usuario.rol}
          contadores={contadores}
          open={menuOpen}
          onClose={closeMenu}
          menuButtonRef={menuButtonRef}
        />
        <div className="app-layout__column">
          <main id="contenido" className="app-layout__main" tabIndex={-1}>
            <Outlet />
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  )
}
