import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { obtenerPorToken } from '../../services/invitaciones.service.js'
import { Alert, Button, Card } from '../../shared/components'
import InvitationForm from './InvitationForm.jsx'
import InvitationNotice from './InvitationNotice.jsx'
import './InvitationPage.css'

function InvitationContent({ status, data: invitacion, error, reload }) {
  if (status === 'loading') {
    return (
      <Card className="invitation-page__status" aria-busy="true">
        <p role="status" className="text-muted">
          Verificando la invitación…
        </p>
      </Card>
    )
  }
  if (status === 'error' && error.code === 'INVITATION_NOT_FOUND') return <InvitationNotice />
  if (status === 'error') {
    return (
      <Alert
        variant="error"
        className="invitation-page__status"
        actions={
          <Button variant="secondary" size="sm" onClick={reload}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar la invitación. Inténtalo otra vez.
      </Alert>
    )
  }
  if (invitacion.estadoEfectivo === 'pendiente') {
    return <InvitationForm invitacion={invitacion} onInvitacionCambiada={reload} />
  }
  return <InvitationNotice invitacion={invitacion} />
}

/** Alta de técnicos y supervisores por invitación (HU-1 · 1.2, mockup p07): /invitacion/:token. */
export default function InvitationPage() {
  const { token } = useParams()
  const cargarInvitacion = useCallback(() => obtenerPorToken(token), [token])
  const consulta = useAsyncData(cargarInvitacion)
  useDocumentTitle('Invitación')

  return (
    <div className="container page invitation-page">
      <InvitationContent {...consulta} />
    </div>
  )
}
