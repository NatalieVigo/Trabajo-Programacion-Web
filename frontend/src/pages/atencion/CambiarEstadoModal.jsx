import { useId, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useForm } from '../../hooks/useForm.js'
import { cambiarEstado } from '../../services/atencion.service.js'
import { Button, FormField, Modal, TextInput, useConfirm, useToast } from '../../shared/components'
import { validateCambioEstado } from '../../utils/atencionValidators.js'
import { cx } from '../../utils/classNames.js'
import { hoyEnLima } from '../../utils/fechaLima.js'
import { formatEstado } from '../../utils/format.js'
import TextArea from '../catalogo/TextArea.jsx'
import { esTicketDesactualizado } from './erroresDeAtencion.js'
import '../../shared/components/FormField/FormField.css'
import './AtencionModales.css'

/** Estados que se eligen en este diálogo, con lo que significa cada uno. A «Cerrado» se llega cerrando el ticket. */
const OPCIONES = [
  { estado: 'en_atencion', detalle: 'estás trabajando en la falla' },
  { estado: 'en_espera', detalle: 'falta un repuesto o depende de un tercero' },
  { estado: 'resuelto', detalle: 'la falla ya no se presenta' },
  { estado: 'abierto', detalle: 'vuelve a la cola de atención' },
]

/** Los demás estados: primero los que el actual admite y luego los que no, que se muestran deshabilitados. */
function opcionesDesde(estadoActual, transiciones) {
  const otras = OPCIONES.filter(({ estado }) => estado !== estadoActual).map((opcion) => ({
    ...opcion,
    disponible: transiciones.includes(opcion.estado),
  }))
  return [...otras.filter(({ disponible }) => disponible), ...otras.filter(({ disponible }) => !disponible)]
}

/** Lo que se envía al servicio: el motivo y la fecha de retorno solo acompañan a la espera. */
function datosDelCambio({ estado, motivo, retornoEstimado }) {
  return estado === 'en_espera' ? { estado, motivo, retornoEstimado } : { estado }
}

/**
 * Cambiar estado (HU-5 · 5.2 y 5.3, modal de p26): solo se pueden elegir los estados que el actual admite
 * (`transiciones`); los demás aparecen deshabilitados, con el motivo. Al elegir «En espera» pide el motivo de la
 * espera y la fecha estimada de retorno. `onCambiado` recibe la atención actualizada. Se monta al abrirse.
 */
export default function CambiarEstadoModal({ ticket, transiciones, onClose, onCambiado, onDesactualizada }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const formId = useId()
  const errorId = useId()
  const primeraRef = useRef(null)
  // El día en que se abrió el diálogo: la fecha de retorno no puede ser anterior.
  const [hoy] = useState(hoyEnLima)
  const opciones = opcionesDesde(ticket.estado, transiciones)
  const form = useForm({
    // Con un solo cambio posible ya viene elegido.
    initialValues: { estado: transiciones.length === 1 ? transiciones[0] : '', motivo: '', retornoEstimado: '' },
    validate: validateCambioEstado,
  })
  const error = form.errors.estado
  const enEspera = form.values.estado === 'en_espera'

  async function guardar(values) {
    try {
      const actualizada = await cambiarEstado(ticket.codigo, datosDelCambio(values), usuario.id)
      toast.success(`Estado actualizado: ${formatEstado(values.estado)}.`)
      onCambiado(actualizada)
    } catch (fallo) {
      if (fallo.fieldErrors) return fallo.fieldErrors
      toast.error(fallo.message)
      if (esTicketDesactualizado(fallo)) onDesactualizada()
    }
  }

  async function cerrar() {
    if (form.isSubmitting) return
    if (form.isDirty) {
      const descartar = await confirm({
        title: '¿Descartar los cambios?',
        message: 'El ticket seguirá en su estado actual.',
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
      onClose={cerrar}
      title={`Cambiar estado de ${ticket.codigo}`}
      description={`Estado actual: ${formatEstado(ticket.estado)}. Solo se ofrecen las transiciones permitidas.`}
      initialFocusRef={primeraRef}
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={form.isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={form.isSubmitting} loadingText="Guardando…">
            Guardar estado
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(guardar)} noValidate>
        <fieldset disabled={form.isSubmitting}>
          <fieldset
            className={cx('estado-opciones', error && 'estado-opciones--error')}
            aria-describedby={error ? errorId : undefined}
          >
            {/* p26 no muestra un título sobre las opciones: queda para lectores de pantalla. */}
            <legend className="visually-hidden">Nuevo estado</legend>
            {opciones.map(({ estado, detalle, disponible }, indice) => (
              <label key={estado} className={cx('estado-opcion', !disponible && 'is-disabled')}>
                <input
                  ref={indice === 0 ? primeraRef : undefined}
                  type="radio"
                  name="estado"
                  value={estado}
                  checked={form.values.estado === estado}
                  onChange={form.handleChange}
                  disabled={!disponible}
                  aria-invalid={error ? true : undefined}
                  className="estado-opcion__radio"
                />
                <span>
                  <strong>{formatEstado(estado)}</strong> ·{' '}
                  {disponible ? detalle : `no disponible desde ${formatEstado(ticket.estado)}`}
                </span>
              </label>
            ))}
          </fieldset>
          {error && (
            <p id={errorId} className="field__message field__message--error">
              {error}
            </p>
          )}

          {enEspera && (
            <div className="form-grid estado-espera">
              <FormField label="Motivo de espera (obligatorio)" required error={form.errors.motivo}>
                <TextArea {...form.getFieldProps('motivo')} placeholder="Repuesto solicitado al almacén…" />
              </FormField>
              <FormField label="Fecha estimada de retorno" required error={form.errors.retornoEstimado}>
                <TextInput {...form.getFieldProps('retornoEstimado')} type="date" min={hoy} />
              </FormField>
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  )
}
