import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ticketAtencionPath } from '../../routes/routePaths.js'
import { asignarTickets, cambiarPrioridadTickets, listarCola } from '../../services/cola.service.js'
import { Alert, Button, Card, EmptyState, PageHeader, PriorityBadge, SearchIcon, SelectInput, StatusBadge, TextInput, useToast } from '../../shared/components'
import { formatEstado, formatPrioridad, pluralize } from '../../utils/format.js'
import AsignarTecnicoModal from './AsignarTecnicoModal.jsx'
import CambiarPrioridadModal from './CambiarPrioridadModal.jsx'
import { ESTADOS, FILTROS_COLA, PRIORIDADES, filtrarCola, resumirCola } from './colaList.js'
import './ColaPage.css'

const DURACION = [
  [86_400_000, 'd'], [3_600_000, 'h'], [60_000, 'min'],
]

function antiguedad(ms) {
  for (const [limite, unidad] of DURACION) {
    if (ms >= limite) return `${Math.floor(ms / limite)} ${unidad} ${unidad === 'h' ? `${Math.floor(ms % limite / 60_000)} min` : ''}`.trim()
  }
  return 'Menos de 1 min'
}

function SelectorMultiple({ titulo, valores, opciones, etiqueta, onChange }) {
  const resumen = valores.length ? valores.map((valor) => etiqueta(valor).toLowerCase()).join(', ') : 'todos'
  return (
    <details className="cola-filtros__multiple">
      <summary>{titulo}: {resumen}{valores.length > 0 && ' ×'}</summary>
      <fieldset className="cola-filtros__opciones">
        <legend className="visually-hidden">Filtrar por {titulo.toLowerCase()}</legend>
        {opciones.map((valor) => (
          <label key={valor}>
            <input type="checkbox" checked={valores.includes(valor)} onChange={() => onChange(valores.includes(valor) ? valores.filter((v) => v !== valor) : [...valores, valor])} />
            {etiqueta(valor)}
          </label>
        ))}
        <Button variant="tertiary" size="sm" onClick={() => onChange([])}>Todas</Button>
      </fieldset>
    </details>
  )
}

function ResumenEstados({ resumen, filtros, onChange }) {
  const items = [
    ['abierto', 'Abiertos', resumen.abiertos],
    ['en_atencion', 'En atención', resumen.enAtencion],
    ['en_espera', 'En espera', resumen.enEspera],
    ['resuelto', 'Resueltos hoy', resumen.resueltosHoy],
  ]
  return (
    <div className="cola-resumen" aria-label="Resumen por estado">
      {items.map(([estado, titulo, total]) => (
        <button key={estado} type="button" className={`cola-resumen__chip cola-resumen__chip--${estado} ${filtros.estados.length === (estado === 'abierto' ? 2 : 1) && filtros.estados.includes(estado) && (estado !== 'abierto' || filtros.estados.includes('reabierto')) && (estado !== 'resuelto' || filtros.soloResueltosHoy) ? 'is-active' : ''}`} onClick={() => {
          const estados = estado === 'abierto' ? ['abierto', 'reabierto'] : [estado]
          const activo = filtros.estados.length === estados.length && estados.every((valor) => filtros.estados.includes(valor)) && (estado !== 'resuelto' || filtros.soloResueltosHoy)
          onChange({ ...filtros, estados: activo ? [] : estados, soloResueltosHoy: !activo && estado === 'resuelto' })
        }}>
          {titulo} {total}
        </button>
      ))}
    </div>
  )
}

