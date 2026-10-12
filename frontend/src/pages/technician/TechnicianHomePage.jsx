import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ticketAtencionPath } from '../../routes/routePaths.js'
import { listarBandeja } from '../../services/cola.service.js'
import { Alert, Button, Card, EmptyState, PageHeader, PriorityBadge, SelectInput, StatusBadge } from '../../shared/components'
import { formatDate, pluralize } from '../../utils/format.js'
import { formatDuracion } from '../../utils/duracion.js'
import { fechaEnLima, hoyEnLima } from '../../utils/fechaLima.js'
import { filtrarBandeja } from '../cola/colaList.js'
import './TechnicianHomePage.css'

const VISTAS = new Set(['todos', 'abiertos', 'criticos', 'fuera', 'hoy', 'en_atencion', 'en_espera', 'resueltos_hoy'])

function plazoDe(ticket) {
  if (ticket.estado === 'cerrado') return `Cerrado el ${formatDate(ticket.cerradoEn)}`
  if (ticket.estado === 'en_espera' && ticket.espera) return `Espera ${ticket.espera.motivo} · retorno ${formatDate(ticket.espera.retornoEstimado)}`
  if (ticket.estado === 'resuelto') return ticket.restanteMs >= 0 ? 'Atendido a tiempo' : 'Atendido fuera de plazo'
  if (ticket.restanteMs < 0) return `Vencido hace ${formatDuracion(-ticket.restanteMs)}`
  return `Vence en ${formatDuracion(ticket.restanteMs)}`
}

function ResumenEstados({ tickets, vistaActual, onVista }) {
  const hoy = hoyEnLima()
  const items = [
    ['abierto', 'Abiertos', tickets.filter(({ estado }) => estado === 'abierto' || estado === 'reabierto').length, 'abiertos'],
    ['en_atencion', 'En atención', tickets.filter(({ estado }) => estado === 'en_atencion').length, 'en_atencion'],
    ['en_espera', 'En espera', tickets.filter(({ estado }) => estado === 'en_espera').length, 'en_espera'],
    ['resuelto', 'Resueltos', tickets.filter(({ estado, resueltoEn }) => estado === 'resuelto' && resueltoEn && fechaEnLima(resueltoEn) === hoy).length, 'resueltos_hoy'],
  ]
  return <div className="bandeja-resumen">{items.map(([estado, texto, total, vista]) => <button type="button" key={estado} className={`bandeja-resumen__chip bandeja-resumen__chip--${estado} ${vistaActual === vista ? 'is-active' : ''}`} onClick={() => onVista(vistaActual === vista ? 'todos' : vista)}>{texto} {total}</button>)}</div>
}

function TablaBandeja({ tickets }) {
  return <div className="bandeja-tabla__scroll"><table className="bandeja-tabla" aria-label="Tickets asignados a mí">
    <thead><tr><th scope="col">Código</th><th scope="col">Asunto</th><th scope="col">Categoría</th><th scope="col">Ambiente</th><th scope="col">Solicitante</th><th scope="col">Prioridad</th><th scope="col">Estado</th><th scope="col">Plazo</th><th scope="col">Acción</th></tr></thead>
    <tbody>{tickets.map((ticket) => <tr key={ticket.id} className={`bandeja-tabla__fila bandeja-tabla__fila--${ticket.prioridad}`}>
      <th scope="row"><Link className="bandeja-tabla__codigo" to={ticketAtencionPath('tecnico', ticket.codigo)}>{ticket.codigo}</Link></th>
      <td className="bandeja-tabla__asunto">{ticket.asunto}</td><td className="bandeja-tabla__categoria">{ticket.categoria}</td><td className="text-mono">{ticket.ambiente}</td><td>{ticket.solicitante}</td>
      <td><PriorityBadge prioridad={ticket.prioridad} /></td><td><StatusBadge estado={ticket.estado} /></td>
      <td className={ticket.fueraDePlazo ? 'bandeja-tabla__vencido' : ''}>{plazoDe(ticket)}</td>
      <td><Button variant="tertiary" size="sm" to={ticketAtencionPath('tecnico', ticket.codigo)} aria-label={`Abrir bitácora de ${ticket.codigo}`}>Abrir bitácora</Button></td>
    </tr>)}</tbody>
  </table></div>
}

