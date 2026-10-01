import EmptyState from '../EmptyState/EmptyState.jsx'
import { ClockIcon } from '../icons.jsx'

/**
 * Cuerpo de una sección que aún no está disponible (SPEC §5): indica a qué historia corresponde. Con `propia` es una
 * etapa posterior de HU-1; si no, la implementa otro integrante del equipo. `action` suele llevar a la vista principal.
 */
export default function PendingFeature({ historia, nombre, propia = false, action, titleAs, className }) {
  const responsable = propia ? 'estará disponible en una próxima etapa' : 'la implementa otro integrante del equipo'

  return (
    <EmptyState
      icon={<ClockIcon size={24} />}
      title="Sección en construcción"
      description={`Esta sección corresponde a la ${historia} (${nombre}) y ${responsable}.`}
      action={action}
      titleAs={titleAs}
      className={className}
    />
  )
}