function TablaCola({ tickets, onAsignar, onPrioridad }) {
  return (
    <div className="cola-tabla__scroll">
      <table className="cola-tabla" aria-label="Tickets de la cola de atención">
        <thead><tr>
          <th scope="col">Código</th><th scope="col">Asunto</th><th scope="col">Categoría</th><th scope="col">Ambiente</th><th scope="col">Solicitante</th><th scope="col">Antigüedad</th><th scope="col">Prioridad</th><th scope="col">Estado</th><th scope="col">Técnico</th>
        </tr></thead>
        <tbody>{tickets.map((ticket) => (
          <tr key={ticket.id} className={`cola-tabla__fila cola-tabla__fila--${ticket.prioridad}`}>
            <th scope="row"><Link className="cola-tabla__codigo" to={ticketAtencionPath('supervisor', ticket.codigo)}>{ticket.codigo}</Link></th>
            <td className="cola-tabla__asunto">{ticket.asunto}</td>
            <td className="cola-tabla__categoria">{ticket.categoria}{ticket.subcategoria && <> · {ticket.subcategoria}</>}</td>
            <td className="text-mono">{ticket.ambiente}</td>
            <td>{ticket.solicitante}</td>
            <td>{antiguedad(ticket.antiguedadMs)}</td>
            <td><PriorityBadge prioridad={ticket.prioridad} /> <Button variant="tertiary" size="sm" onClick={() => onPrioridad(ticket.id)}>Cambiar prioridad</Button></td>
            <td><StatusBadge estado={ticket.estado} /></td>
            <td>{ticket.tecnico ?? <Button variant="tertiary" size="sm" onClick={() => onAsignar(ticket.id)} aria-label={`Asignar ${ticket.codigo}`}>Sin asignar</Button>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function ColaPage() {
  const { usuario } = useAuth()
  const cargar = useCallback(() => listarCola(usuario.id), [usuario.id])
  const { status, data, reload } = useAsyncData(cargar)
  const toast = useToast()
  const [filtros, setFiltros] = useState(FILTROS_COLA)
  const [ticketAsignar, setTicketAsignar] = useState(null)
  const [ticketPrioridad, setTicketPrioridad] = useState(null)
  useDocumentTitle('Cola de atención')

  const tickets = data?.tickets ?? []
  const resumen = resumirCola(tickets)
  const visibles = filtrarCola(tickets, filtros)
  const elegidos = tickets.filter(({ id }) => id === ticketAsignar)
  const prioridadElegida = tickets.filter(({ id }) => id === ticketPrioridad)
  const activos = filtros.busqueda || filtros.prioridades.length || filtros.estados.length || filtros.soloResueltosHoy || filtros.categoriaId || filtros.ambienteId

  return (
    <div className="cola-page">
      <PageHeader title="Cola de atención" subtitle={status === 'success' ? `${resumen.total} tickets en cola · ${resumen.sinAsignar} sin asignar · ${resumen.fueraDePlazo} fuera del tiempo esperado` : undefined} actions={status === 'success' && <ResumenEstados resumen={resumen} filtros={filtros} onChange={setFiltros} />} />
      {status === 'loading' && <Card aria-busy="true">Cargando la cola de atención…</Card>}
      {status === 'error' && <Alert variant="error" actions={<Button variant="secondary" onClick={reload}>Reintentar</Button>}>No pudimos cargar la cola de atención.</Alert>}
      {status === 'success' && <>
        <div className="cola-filtros">
          <label className="cola-filtros__busqueda"><span className="visually-hidden">Buscar código o asunto</span><TextInput type="search" placeholder="Buscar código o asunto" value={filtros.busqueda} onChange={(event) => setFiltros({ ...filtros, busqueda: event.target.value })} /></label>
          <SelectorMultiple titulo="Prioridad" valores={filtros.prioridades} opciones={PRIORIDADES} etiqueta={formatPrioridad} onChange={(prioridades) => setFiltros({ ...filtros, prioridades })} />
          <SelectorMultiple titulo="Estado" valores={filtros.estados} opciones={ESTADOS} etiqueta={formatEstado} onChange={(estados) => setFiltros({ ...filtros, estados, soloResueltosHoy: false })} />
          <label className="cola-filtros__select"><span className="visually-hidden">Categoría</span><SelectInput value={filtros.categoriaId} onChange={(event) => setFiltros({ ...filtros, categoriaId: event.target.value })} placeholder="Categoría: todas" options={data.categorias.map(({ id, nombre }) => ({ value: id, label: nombre }))} /></label>
          <label className="cola-filtros__select"><span className="visually-hidden">Ambiente</span><SelectInput value={filtros.ambienteId} onChange={(event) => setFiltros({ ...filtros, ambienteId: event.target.value })} placeholder="Ambiente: todos" options={data.ambientes.map(({ id, nombre }) => ({ value: id, label: nombre }))} /></label>
          {activos && <Button variant="tertiary" size="sm" onClick={() => setFiltros(FILTROS_COLA)}>Limpiar filtros</Button>}
          <label className="cola-filtros__orden"><span className="visually-hidden">Orden de la cola</span><SelectInput value={filtros.orden} onChange={(event) => setFiltros({ ...filtros, orden: event.target.value })} options={[{ value: 'antiguedad', label: 'Orden: antigüedad' }, { value: 'prioridad', label: 'Orden: prioridad' }, { value: 'recientes', label: 'Orden: recientes' }]} /></label>
        </div>
        {visibles.length ? <TablaCola tickets={visibles} onAsignar={setTicketAsignar} onPrioridad={setTicketPrioridad} /> : <Card><EmptyState icon={<SearchIcon size={24} />} title={tickets.length ? 'No hay tickets con estos filtros' : 'No hay tickets en la cola'} description={tickets.length ? 'La cola está al día para los filtros seleccionados.' : 'Los tickets nuevos aparecerán aquí.'} action={tickets.length ? <Button onClick={() => setFiltros(FILTROS_COLA)}>Quitar filtros</Button> : undefined} /></Card>}
      </>}
      {ticketAsignar && <AsignarTecnicoModal tickets={elegidos} tecnicos={data.tecnicos} onClose={() => setTicketAsignar(null)} onAsignar={async (tecnicoId, nota) => {
        const total = await asignarTickets([ticketAsignar], tecnicoId, nota, usuario.id)
        setTicketAsignar(null)
        reload()
        toast.success(`${pluralize(total, 'ticket', 'tickets')} asignado correctamente.`)
      }} />}
      {ticketPrioridad && <CambiarPrioridadModal tickets={prioridadElegida} onClose={() => setTicketPrioridad(null)} onGuardar={async (prioridad, motivo) => {
        await cambiarPrioridadTickets([ticketPrioridad], prioridad, motivo, usuario.id)
        setTicketPrioridad(null)
        reload()
        toast.success('Ticket con prioridad actualizada.')
      }} />}
    </div>
  )
}