export default function TechnicianHomePage() {
  const { usuario } = useAuth()
  const cargar = useCallback(() => listarBandeja(usuario.id), [usuario.id])
  const { status, data, reload } = useAsyncData(cargar)
  const [searchParams, setSearchParams] = useSearchParams()
  const [orden, setOrden] = useState('prioridad')
  const vista = VISTAS.has(searchParams.get('vista')) ? searchParams.get('vista') : 'todos'
  const tickets = data?.tickets ?? []
  const visibles = filtrarBandeja(tickets, vista, orden)
  const fuera = tickets.filter(({ fueraDePlazo }) => fueraDePlazo)
  const hoy = hoyEnLima()
  const pestañas = [
    ['todos', `Todos (${tickets.length})`],
    ['criticos', `Solo críticos (${tickets.filter(({ prioridad }) => prioridad === 'critica').length})`],
    ['fuera', `Fuera de plazo (${fuera.length})`],
    ['hoy', `Hoy (${tickets.filter((ticket) => ticket.estado !== 'cerrado' && fechaEnLima(ticket.vencimientoEn) === hoy).length})`],
  ]
  const cambiarVista = (siguiente) => setSearchParams(siguiente === 'todos' ? {} : { vista: siguiente })
  useDocumentTitle('Mi bandeja')

  return <div className="bandeja-page">
    <PageHeader title="Mi bandeja" subtitle={status === 'success' ? `${data.tecnico.nombre} · ${data.tecnico.especialidades.join(' y ')} · ${pluralize(tickets.length, 'ticket asignado', 'tickets asignados')}` : undefined} actions={status === 'success' && <ResumenEstados tickets={tickets} vistaActual={vista} onVista={cambiarVista} />} />
    {status === 'loading' && <Card aria-busy="true">Cargando tu bandeja…</Card>}
    {status === 'error' && <Alert variant="error" actions={<Button variant="secondary" onClick={reload}>Reintentar</Button>}>No pudimos cargar tu bandeja.</Alert>}
    {status === 'success' && <>
      <div className="bandeja-controles">
        <div className="bandeja-pestanas" role="group" aria-label="Filtros de la bandeja">{pestañas.map(([valor, texto]) => <button type="button" key={valor} className={vista === valor ? 'is-active' : ''} onClick={() => cambiarVista(valor)}>{texto}</button>)}</div>
        <label className="bandeja-orden"><span className="visually-hidden">Orden de la bandeja</span><SelectInput value={orden} onChange={(event) => setOrden(event.target.value)} options={[{ value: 'prioridad', label: 'Orden: prioridad y plazo' }, { value: 'antiguedad', label: 'Orden: antigüedad' }, { value: 'recientes', label: 'Orden: recientes' }]} /></label>
      </div>
      {visibles.length ? <TablaBandeja tickets={visibles} /> : <Card><EmptyState title={tickets.length ? 'No hay tickets con este filtro' : 'Sin tickets asignados'} description={tickets.length ? 'Prueba con otra vista de la bandeja.' : 'Cuando el supervisor te asigne uno aparecerá aquí.'} action={tickets.length ? <Button variant="secondary" onClick={() => cambiarVista('todos')}>Ver todos</Button> : undefined} /></Card>}
      {fuera.length > 0 && <Alert variant="error" className="bandeja-aviso">{pluralize(fuera.length, 'ticket fuera', 'tickets fuera')} del tiempo esperado: {fuera.map(({ codigo }) => codigo).join(', ')}. {fuera.length === 1 ? 'Atiéndelo o cámbialo' : 'Atiéndelos o cámbialos'} a En espera con motivo.</Alert>}
    </>}
  </div>
}
