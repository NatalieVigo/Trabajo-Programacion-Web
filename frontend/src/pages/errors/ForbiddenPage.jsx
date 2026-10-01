import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ROUTES } from '../../routes/routePaths.js'
import { Button, MessageCard } from '../../shared/components'
import { formatRol } from '../../utils/format.js'
import AccessRequestButton from './AccessRequestButton.jsx'
import './ForbiddenPage.css'

/** A dónde volver desde el 403: la vista con la que trabaja cada rol (p11: «Ir a mis tickets»). */
const VOLVER_A = {
  usuario: { texto: 'Ir a mis tickets', to: ROUTES.usuarioTickets },
  tecnico: { texto: 'Ir a mi bandeja', to: ROUTES.tecnicoBandeja },
  supervisor: { texto: 'Ir al tablero', to: ROUTES.supervisorTablero },
}

/** Lo que solo puede ver cada rol, para explicar la negativa (p11). */
const EXCLUSIVO_DE = {
  usuario: 'El registro de tickets, su seguimiento y las encuestas son exclusivos del usuario.',
  tecnico: 'La bandeja, la bitácora y el historial de atención son exclusivos del técnico.',
  supervisor: 'La cola, la asignación y el catálogo de servicios son exclusivos del supervisor.',
}

function explicacion(rol, rolesPermitidos) {
  const exclusivo = rolesPermitidos.length === 1 ? EXCLUSIVO_DE[rolesPermitidos[0]] : null
  return [
    `Tu cuenta tiene el rol de ${formatRol(rol).toLowerCase()}.`,
    exclusivo,
    'Si necesitas ese acceso, solicítalo a Infraestructura y Servicios.',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Acceso denegado (403, p11). RequireRole la muestra en lugar de una página que el rol no puede ver, con el `recurso`
 * que se intentó ver y los `rolesPermitidos`; en /acceso-denegado llega sin ellos y muestra un texto general.
 */
export default function ForbiddenPage({ recurso, rolesPermitidos = [] }) {
  const { usuario } = useAuth()
  const volver = VOLVER_A[usuario.rol]
  useDocumentTitle('Acceso denegado')

  return (
    <div className="forbidden-page">
      <MessageCard
        centered
        className="forbidden-page__card"
        badge={<p className="forbidden-page__code">403</p>}
        title={`No tienes permiso para ver ${recurso ?? 'esta página'}`}
        description={explicacion(usuario.rol, rolesPermitidos)}
        actions={
          <>
            <Button to={volver.to}>{volver.texto}</Button>
            {recurso && <AccessRequestButton recurso={recurso} />}
          </>
        }
      />
    </div>
  )
}
