import { Outlet } from 'react-router-dom'
import { useScrollToHash } from '../hooks/useScrollToHash.js'
import PublicFooter from './PublicFooter.jsx'
import PublicHeader from './PublicHeader.jsx'
import './PublicLayout.css'

/** Layout del visitante (p03–p09): cabecera pública, contenido y pie institucional. */
export default function PublicLayout() {
  useScrollToHash()

  return (
    <div className="public-layout">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <PublicHeader />
      <main id="contenido" className="public-layout__main" tabIndex={-1}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
