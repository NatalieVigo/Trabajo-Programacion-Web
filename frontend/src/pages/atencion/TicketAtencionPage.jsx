import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { obtenerAtencion } from '../../services/atencion.service.js'
import { Alert, Button, Card, MessageCard } from '../../shared/components'
import BitacoraPanel from './BitacoraPanel.jsx'
import CambiarEstadoModal from './CambiarEstadoModal.jsx'
import EsperaAviso from './EsperaAviso.jsx'
import { origenDelTicket } from './origenDelTicket.js'
import TicketCabecera from './TicketCabecera.jsx'
import './TicketAtencionPage.css'

/** Contenido mientras no hay ticket que mostrar, con el título de pestaña que le corresponde. */
function EstadoDeLaPagina({ titulo, children }) {
  useDocumentTitle(titulo)
  return children
}

/** El ticket ya cargado: la ruta de navegación, su cabecera con las acciones de quien lo atiende y la bitácora. */
function AtencionDeTicket({ atencion, onActualizada, onDesactualizada }) {
  const { usuario } = useAuth()
  const { ticket, espera, permisos } = atencion
  const origen = origenDelTicket(usuario.rol)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  useDocumentTitle(ticket.codigo)

  /** Cierra el diálogo y aplica `siguiente` a la página: la atención actualizada o la orden de volver a cargarla. */
  function alTerminar(siguiente) {
    return (...args) => {
      setCambiandoEstado(false)
      siguiente(...args)
    }
  }

  return (
    <div className="ticket-atencion">
      <nav aria-label="Ruta de navegación" className="ticket-atencion__breadcrumb">
        <Link to={origen.to}>{origen.label}</Link>
        <span aria-hidden="true"> · </span>
        <span aria-current="page" className="text-mono">
          {ticket.codigo}
        </span>
      </nav>
      <TicketCabecera
        ticket={ticket}
        acciones={
          permisos.transiciones.length > 0 && <Button onClick={() => setCambiandoEstado(true)}>Cambiar estado</Button>
        }
      />
      {espera && <EsperaAviso espera={espera} className="ticket-atencion__espera" />}
      <BitacoraPanel atencion={atencion} onActualizada={onActualizada} onDesactualizada={onDesactualizada} />
      {cambiandoEstado && (
        <CambiarEstadoModal
          ticket={ticket}
          transiciones={permisos.transiciones}
          onClose={() => setCambiandoEstado(false)}
          onCambiado={alTerminar(onActualizada)}
          onDesactualizada={alTerminar(onDesactualizada)}
        />
      )}
    </div>
  )
}

/**
 * /tecnico/tickets/:codigo y /supervisor/tickets/:codigo (HU-5, mockup p25): la atención de un ticket. Si el código
 * no corresponde a ningún ticket, lo indica con un 404.
 */
export default function TicketAtencionPage() {
  const { codigo } = useParams()
  const { usuario } = useAuth()
  const cargar = useCallback(() => obtenerAtencion(codigo, usuario.id), [codigo, usuario.id])
  const { status, data, error, reload, updateData } = useAsyncData(cargar)
  const origen = origenDelTicket(usuario.rol)

  if (status === 'loading') {
    return (
      <EstadoDeLaPagina titulo="Ticket">
        <Card aria-busy="true">
          <p role="status" className="text-muted">
            Cargando el ticket…
          </p>
        </Card>
      </EstadoDeLaPagina>
    )
  }
  if (status === 'error' && error.code === 'TICKET_NOT_FOUND') {
    return (
      <EstadoDeLaPagina titulo="Ticket no encontrado">
        <MessageCard
          code="404"
          title={`No encontramos el ticket ${codigo.toUpperCase()}`}
          description="Revisa el código: los tickets se identifican como TCK-2026-00147."
          actions={<Button to={origen.to}>Ir a {origen.label}</Button>}
          focusTitle
        />
      </EstadoDeLaPagina>
    )
  }
  if (status === 'error') {
    return (
      <EstadoDeLaPagina titulo="Ticket">
        <Alert
          variant="error"
          actions={
            <Button variant="secondary" size="sm" onClick={reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar el ticket.
        </Alert>
      </EstadoDeLaPagina>
    )
  }
  return (
    <AtencionDeTicket
      // La clave reinicia la bitácora (su filtro y lo que se estaba escribiendo) al pasar de un ticket a otro.
      key={data.ticket.id}
      atencion={data}
      onActualizada={(actualizada) => updateData(() => actualizada)}
      onDesactualizada={reload}
    />
  )
}
