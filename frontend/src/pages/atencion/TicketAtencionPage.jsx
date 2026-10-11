import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { ticketHistorialPath } from '../../routes/routePaths.js'
import { obtenerAtencion } from '../../services/atencion.service.js'
import { Button } from '../../shared/components'
import AmbienteDelTicket from './AmbienteDelTicket.jsx'
import BitacoraPanel from './BitacoraPanel.jsx'
import CambiarEstadoModal from './CambiarEstadoModal.jsx'
import CargaDelTicket from './CargaDelTicket.jsx'
import CerrarTicketModal from './CerrarTicketModal.jsx'
import DatosDelReporte from './DatosDelReporte.jsx'
import Desenlace from './Desenlace.jsx'
import EsperaAviso from './EsperaAviso.jsx'
import HistorialReciente from './HistorialReciente.jsx'
import { origenDelTicket } from './origenDelTicket.js'
import TicketCabecera from './TicketCabecera.jsx'
import './TicketAtencionPage.css'

/**
 * El ticket ya cargado, en una sola vista (p25): su cabecera con las acciones de quien lo atiende; a la izquierda, la
 * espera en curso o el desenlace y la bitácora; a la derecha, los datos del reporte, el ambiente y el historial
 * reciente.
 */
function AtencionDeTicket({ atencion, onActualizada, onDesactualizada }) {
  const { usuario } = useAuth()
  const { ticket, espera, tiempos, desenlace, eventos, permisos } = atencion
  const origen = origenDelTicket(usuario.rol)
  const rutaDelHistorial = ticketHistorialPath(usuario.rol, ticket.codigo)
  // Diálogo abierto: 'estado' (cambiar estado), 'cierre' (cerrar ticket) o null.
  const [dialogo, setDialogo] = useState(null)
  const cerrarDialogo = () => setDialogo(null)
  useDocumentTitle(ticket.codigo)

  /** Cierra el diálogo y aplica `siguiente` a la página: la atención actualizada o la orden de volver a cargarla. */
  function alTerminar(siguiente) {
    return (...args) => {
      cerrarDialogo()
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
          <>
            {permisos.transiciones.length > 0 && <Button onClick={() => setDialogo('estado')}>Cambiar estado</Button>}
            {permisos.cerrar && (
              <Button variant="secondary" onClick={() => setDialogo('cierre')}>
                Cerrar ticket
              </Button>
            )}
            <Button variant="tertiary" to={rutaDelHistorial}>
              Historial
            </Button>
          </>
        }
      />
      <div className="ticket-atencion__layout">
        <div className="ticket-atencion__principal">
          {espera && <EsperaAviso espera={espera} />}
          {desenlace && <Desenlace desenlace={desenlace} tiempos={tiempos} />}
          <BitacoraPanel atencion={atencion} onActualizada={onActualizada} onDesactualizada={onDesactualizada} />
        </div>
        <aside className="ticket-atencion__lateral" aria-label="Datos del ticket">
          <DatosDelReporte ticket={ticket} tiempos={tiempos} />
          <AmbienteDelTicket ambiente={ticket.ambiente} />
          <HistorialReciente
            eventos={eventos}
            tiempos={tiempos}
            cerrado={ticket.estado === 'cerrado'}
            rutaDelHistorial={rutaDelHistorial}
          />
        </aside>
      </div>
      {dialogo === 'estado' && (
        <CambiarEstadoModal
          ticket={ticket}
          transiciones={permisos.transiciones}
          onClose={cerrarDialogo}
          onCambiado={alTerminar(onActualizada)}
          onDesactualizada={alTerminar(onDesactualizada)}
        />
      )}
      {dialogo === 'cierre' && (
        <CerrarTicketModal
          ticket={ticket}
          tiempos={tiempos}
          onClose={cerrarDialogo}
          onCerrado={alTerminar(onActualizada)}
          onDesactualizada={alTerminar(onDesactualizada)}
        />
      )}
    </div>
  )
}

/**
 * /tecnico/tickets/:codigo y /supervisor/tickets/:codigo (HU-5, mockup p25): la vista consolidada de un ticket, con
 * los datos del reporte, la bitácora y el desenlace. Si el código no corresponde a ningún ticket, lo indica con un 404.
 */
export default function TicketAtencionPage() {
  const { codigo } = useParams()
  const { usuario } = useAuth()
  const cargar = useCallback(() => obtenerAtencion(codigo, usuario.id), [codigo, usuario.id])
  const { status, data, error, reload, updateData } = useAsyncData(cargar)

  if (status !== 'success') {
    return <CargaDelTicket status={status} error={error} codigo={codigo} onReintentar={reload} />
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
