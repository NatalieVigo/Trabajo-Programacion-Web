import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { LANDING_SECTIONS, ROUTES, landingSectionPath } from '../../routes/routePaths.js'
import { Button } from '../../shared/components'
import { cx } from '../../utils/classNames.js'
import HeroIllustration from './HeroIllustration.jsx'
import { DESTACADOS } from './landingContent.js'
import './LandingPage.css'

// Landing pública. Los enlaces de la cabecera saltan a los recuadros de abajo.
export default function LandingPage() {
  useDocumentTitle('Inicio')
  const { usuario } = useAuth()
  // solo el usuario va directo al formulario, los demás pasan por el login
  const registrarTicket = usuario?.rol === 'usuario' ? ROUTES.usuarioNuevoTicket : ROUTES.iniciarSesion

  return (
    <div className="container page landing">
      <section className="landing-hero" aria-labelledby="landing-titulo">
        <div className="landing-hero__content">
          <p className="landing-hero__eyebrow">Infraestructura y servicios del campus</p>
          <h1 id="landing-titulo" className="landing-hero__title">
            Reporta una falla del campus y sigue su atención en un solo lugar
          </h1>
          <p className="landing-hero__lead">
            Proyectores, aire acondicionado, red, mobiliario, electricidad, limpieza y accesos. Registra el ticket con
            el ambiente y la categoría; el supervisor lo prioriza y lo asigna a un técnico el mismo día.
          </p>
          <div className="landing-hero__actions">
            <Button to={registrarTicket}>Registrar un ticket</Button>
            <Button to={landingSectionPath(LANDING_SECTIONS.comoReportar)} variant="secondary">
              Ver cómo reportar
            </Button>
          </div>
        </div>
        <HeroIllustration className="landing-hero__art" />
      </section>

      <ul id={LANDING_SECTIONS.comoReportar} className="highlights" aria-label="Cómo reportar" tabIndex={-1}>
        {DESTACADOS.map((destacado) => (
          <li
            key={destacado.titulo}
            id={destacado.seccion}
            className={cx('highlight', destacado.resaltado && 'highlight--emphasis')}
            tabIndex={destacado.seccion ? -1 : undefined}
          >
            <h2 className="highlight__title">{destacado.titulo}</h2>
            <p className="highlight__text">{destacado.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
