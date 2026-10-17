import EmptyState from '../EmptyState/EmptyState.jsx'
import { ClockIcon } from '../icons.jsx'

// para secciones que todavía hace otro integrante del equipo
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
