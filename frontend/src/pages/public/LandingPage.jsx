import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { LANDING_SECTIONS, ROUTES, landingSectionPath } from '../../routes/routePaths.js'
import { Button, PriorityBadge } from '../../shared/components'
import { cx } from '../../utils/classNames.js'
import CategoriasSection from './CategoriasSection.jsx'
import HeroIllustration from './HeroIllustration.jsx'
import { DESTACADOS, PASOS, TIEMPOS_ATENCION } from './landingContent.js'
import './LandingPage.css'

/** 1.1 Landing pública (p03). */
export default function LandingPage() {
  useDocumentTitle('Inicio')

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
            <Button to={ROUTES.iniciarSesion}>Registrar un ticket</Button>
            <Button to={landingSectionPath(LANDING_SECTIONS.comoReportar)} variant="secondary">
              Ver cómo reportar
            </Button>
          </div>
        </div>
        <HeroIllustration className="landing-hero__art" />
      </section>

      <ul className="highlights" aria-label="Lo esencial del servicio">
        {DESTACADOS.map((destacado) => (
          <li key={destacado.titulo} className={cx('highlight', destacado.resaltado && 'highlight--emphasis')}>
            <h2 className="highlight__title">{destacado.titulo}</h2>
            <p className="highlight__text">{destacado.texto}</p>
          </li>
        ))}
      </ul>

      <section
        id={LANDING_SECTIONS.comoReportar}
        className="landing-section"
        aria-labelledby="como-reportar-titulo"
        tabIndex={-1}
      >
        <div className="landing-section__header">
          <h2 id="como-reportar-titulo" className="landing-section__title">
            Cómo reportar una falla
          </h2>
          <p className="landing-section__subtitle">
            Así avanza un ticket desde que detectas el problema hasta que se resuelve.
          </p>
        </div>
        <ol className="steps">
          {PASOS.map((paso, index) => (
            <li key={paso.titulo} className="step">
              <span className="step__number" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="step__title">{paso.titulo}</h3>
              <p className="step__text">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <CategoriasSection />

      <section
        id={LANDING_SECTIONS.tiempos}
        className="landing-section"
        aria-labelledby="tiempos-titulo"
        tabIndex={-1}
      >
        <div className="landing-section__header">
          <h2 id="tiempos-titulo" className="landing-section__title">
            Tiempos de atención esperados
          </h2>
          <p className="landing-section__subtitle">
            El supervisor confirma la prioridad de cada ticket; el plazo se cuenta desde su registro.
          </p>
        </div>
        <div className="times-table__wrapper">
          <table className="times-table">
            <thead>
              <tr>
                <th scope="col">Prioridad</th>
                <th scope="col">Cuándo se aplica</th>
                <th scope="col">Tiempo esperado</th>
              </tr>
            </thead>
            <tbody>
              {TIEMPOS_ATENCION.map((tiempo) => (
                <tr key={tiempo.prioridad} className={`times-table__row times-table__row--${tiempo.prioridad}`}>
                  <th scope="row">
                    <PriorityBadge prioridad={tiempo.prioridad} />
                  </th>
                  <td>{tiempo.criterio}</td>
                  <td className="times-table__hours">{tiempo.horas} h hábiles</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="landing-section__note">
          Las horas hábiles corren de lunes a sábado, de 07:00 a 21:00. Ante fugas de agua o riesgo eléctrico llama
          primero al anexo 30111.
        </p>
      </section>
    </div>
  )
}
