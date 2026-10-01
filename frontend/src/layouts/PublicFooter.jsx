import { Link } from 'react-router-dom'
import { LANDING_SECTIONS, ROUTES, landingSectionPath } from '../routes/routePaths.js'
import DemoResetButton from './DemoResetButton.jsx'
import './PublicFooter.css'

const FOOTER_SECTIONS = [
  {
    id: 'pie-reportar',
    title: 'Reportar',
    links: [
      { label: 'Registrar un ticket', to: ROUTES.iniciarSesion },
      { label: 'Seguir un ticket', to: ROUTES.iniciarSesion },
      { label: 'Categorías de servicio', to: landingSectionPath(LANDING_SECTIONS.categorias) },
    ],
  },
  {
    id: 'pie-ayuda',
    title: 'Ayuda',
    links: [
      { label: 'Preguntas frecuentes', to: landingSectionPath(LANDING_SECTIONS.comoReportar) },
      { label: 'Tiempos de atención esperados', to: landingSectionPath(LANDING_SECTIONS.tiempos) },
      { label: 'Emergencias eléctricas · anexo 30111' },
    ],
  },
]

/** Pie institucional (p03). En desarrollo incluye el botón para restablecer los datos de demostración. */
export default function PublicFooter() {
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

        {FOOTER_SECTIONS.map((section) => (
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
        {import.meta.env.DEV && <DemoResetButton />}
        <p className="public-footer__legal">
          © 2026 Universidad de Lima
          <br />
          Términos · Privacidad
        </p>
      </div>
    </footer>
  )
}
