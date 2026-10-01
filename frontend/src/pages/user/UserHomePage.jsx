import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { obtenerContadores } from '../../services/resumen.service.js'
import { PageHeader } from '../../shared/components'
import { getFirstName } from '../../utils/format.js'
import UserSummary from './UserSummary.jsx'
import './UserHomePage.css'

const ACCESOS = [
  {
    label: 'Nuevo ticket',
    to: ROUTES.usuarioNuevoTicket,
    texto: 'Reporta una falla indicando la categoría y el ambiente afectado.',
  },
  {
    label: 'Mis tickets',
    to: ROUTES.usuarioTickets,
    texto: 'Revisa el estado de tus reportes y la atención que reciben.',
  },
]

/** Vista principal del usuario («Inicio», /usuario): bienvenida, resumen de sus tickets y encuestas y accesos rápidos. */
export default function UserHomePage() {
  const { usuario } = useAuth()
  const cargarResumen = useCallback(() => obtenerContadores(usuario), [usuario])
  const resumen = useAsyncData(cargarResumen)
  useDocumentTitle('Inicio')

  return (
    <div className="user-home">
      <PageHeader
        title="Inicio"
        subtitle={`Te damos la bienvenida, ${getFirstName(usuario.nombres)}. Desde aquí reportas fallas del campus y sigues su atención.`}
      />

      <section className="user-home__section" aria-labelledby="resumen-titulo" aria-busy={resumen.status === 'loading'}>
        <h2 id="resumen-titulo" className="user-home__title">
          Tu resumen
        </h2>
        <UserSummary {...resumen} />
      </section>

      <section className="user-home__section" aria-labelledby="accesos-titulo">
        <h2 id="accesos-titulo" className="user-home__title">
          Accesos rápidos
        </h2>
        <ul className="quick-links">
          {ACCESOS.map((acceso) => (
            <li key={acceso.to} className="quick-link">
              <Link to={acceso.to} className="quick-link__title">
                {acceso.label}
              </Link>
              <p className="quick-link__text">{acceso.texto}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
