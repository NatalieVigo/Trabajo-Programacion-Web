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
/** Estados con los que la atención ya terminó: los demás siguen en «Mi bandeja». */
const TERMINADOS = new Set(['resuelto', 'cerrado'])

/** Columna «Plazo» con los textos de p24: «Cerrado el 04/09/2026» o «Atendido a tiempo». */
function plazoDe(ticket) {
  if (ticket.estado === 'cerrado') return `Cerrado el ${formatDate(ticket.cerradoEn)}`
  return ticket.dentroDelPlazo ? 'Atendido a tiempo' : 'Atendido fuera de plazo'
}

/** Los tickets en filas compactas, con las mismas columnas de la bandeja (p24) y la barra de su prioridad. */
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
                <td data-label="Categoría">{ticket.categoria.nombre}</td>
                <td data-label="Ambiente" className="text-mono">
                  {ticket.ambiente.codigo}
                </td>
                <td data-label="Solicitante">{getDisplayName(ticket.solicitante)}</td>
                <td data-label="Prioridad">
                  <PriorityBadge prioridad={ticket.prioridad} />
                </td>
                <td data-label="Estado">
                  <StatusBadge estado={ticket.estado} />
                </td>
                <td data-label="Plazo">{plazoDe(ticket)}</td>
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

/** Carga, error o historial vacío; con tickets muestra la tabla. */
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

/**
 * «Historial» del técnico (/tecnico/historial, ítem del menú de p24, p25 y p27): los tickets que resolvió o cerró, del
 * de actividad más reciente al más antiguo, con las columnas de la bandeja (p24). Cada fila lleva a la vista
 * consolidada del ticket (p25).
 */
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
