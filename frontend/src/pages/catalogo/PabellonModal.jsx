import { useRef } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useForm } from '../../hooks/useForm.js'
import { actualizarPabellon, crearPabellon } from '../../services/ubicaciones.service.js'
import { FormField, SelectInput, TextInput, useToast } from '../../shared/components'
import { validatePabellon } from '../../utils/catalogoValidators.js'
import FormularioModal from './FormularioModal.jsx'

/**
 * Nuevo o editar pabellón (HU-2 · 2.2): su sede y su nombre. Al crearlo desde una sede, `sedeId` llega elegida.
 * `onGuardado` recibe el pabellón guardado.
 */
export default function PabellonModal({ pabellon, sedeId, sedes, onClose, onGuardado }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const nombreRef = useRef(null)
  const form = useForm({
    initialValues: { sedeId: pabellon?.sedeId ?? sedeId ?? '', nombre: pabellon?.nombre ?? '' },
    validate: validatePabellon,
  })

  async function guardar(values) {
    try {
      const guardado = pabellon
        ? await actualizarPabellon(pabellon.id, values, usuario.id)
        : await crearPabellon(values, usuario.id)
      toast.success(`Pabellón “${guardado.nombre}” ${pabellon ? 'actualizado' : 'creado'} correctamente.`)
      onGuardado(guardado)
    } catch (error) {
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
    }
  }

  return (
    <FormularioModal
      titulo={pabellon ? 'Editar pabellón' : 'Nuevo pabellón'}
      form={form}
      onGuardar={guardar}
      onClose={onClose}
      textoGuardar="Guardar pabellón"
      initialFocusRef={nombreRef}
    >
      <div className="form-grid">
        <FormField label="Nombre" required hint="Como se le conoce en el campus: A, H, Biblioteca." error={form.errors.nombre}>
          <TextInput ref={nombreRef} {...form.getFieldProps('nombre')} autoComplete="off" />
        </FormField>
        <FormField label="Sede" required error={form.errors.sedeId}>
          <SelectInput
            {...form.getFieldProps('sedeId')}
            options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
            placeholder="Selecciona la sede"
          />
        </FormField>
      </div>
    </FormularioModal>
  )
}
