import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
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
import TicketCabecera from './TicketCabecera.jsx'
import './TicketAtencionPage.css'

function AtencionDeTicket({ atencion, onActualizada, onDesactualizada }) {
  const { usuario } = useAuth()
  const { ticket, espera, tiempos, desenlace, eventos, permisos } = atencion
  const rutaDelHistorial = ticketHistorialPath(usuario.rol, ticket.codigo)
  // 'estado', 'cierre' o null
  const [dialogo, setDialogo] = useState(null)
  const cerrarDialogo = () => setDialogo(null)
  useDocumentTitle(ticket.codigo)

  function alTerminar(siguiente) {
    return (...args) => {
      cerrarDialogo()
      siguiente(...args)
    }
  }

  return (
    <div className="ticket-atencion">
      <TicketCabecera
        ticket={ticket}
        tiempos={tiempos}
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
          <DatosDelReporte ticket={ticket} />
          <AmbienteDelTicket ambiente={ticket.ambiente} />
          <HistorialReciente eventos={eventos} tiempos={tiempos} cerrado={ticket.estado === 'cerrado'} />
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

// Vista del ticket para técnico y supervisor (HU-5). Si no existe, muestra el 404.
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
      // con la key se reinicia la bitácora al cambiar de ticket
      key={data.ticket.id}
      atencion={data}
      onActualizada={(actualizada) => updateData(() => actualizada)}
      onDesactualizada={reload}
    />
  )
}
