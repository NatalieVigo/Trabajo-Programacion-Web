import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ticketAtencionPath } from '../../routes/routePaths.js'
import {
  asignarTickets,
  cambiarPrioridadTickets,
  devolverTickets,
  listarCola,
} from '../../services/cola.service.js'
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
  useConfirm,
  useToast,
} from '../../shared/components'
import { formatEstado, formatPrioridad, pluralize } from '../../utils/format.js'
import AsignarTecnicoModal from './AsignarTecnicoModal.jsx'
import CambiarPrioridadModal from './CambiarPrioridadModal.jsx'
import {
  ESTADOS,
  FILTROS_COLA,
  PRIORIDADES,
  filtrarCola,
  resumirCola,
} from './colaList.js'
import PaginacionCola from './PaginacionCola.jsx'
import './ColaPage.css'

const DURACION = [
  [86_400_000, 'd'],
  [3_600_000, 'h'],
  [60_000, 'min'],
]

function antiguedad(ms) {
  for (const [limite, unidad] of DURACION) {
    if (ms < limite) continue

    const cantidad = Math.floor(ms / limite)
    if (unidad !== 'h') return `${cantidad} ${unidad}`

    const minutos = Math.floor((ms % limite) / 60_000)
    return `${cantidad} h ${minutos} min`
  }
  return 'Menos de 1 min'
}

