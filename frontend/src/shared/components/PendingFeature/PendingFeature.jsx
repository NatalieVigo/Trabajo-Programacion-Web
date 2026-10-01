import EmptyState from '../EmptyState/EmptyState.jsx'
import { ClockIcon } from '../icons.jsx'

/**
 * Cuerpo de una sección que aún no está disponible (SPEC §5): indica a qué historia corresponde y que la implementa
 * otro integrante del equipo. `action` suele llevar a la vista principal.
 */
export default function PendingFeature({ historia, nombre, action, titleAs, className }) {
  return (
    <EmptyState
      icon={<ClockIcon size={24} />}
      title="Sección en construcción"
      description={`Esta sección corresponde a la ${historia} (${nombre}) y la implementa otro integrante del equipo.`}
      action={action}
      titleAs={titleAs}
      className={className}
    />
  )
}
