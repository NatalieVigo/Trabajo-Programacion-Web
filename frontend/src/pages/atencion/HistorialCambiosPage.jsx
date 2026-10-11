import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ticketAtencionPath } from '../../routes/routePaths.js'
import { obtenerHistorial } from '../../services/atencion.service.js'
import { Button, Card, PageHeader } from '../../shared/components'
import { formatDuracion } from '../../utils/duracion.js'
import { formatDate, formatEstado } from '../../utils/format.js'
import CargaDelTicket from './CargaDelTicket.jsx'
import LineaDeTiempo from './LineaDeTiempo.jsx'
import { origenDelTicket } from './origenDelTicket.js'
import TiempoPorEtapa from './TiempoPorEtapa.jsx'
import './TicketAtencionPage.css'
import './HistorialCambiosPage.css'

/** Resumen bajo el título (p27): asunto, ambiente, cómo está el ticket y el tiempo total de atención. */
function resumir({ ticket, tiempos }) {
  const situacion = ticket.cerradoEn ? `cerrado el ${formatDate(ticket.cerradoEn)}` : formatEstado(ticket.estado).toLowerCase()
  return [ticket.asunto, ticket.ambiente.codigo, situacion, `tiempo total ${formatDuracion(tiempos.totalMs)}`].join(' · ')
}

/** El historial ya cargado: la ruta de navegación, la línea de tiempo y el tiempo por etapa. */
function HistorialDeTicket({ historial }) {
  const { usuario } = useAuth()
  const { ticket, eventos, etapas, tiempos } = historial
  const origen = origenDelTicket(usuario.rol)
  const rutaDelTicket = ticketAtencionPath(usuario.rol, ticket.codigo)
  useDocumentTitle(`Historial de ${ticket.codigo}`)

  return (
    <div className="historial-cambios">
      <nav aria-label="Ruta de navegación" className="ticket-atencion__breadcrumb">
        <Link to={origen.to}>{origen.label}</Link>
        <span aria-hidden="true"> · </span>
        <Link to={rutaDelTicket} className="text-mono">
          {ticket.codigo}
        </Link>
        <span aria-hidden="true"> · </span>
        <span aria-current="page">Historial de cambios</span>
      </nav>
      <PageHeader
        title="Historial de cambios"
        subtitle={resumir(historial)}
        actions={
          <Button to={rutaDelTicket} variant="secondary">
            Volver al ticket
          </Button>
        }
      />
      <div className="historial-cambios__layout">
        <Card>
          <LineaDeTiempo eventos={eventos} aria-label={`Cambios de ${ticket.codigo}`} />
        </Card>
        <TiempoPorEtapa etapas={etapas} tiempos={tiempos} />
      </div>
    </div>
  )
}

/**
 * /tecnico/tickets/:codigo/historial y /supervisor/tickets/:codigo/historial (HU-5 · 5.5, mockup p27): todos los
 * cambios de estado de un ticket, con su autor y su momento, y cuánto tiempo pasó en cada etapa.
 */
export default function HistorialCambiosPage() {
  const { codigo } = useParams()
  const { usuario } = useAuth()
  const cargar = useCallback(() => obtenerHistorial(codigo, usuario.id), [codigo, usuario.id])
  const { status, data, error, reload } = useAsyncData(cargar)

  if (status !== 'success') {
    return <CargaDelTicket status={status} error={error} codigo={codigo} onReintentar={reload} />
  }
  return <HistorialDeTicket historial={data} />
}
