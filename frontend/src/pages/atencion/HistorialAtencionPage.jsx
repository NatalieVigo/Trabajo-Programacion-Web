import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ticketAtencionPath } from '../../routes/routePaths.js'
import { listarAtendidos } from '../../services/atencion.service.js'
import { Alert, Button, Card, EmptyState, PageHeader, PriorityBadge, StatusBadge } from '../../shared/components'
import { formatDate, getDisplayName } from '../../utils/format.js'
import './HistorialAtencionPage.css'

const TITULO = 'Historial'
// los demás estados siguen en "Mi bandeja"
const TERMINADOS = new Set(['resuelto', 'cerrado'])

function plazoDe(ticket) {
  if (ticket.estado === 'cerrado') return `Cerrado el ${formatDate(ticket.cerradoEn)}`
  return ticket.dentroDelPlazo ? 'Atendido a tiempo' : 'Atendido fuera de plazo'
}

function TablaDeTickets({ tickets }) {
  return (
    <div className="tickets-table">
      <div className="tickets-table__scroll">
        <table aria-label="Tickets resueltos y cerrados">
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Asunto</th>
              <th scope="col">Categoría</th>
              <th scope="col">Ambiente</th>
              <th scope="col">Solicitante</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Estado</th>
              <th scope="col">Plazo</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className={`tickets-table__fila tickets-table__fila--${ticket.prioridad}`}>
                <th scope="row">
                  <Link to={ticketAtencionPath('tecnico', ticket.codigo)} className="tickets-table__codigo">
                    {ticket.codigo}
                  </Link>
                </th>
                <td data-label="Asunto" className="tickets-table__asunto">
                  {ticket.asunto}
                </td>
                <td data-label="Categoría" className="tickets-table__ajustable">
                  {ticket.categoria.nombre}
                </td>
                <td data-label="Ambiente" className="text-mono">
                  {ticket.ambiente.codigo}
                </td>
                <td data-label="Solicitante" className="tickets-table__ajustable">
                  {getDisplayName(ticket.solicitante)}
                </td>
                <td data-label="Prioridad">
                  <PriorityBadge prioridad={ticket.prioridad} />
                </td>
                <td data-label="Estado">
                  <StatusBadge estado={ticket.estado} />
                </td>
                <td data-label="Plazo" className="tickets-table__ajustable">
                  {plazoDe(ticket)}
                </td>
                <td className="tickets-table__acciones">
                  <Button
                    variant="tertiary"
                    size="sm"
                    to={ticketAtencionPath('tecnico', ticket.codigo)}
                    aria-label={`Abrir bitácora de ${ticket.codigo}`}
                  >
                    Abrir bitácora
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Contenido({ status, tickets, onRetry }) {
  if (status === 'loading') {
    return (
      <Card aria-busy="true">
        <p role="status" className="text-muted">
          Cargando tu historial…
        </p>
      </Card>
    )
  }
  if (status === 'error') {
    return (
      <Alert
        variant="error"
        actions={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar tu historial de atención.
      </Alert>
    )
  }
  if (tickets.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Aún no tienes tickets resueltos"
          description="Cuando resuelvas o cierres un ticket aparecerá aquí."
        />
      </Card>
    )
  }
  return <TablaDeTickets tickets={tickets} />
}

// Historial del técnico: los tickets que ya resolvió o cerró, lo más reciente primero.
export default function HistorialAtencionPage() {
  const { usuario } = useAuth()
  const cargar = useCallback(() => listarAtendidos(usuario.id), [usuario.id])
  const { status, data, reload } = useAsyncData(cargar)
  useDocumentTitle(TITULO)

  const terminados = (data ?? []).filter((ticket) => TERMINADOS.has(ticket.estado))

  return (
    <>
      <PageHeader title={TITULO} />
      <Contenido status={status} tickets={terminados} onRetry={reload} />
    </>
  )
}
