import { useRef } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useForm } from '../../hooks/useForm.js'
import { actualizarSede, crearSede } from '../../services/ubicaciones.service.js'
import { FormField, TextInput, useToast } from '../../shared/components'
import { validateSede } from '../../utils/catalogoValidators.js'
import FormularioModal from './FormularioModal.jsx'

/** Nueva o editar sede (HU-2 · 2.2): solo su nombre. `onGuardado` recibe la sede guardada. */
export default function SedeModal({ sede, onClose, onGuardado }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const nombreRef = useRef(null)
  const form = useForm({ initialValues: { nombre: sede?.nombre ?? '' }, validate: validateSede })

  async function guardar(values) {
    try {
      const guardada = sede ? await actualizarSede(sede.id, values, usuario.id) : await crearSede(values, usuario.id)
      toast.success(`Sede “${guardada.nombre}” ${sede ? 'actualizada' : 'creada'} correctamente.`)
      onGuardado(guardada)
    } catch (error) {
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
    }
  }

  return (
    <FormularioModal
      titulo={sede ? 'Editar sede' : 'Nueva sede'}
      descripcion="Campus o local de la universidad donde están los pabellones."
      form={form}
      onGuardar={guardar}
      onClose={onClose}
      textoGuardar="Guardar sede"
      initialFocusRef={nombreRef}
    >
      <FormField label="Nombre" required error={form.errors.nombre}>
        <TextInput ref={nombreRef} {...form.getFieldProps('nombre')} placeholder="Campus Monterrico" autoComplete="off" />
      </FormField>
    </FormularioModal>
  )
}