function SelectorMultiple({ titulo, valores, opciones, etiqueta, onChange }) {
  const resumen = valores.length
    ? valores.map((valor) => etiqueta(valor).toLowerCase()).join(', ')
    : 'todos'
  return (
    <details className="cola-filtros__multiple">
      <summary>
        {titulo}: {resumen}
        {valores.length > 0 && ' ×'}
      </summary>
      <fieldset className="cola-filtros__opciones">
        <legend className="visually-hidden">
          Filtrar por {titulo.toLowerCase()}
        </legend>
        {opciones.map((valor) => (
          <label key={valor}>
            <input
              type="checkbox"
              checked={valores.includes(valor)}
              onChange={() =>
                onChange(
                  valores.includes(valor)
                    ? valores.filter((v) => v !== valor)
                    : [...valores, valor],
                )
              }
            />
            {etiqueta(valor)}
          </label>
        ))}
        <Button variant="tertiary" size="sm" onClick={() => onChange([])}>
          Todas
        </Button>
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

  function estadosDelFiltro(estado) {
    if (estado === 'abierto') return ['abierto', 'reabierto']
    return [estado]
  }

  function estaActivo(estado) {
    const estados = estadosDelFiltro(estado)
    if (filtros.estados.length !== estados.length) return false
    if (!estados.every((valor) => filtros.estados.includes(valor))) return false
    if (estado === 'resuelto') return filtros.soloResueltosHoy
    return true
  }

  function cambiarEstado(estado) {
    const activo = estaActivo(estado)
    onChange({
      ...filtros,
      estados: activo ? [] : estadosDelFiltro(estado),
      soloResueltosHoy: !activo && estado === 'resuelto',
    })
  }

  return (
    <div className="cola-resumen" aria-label="Resumen por estado">
      {items.map(([estado, titulo, total]) => {
        const clases = [
          'cola-resumen__chip',
          `cola-resumen__chip--${estado}`,
          estaActivo(estado) ? 'is-active' : '',
        ].join(' ')

        return (
          <button
            key={estado}
            type="button"
            className={clases}
            onClick={() => cambiarEstado(estado)}
          >
            {titulo} {total}
          </button>
        )
      })}
    </div>
  )
}

function TablaCola({ tickets, seleccionados, onSeleccion, onAsignar }) {
  function claseDeFila(ticket) {
    const clases = ['cola-tabla__fila', `cola-tabla__fila--${ticket.prioridad}`]
    if (seleccionados.includes(ticket.id)) {
      clases.push('cola-tabla__fila--seleccionada')
    }
    return clases.join(' ')
  }

  const visibles = tickets.map(({ id }) => id)
  const todos =
    visibles.length > 0 && visibles.every((id) => seleccionados.includes(id))
  return (
    <div className="cola-tabla__scroll">
      <table className="cola-tabla" aria-label="Tickets de la cola de atención">
        <thead>
          <tr>
            <th scope="col">
              <input
                type="checkbox"
                aria-label="Seleccionar todos los tickets visibles"
                checked={todos}
                onChange={(event) =>
                  onSeleccion(
                    event.target.checked
                      ? [...new Set([...seleccionados, ...visibles])]
                      : seleccionados.filter((id) => !visibles.includes(id)),
                  )
                }
              />
            </th>
            <th scope="col">Código</th>
            <th scope="col">Asunto</th>
            <th scope="col">Categoría</th>
            <th scope="col">Ambiente</th>
            <th scope="col">Solicitante</th>
            <th scope="col">Antigüedad</th>
            <th scope="col">Prioridad</th>
            <th scope="col">Estado</th>
            <th scope="col">Técnico</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className={claseDeFila(ticket)}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${ticket.codigo}`}
                  checked={seleccionados.includes(ticket.id)}
                  onChange={(event) =>
                    onSeleccion(
                      event.target.checked
                        ? [...seleccionados, ticket.id]
                        : seleccionados.filter((id) => id !== ticket.id),
                    )
                  }
                />
              </td>
              <th scope="row">
                <Link
                  className="cola-tabla__codigo"
                  to={ticketAtencionPath('supervisor', ticket.codigo)}
                >
                  {ticket.codigo}
                </Link>
              </th>
              <td className="cola-tabla__asunto">{ticket.asunto}</td>
              <td className="cola-tabla__categoria">
                {ticket.categoria}
                {ticket.subcategoria && <> · {ticket.subcategoria}</>}
              </td>
              <td className="text-mono">{ticket.ambiente}</td>
              <td>{ticket.solicitante}</td>
              <td>{antiguedad(ticket.antiguedadMs)}</td>
              <td>
                <PriorityBadge prioridad={ticket.prioridad} />
              </td>
              <td>
                <StatusBadge estado={ticket.estado} />
              </td>
              <td>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => onAsignar(ticket.id)}
                  aria-label={`${ticket.tecnico ? 'Reasignar' : 'Asignar'} ${ticket.codigo}`}
                >
                  {ticket.tecnico ?? 'Sin asignar'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ColaPage() {
  const { usuario } = useAuth()
  const cargar = useCallback(() => listarCola(usuario.id), [usuario.id])
  const { status, data, reload } = useAsyncData(cargar)
  const toast = useToast()
  const confirm = useConfirm()
  const [filtros, setFiltros] = useState(FILTROS_COLA)
  const [pagina, setPagina] = useState(1)
  const [seleccionados, setSeleccionados] = useState([])
  const [dialogo, setDialogo] = useState(null)
  useDocumentTitle('Cola de atención')

  const tickets = data?.tickets ?? []
  const resumen = resumirCola(tickets)
  const visibles = filtrarCola(tickets, filtros)
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / 13))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * 13
  const ticketsPagina = visibles.slice(inicio, inicio + 13)
  function cambiarFiltros(siguientes) {
    setFiltros(siguientes)
    setPagina(1)
    setSeleccionados([])
  }
  const elegidos = tickets.filter(({ id }) => seleccionados.includes(id))
  const activos =
    filtros.busqueda ||
    filtros.prioridades.length ||
    filtros.estados.length ||
    filtros.soloResueltosHoy ||
    filtros.categoriaId ||
    filtros.ambienteId
  const subtitulo = [
    `${resumen.total} tickets en cola`,
    `${resumen.sinAsignar} sin asignar`,
    `${resumen.fueraDePlazo} fuera del tiempo esperado`,
  ].join(' · ')
  const cerrar = () => setDialogo(null)

  async function aplicar(accion, mensaje) {
    const total = await accion()
    cerrar()
    setSeleccionados([])
    reload()
    toast.success(`${pluralize(total, 'ticket', 'tickets')} ${mensaje(total)}.`)
  }

  async function devolver() {
    const ok = await confirm({
      title: `¿Devolver ${pluralize(elegidos.length, 'ticket', 'tickets')} a la cola?`,
      message:
        'Se quitará el técnico asignado y los tickets volverán al estado Abierto. ' +
        'La bitácora conserva el historial.',
      confirmText: 'Devolver a la cola',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await aplicar(
        () => devolverTickets(seleccionados, usuario.id),
        (total) => (total === 1 ? 'devuelto a la cola' : 'devueltos a la cola'),
      )
    } catch (error) {
      toast.error(error.message)
      reload()
    }
  }

  return (
    <div className="cola-page">
      <PageHeader
        title="Cola de atención"
        subtitle={status === 'success' ? subtitulo : undefined}
        actions={
          status === 'success' && (
            <ResumenEstados
              resumen={resumen}
              filtros={filtros}
              onChange={cambiarFiltros}
            />
          )
        }
      />
      {status === 'loading' && (
        <Card aria-busy="true">Cargando la cola de atención…</Card>
      )}
      {status === 'error' && (
        <Alert
          variant="error"
          actions={
            <Button variant="secondary" onClick={reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar la cola de atención.
        </Alert>
      )}
      {status === 'success' && (
        <>
          <div className="cola-filtros">
            <label className="cola-filtros__busqueda">
              <span className="visually-hidden">
                Buscar código, asunto o solicitante
              </span>
              <TextInput
                type="search"
                placeholder="Buscar código, asunto o solicitante"
                value={filtros.busqueda}
                onChange={(event) =>
                  cambiarFiltros({ ...filtros, busqueda: event.target.value })
                }
              />
            </label>
            <SelectorMultiple
              titulo="Prioridad"
              valores={filtros.prioridades}
              opciones={PRIORIDADES}
              etiqueta={formatPrioridad}
              onChange={(prioridades) =>
                cambiarFiltros({ ...filtros, prioridades })
              }
            />
            <SelectorMultiple
              titulo="Estado"
              valores={filtros.estados}
              opciones={ESTADOS}
              etiqueta={formatEstado}
              onChange={(estados) =>
                cambiarFiltros({ ...filtros, estados, soloResueltosHoy: false })
              }
            />
            <label className="cola-filtros__select">
              <span className="visually-hidden">Categoría</span>
              <SelectInput
                value={filtros.categoriaId}
                onChange={(event) =>
                  cambiarFiltros({
                    ...filtros,
                    categoriaId: event.target.value,
                  })
                }
                placeholder="Categoría: todas"
                options={data.categorias.map(({ id, nombre }) => ({
                  value: id,
                  label: nombre,
                }))}
              />
            </label>
            <label className="cola-filtros__select">
              <span className="visually-hidden">Ambiente</span>
              <SelectInput
                value={filtros.ambienteId}
                onChange={(event) =>
                  cambiarFiltros({ ...filtros, ambienteId: event.target.value })
                }
                placeholder="Ambiente: todos"
                options={data.ambientes.map(({ id, nombre }) => ({
                  value: id,
                  label: nombre,
                }))}
              />
            </label>
            {activos && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => cambiarFiltros(FILTROS_COLA)}
              >
                Limpiar filtros
              </Button>
            )}
            <label className="cola-filtros__orden">
              <span className="visually-hidden">Orden de la cola</span>
              <SelectInput
                value={filtros.orden}
                onChange={(event) =>
                  cambiarFiltros({ ...filtros, orden: event.target.value })
                }
                options={[
                  { value: 'antiguedad', label: 'Orden: antigüedad' },
                  { value: 'prioridad', label: 'Orden: prioridad' },
                  { value: 'recientes', label: 'Orden: recientes' },
                  { value: 'sin_atencion', label: 'Orden: sin atención' },
                ]}
              />
            </label>
          </div>
          {visibles.length ? (
            <TablaCola
              tickets={ticketsPagina}
              seleccionados={seleccionados}
              onSeleccion={setSeleccionados}
              onAsignar={(id) => {
                setSeleccionados([id])
                setDialogo('asignar')
              }}
            />
          ) : (
            <Card>
              <EmptyState
                icon={<SearchIcon size={24} />}
                title={
                  tickets.length
                    ? 'No hay tickets con estos filtros'
                    : 'No hay tickets en la cola'
                }
                description={
                  tickets.length
                    ? 'La cola está al día para los filtros seleccionados.'
                    : 'Los tickets nuevos aparecerán aquí.'
                }
                action={
                  tickets.length ? (
                    <Button onClick={() => cambiarFiltros(FILTROS_COLA)}>
                      Quitar filtros
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          )}
          <PaginacionCola
            pagina={paginaActual}
            total={visibles.length}
            porPagina={13}
            onPagina={(siguiente) => {
              setPagina(siguiente)
              setSeleccionados([])
            }}
          />
          {elegidos.length > 0 && (
            <div
              className="cola-lote"
              role="region"
              aria-label="Acciones en lote"
            >
              <strong>
                {pluralize(
                  elegidos.length,
                  'ticket seleccionado',
                  'tickets seleccionados',
                )}
              </strong>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDialogo('asignar')}
              >
                Asignar a técnico
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDialogo('prioridad')}
              >
                Cambiar prioridad
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={devolver}
                disabled={elegidos.some(({ tecnicoId }) => !tecnicoId)}
                title={
                  elegidos.some(({ tecnicoId }) => !tecnicoId)
                    ? 'Selecciona solo tickets que tengan un técnico asignado'
                    : undefined
                }
              >
                Devolver a la cola
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setSeleccionados([])}
              >
                Quitar selección
              </Button>
            </div>
          )}
        </>
      )}
      {dialogo === 'asignar' && (
        <AsignarTecnicoModal
          tickets={elegidos}
          tecnicos={data.tecnicos}
          onClose={cerrar}
          onAsignar={(tecnicoId, nota) =>
            aplicar(
              () => asignarTickets(seleccionados, tecnicoId, nota, usuario.id),
              (total) =>
                total === 1
                  ? 'asignado correctamente'
                  : 'asignados correctamente',
            )
          }
        />
      )}
      {dialogo === 'prioridad' && (
        <CambiarPrioridadModal
          tickets={elegidos}
          onClose={cerrar}
          onGuardar={(prioridad, motivo) =>
            aplicar(
              () =>
                cambiarPrioridadTickets(
                  seleccionados,
                  prioridad,
                  motivo,
                  usuario.id,
                ),
              () => 'con prioridad actualizada',
            )
          }
        />
      )}
    </div>
  )
}
