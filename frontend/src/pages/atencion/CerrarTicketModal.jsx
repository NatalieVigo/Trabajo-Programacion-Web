import { useId, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useForm } from '../../hooks/useForm.js'
import { cerrarTicket } from '../../services/atencion.service.js'
import { Alert, Button, FormField, Modal, StatusBadge, useConfirm, useToast } from '../../shared/components'
import { SOLUCION_MAX_LENGTH, validateCierre } from '../../utils/atencionValidators.js'
import { formatDuracion } from '../../utils/duracion.js'
import { getDisplayName } from '../../utils/format.js'
import TextArea from '../catalogo/TextArea.jsx'
import { esTicketDesactualizado } from './erroresDeAtencion.js'
import PlazoDeAtencion from './PlazoDeAtencion.jsx'
import './AtencionModales.css'

/**
 * Cerrar ticket (HU-5 · 5.4, modal de p26): pide la solución aplicada y muestra el tiempo total de atención, si quedó
 * dentro del tiempo esperado y lo que el cierre significa para quien reportó el ticket. `tiempos` es el de la atención
 * cargada y `onCerrado` recibe la atención ya cerrada. Se monta al abrirse.
 */
export default function CerrarTicketModal({ ticket, tiempos, onClose, onCerrado, onDesactualizada }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const formId = useId()
  const solucionRef = useRef(null)
  const form = useForm({ initialValues: { solucion: '' }, validate: validateCierre })
  const solicitante = getDisplayName(ticket.solicitante)

  async function guardar(values) {
    try {
      const cerrada = await cerrarTicket(ticket.codigo, values, usuario.id)
      toast.success(`Ticket ${ticket.codigo} cerrado. ${solicitante} ya puede calificar la atención.`)
      onCerrado(cerrada)
    } catch (fallo) {
      if (fallo.fieldErrors) return fallo.fieldErrors
      toast.error(fallo.message)
      if (esTicketDesactualizado(fallo)) onDesactualizada()
    }
  }

  async function cancelar() {
    if (form.isSubmitting) return
    if (form.isDirty) {
      const descartar = await confirm({
        title: '¿Descartar el cierre?',
        message: 'Se perderá la solución que escribiste y el ticket seguirá abierto.',
        confirmText: 'Descartar',
        cancelText: 'Seguir editando',
        variant: 'destructive',
      })
      if (!descartar) return
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={cancelar}
      title={`Cerrar ${ticket.codigo}`}
      description={ticket.asunto}
      initialFocusRef={solucionRef}
      footer={
        <>
          <Button variant="secondary" onClick={cancelar} disabled={form.isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={form.isSubmitting} loadingText="Cerrando…">
            Cerrar ticket
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(guardar)} noValidate>
        <fieldset disabled={form.isSubmitting} className="cierre">
          <FormField
            label="Solución aplicada"
            required
            hint={`Qué se hizo para resolver la falla. ${form.values.solucion.length} / ${SOLUCION_MAX_LENGTH} caracteres`}
            error={form.errors.solucion}
          >
            <TextArea
              ref={solucionRef}
              {...form.getFieldProps('solucion')}
              placeholder="Se reemplazó el equipo y se verificó su funcionamiento…"
            />
          </FormField>

          <dl className="cierre__resumen">
            <div className="cierre__dato">
              <dt className="text-label text-muted">Tiempo total de atención</dt>
              <dd className="cierre__tiempo">{formatDuracion(tiempos.totalMs)}</dd>
              <dd>
                <PlazoDeAtencion tiempos={tiempos} />
              </dd>
            </div>
            <div className="cierre__dato">
              <dt className="text-label text-muted">Estado final</dt>
              <dd>
                <StatusBadge estado="cerrado" />
              </dd>
            </div>
          </dl>

          <Alert variant="info">
            Al cerrar, {solicitante} recibirá la encuesta de satisfacción y podrá reabrir el ticket dentro de 7 días.
          </Alert>
        </fieldset>
      </form>
    </Modal>
  )
}
