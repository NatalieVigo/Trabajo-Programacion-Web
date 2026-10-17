import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { LANDING_SECTIONS, ROUTES, landingSectionPath } from '../routes/routePaths.js'
import './PublicFooter.css'

/** Con una cuenta de usuario abierta, «Registrar» y «Seguir» llevan directo a su vista; si no, pasan por el acceso. */
const enlacesDeReporte = (conCuentaDeUsuario) => ({
  id: 'pie-reportar',
  title: 'Reportar',
  links: [
    { label: 'Registrar un ticket', to: conCuentaDeUsuario ? ROUTES.usuarioNuevoTicket : ROUTES.iniciarSesion },
    { label: 'Seguir un ticket', to: conCuentaDeUsuario ? ROUTES.usuarioTickets : ROUTES.iniciarSesion },
    { label: 'Categorías de servicio', to: landingSectionPath(LANDING_SECTIONS.categorias) },
  ],
})

const SECCION_AYUDA = {
  id: 'pie-ayuda',
  title: 'Ayuda',
  links: [
    { label: 'Preguntas frecuentes', to: landingSectionPath(LANDING_SECTIONS.comoReportar) },
    { label: 'Tiempos de atención esperados', to: landingSectionPath(LANDING_SECTIONS.tiempos) },
    { label: 'Emergencias eléctricas · anexo 30111' },
  ],
}

/** Pie institucional (p03). */
export default function PublicFooter() {
  const { usuario } = useAuth()
  const secciones = [enlacesDeReporte(usuario?.rol === 'usuario'), SECCION_AYUDA]

  return (
    <footer className="public-footer">
      <div className="container public-footer__top">
        <div className="public-footer__about">
          <p className="public-footer__brand">Mesa de Ayuda de Servicios</p>
          <p>Universidad de Lima · Dirección de Infraestructura y Servicios</p>
          <p>
            <a href="mailto:soporte.campus@ulima.edu.pe">soporte.campus@ulima.edu.pe</a> · anexo 30500
          </p>
          <p>Atención de lunes a sábado, 07:00 a 21:00</p>
        </div>

        {secciones.map((section) => (
          <nav key={section.id} className="public-footer__nav" aria-labelledby={section.id}>
            <h2 id={section.id} className="public-footer__heading">
              {section.title}
            </h2>
            <ul>
              {section.links.map((link) => (
                <li key={link.label}>{link.to ? <Link to={link.to}>{link.label}</Link> : link.label}</li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="container public-footer__bottom">
        <p className="public-footer__legal">
          © 2026 Universidad de Lima
          <br />
          Términos · Privacidad
        </p>
      </div>
    </footer>
  )
}
