import { useId, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth.js'
import { bloquearCuenta } from '../../../services/administracionUsuarios.service.js'
import { ROUTES } from '../../../routes/routePaths.js'
import { pluralize } from '../../../utils/format.js'
import { Alert, Button, Checkbox, FormField, Modal, useToast } from '../../../shared/components'
import TextArea from '../../catalogo/TextArea.jsx'

export default function BloquearCuentaModal({ cuenta, onClose, onBloqueada }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const formId = useId()
  const [motivo, setMotivo] = useState('')
  const [notificar, setNotificar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  async function enviar(event) {
    event.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await bloquearCuenta(cuenta.id, { motivo, notificar }, usuario.id)
      toast.success(`Cuenta bloqueada. ${cuenta.nombre} ya no puede iniciar sesión.`)
      onBloqueada()
      onClose()
    } catch (e) { setError(e) }
    finally { setGuardando(false) }
  }
  const criticos = cuenta.criticosAsignados > 0 || error?.code === 'CRITICAL_TICKETS'
  return <Modal open size="md" title={`Bloquear la cuenta de ${cuenta.nombre}`} description={`La persona no podrá iniciar sesión ni registrar tickets. ${cuenta.ticketsReportados === 1 ? 'Su ticket existente se mantiene y sigue su curso.' : `Sus ${cuenta.ticketsReportados} tickets existentes se mantienen y siguen su curso.`}`} onClose={() => { if (!guardando) onClose() }}
    footer={<><Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button><Button variant="destructive" type="submit" form={formId} loading={guardando} loadingText="Bloqueando…" disabled={criticos}>Bloquear cuenta</Button></>}>
    <form id={formId} onSubmit={enviar} className="hu7-bloqueo">
      <FormField label="Motivo del bloqueo (obligatorio)" error={error?.fieldErrors?.motivo}>
        <TextArea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} maxLength={240} />
      </FormField>
      <Checkbox label="Notificar a la persona por correo" checked={notificar} onChange={(e) => setNotificar(e.target.checked)} />
      {notificar && <p className="text-aux text-muted">La solicitud de notificación se registrará de forma simulada en esta entrega.</p>}
      {criticos && <Alert variant="warning" actions={<Button to={ROUTES.supervisorCola} variant="secondary" size="sm">Ir a la cola</Button>}>{error?.code === 'CRITICAL_TICKETS' ? error.message : `Esta cuenta tiene ${pluralize(cuenta.criticosAsignados, 'ticket crítico abierto', 'tickets críticos abiertos')}. ${cuenta.criticosAsignados === 1 ? 'Reasígnalo' : 'Reasígnalos'} antes de bloquearla.`}</Alert>}
      {error && !error.fieldErrors && error.code !== 'CRITICAL_TICKETS' && <Alert variant="error">{error.message}</Alert>}
    </form>
  </Modal>
}
