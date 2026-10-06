import { useId } from 'react'
import { Button, Modal, useConfirm } from '../../shared/components'

/**
 * Ventana con un formulario del catálogo (p15): los campos en `children`, «Cancelar» y el botón de guardar. Cerrarla
 * con datos sin guardar pide confirmación. `form` es el de useForm y `onGuardar(values)`, lo que se hace al enviarlo
 * (devuelve los errores por campo del servicio, si los hay). `initialFocusRef` apunta al primer campo.
 */
export default function FormularioModal({ titulo, descripcion, form, onGuardar, onClose, textoGuardar, initialFocusRef, children }) {
  const confirm = useConfirm()
  const formId = useId()

  async function cerrar() {
    if (form.isSubmitting) return
    if (form.isDirty) {
      const descartar = await confirm({
        title: '¿Descartar los cambios?',
        message: 'Se perderán los datos que ingresaste.',
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
      size="lg"
      title={titulo}
      description={descripcion}
      initialFocusRef={initialFocusRef}
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={form.isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={form.isSubmitting} loadingText="Guardando…">
            {textoGuardar}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(onGuardar)} noValidate>
        <fieldset disabled={form.isSubmitting}>{children}</fieldset>
      </form>
    </Modal>
  )
}
