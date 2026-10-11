import { useCallback, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ticketAtencionPath, ticketHistorialPath } from '../../routes/routePaths.js'
import { listarAtendidos } from '../../services/atencion.service.js'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PriorityBadge,
  SearchIcon,
  SelectInput,
  StatusBadge,
  TextInput,
} from '../../shared/components'
import { formatDateTime, formatEstado, getDisplayName, pluralize } from '../../utils/format.js'
import { HISTORIAL_SIN_FILTROS, contarPorEstado, filtrarAtendidos } from './historialAtencion.js'
import './HistorialAtencionPage.css'

const TITULO = 'Historial'

/** «8 tickets a tu cargo · 3 sin cerrar». */
function resumir(tickets) {
  const sinCerrar = tickets.filter((ticket) => ticket.estado !== 'cerrado').length
  return `${pluralize(tickets.length, 'ticket', 'tickets')} a tu cargo · ${sinCerrar} sin cerrar`
}

/** Búsqueda por código o asunto y filtro por estado, con los estados en los que el técnico tiene tickets. */
function Filtros({ filtros, estados, onChange }) {
  const id = useId()
  const opciones = estados.map(({ estado, total }) => ({ value: estado, label: `${formatEstado(estado)} (${total})` }))

  return (
    <div className="historial-filtros">
      <div className="historial-filtros__busqueda">
        <label htmlFor={`${id}-busqueda`} className="visually-hidden">
          Buscar por código o asunto
        </label>
        <TextInput
          id={`${id}-busqueda`}
          type="search"
          value={filtros.busqueda}
          onChange={(event) => onChange({ ...filtros, busqueda: event.target.value })}
          placeholder="Buscar por código o asunto"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="historial-filtros__estado">
        <label htmlFor={`${id}-estado`} className="visually-hidden">
          Estado
        </label>
        <SelectInput
          id={`${id}-estado`}
          value={filtros.estado}
          onChange={(event) => onChange({ ...filtros, estado: event.target.value })}
          options={opciones}
          placeholder="Estado: todos"
        />
      </div>
    </div>
  )
}

/**
 * Los tickets en filas compactas (p24), con la barra de su prioridad y los accesos a su bitácora y a su historial. La
 * categoría va bajo el asunto para que la fila completa quepa en el ancho del contenido.
 */
function TablaDeTickets({ tickets }) {
  return (
    <div className="tickets-table">
      <div className="tickets-table__scroll">
        <table aria-label="Tickets a tu cargo">
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Asunto y categoría</th>
              <th scope="col">Ambiente</th>
              <th scope="col">Solicitante</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Estado</th>
              <th scope="col">Última actividad</th>
              <th scope="col">Acciones</th>
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
                <td data-label="Asunto y categoría" className="tickets-table__asunto">
                  <p>{ticket.asunto}</p>
                  <p className="tickets-table__categoria">{ticket.categoria.nombre}</p>
                </td>
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
                <td data-label="Última actividad">
                  <time dateTime={ticket.actualizadoEn}>{formatDateTime(ticket.actualizadoEn)}</time>
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
                  <Button
                    variant="tertiary"
                    size="sm"
                    to={ticketHistorialPath('tecnico', ticket.codigo)}
                    aria-label={`Historial de ${ticket.codigo}`}
                  >
                    Historial
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

/** Carga, error o historial vacío; con tickets muestra `children`. */
function Contenido({ status, total, onRetry, children }) {
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
  if (total === 0) {
    return (
      <Card>
        <EmptyState
          title="Aún no tienes tickets a tu cargo"
          description="Cuando el supervisor te asigne un ticket aparecerá aquí, con su bitácora y su historial."
        />
      </Card>
    )
  }
  return children
}

/**
 * «Historial» del técnico (/tecnico/historial, HU-5 · 5.6): todos los tickets que tiene o tuvo a su cargo, del de
 * actividad más reciente al más antiguo, con búsqueda por código o asunto y filtro por estado. Cada fila lleva a la
 * vista consolidada del ticket y a su historial de cambios.
 */
export default function HistorialAtencionPage() {
  const { usuario } = useAuth()
  const cargar = useCallback(() => listarAtendidos(usuario.id), [usuario.id])
  const { status, data, reload } = useAsyncData(cargar)
  const [filtros, setFiltros] = useState(HISTORIAL_SIN_FILTROS)
  useDocumentTitle(TITULO)

  const tickets = data ?? []
  const visibles = filtrarAtendidos(tickets, filtros)

  return (
    <>
      <PageHeader title={TITULO} subtitle={status === 'success' && tickets.length > 0 ? resumir(tickets) : undefined} />
      <Contenido status={status} total={tickets.length} onRetry={reload}>
        <Filtros filtros={filtros} estados={contarPorEstado(tickets)} onChange={setFiltros} />
        {visibles.length > 0 ? (
          <TablaDeTickets tickets={visibles} />
        ) : (
          <Card>
            <EmptyState
              icon={<SearchIcon size={24} />}
              title="Ningún ticket coincide con la búsqueda"
              description="Prueba con otro código, otro asunto u otro estado."
              action={
                <Button variant="secondary" onClick={() => setFiltros(HISTORIAL_SIN_FILTROS)}>
                  Ver todos los tickets
                </Button>
              }
            />
          </Card>
        )}
        {/* Fuera de la tabla, para anunciar también cuando ningún ticket coincide. */}
        <p className="historial-conteo" role="status">
          Mostrando {visibles.length} de {pluralize(tickets.length, 'ticket', 'tickets')}
        </p>
      </Contenido>
    </>
  )
}
