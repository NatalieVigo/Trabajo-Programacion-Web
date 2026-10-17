import { useId } from 'react'
import { Card } from '../../shared/components'
import { TIPOS_AMBIENTE } from '../../utils/catalogoValidators.js'
import { formatDate, pluralize } from '../../utils/format.js'

function ubicacionDe(ambiente) {
  return [
    TIPOS_AMBIENTE[ambiente.tipo] ?? ambiente.tipo,
    ambiente.pabellon && `Pabellón ${ambiente.pabellon}`,
    `piso ${ambiente.piso}`,
    `capacidad ${ambiente.capacidad}`,
    ambiente.sede,
  ]
    .filter(Boolean)
    .join(' · ')
}

// Ambiente del ticket, con los tickets abiertos ahí y el último cierre.
export default function AmbienteDelTicket({ ambiente }) {
  const tituloId = useId()

  return (
    <Card as="section" className="ticket-dato-card" aria-labelledby={tituloId}>
      <h2 id={tituloId} className="ticket-dato-card__titulo">
        Ambiente
      </h2>
      <p className="ticket-ambiente__codigo">{ambiente.codigo}</p>
      <p className="ticket-dato-card__nota">{ubicacionDe(ambiente)}</p>
      <p className="ticket-dato-card__nota">
        {pluralize(ambiente.ticketsEnCurso, 'ticket abierto', 'tickets abiertos')} en este ambiente ·{' '}
        {ambiente.ultimoCierre ? `último cierre ${formatDate(ambiente.ultimoCierre)}` : 'sin cierres anteriores'}
      </p>
    </Card>
  )
}
