import { useAuth } from '../../hooks/useAuth.js'
import { useForm } from '../../hooks/useForm.js'
import { actualizarPerfil } from '../../services/usuarios.service.js'
import { Button, FormField, SelectInput, TextInput, useConfirm, useToast } from '../../shared/components'
import { formatTelefono } from '../../utils/format.js'
import { validatePerfil } from '../../utils/validators.js'

// sin ambiente habitual queda '' para el select
const valoresDe = (usuario) => ({
  nombres: usuario.nombres,
  apellidos: usuario.apellidos,
  telefono: formatTelefono(usuario.telefono),
  unidad: usuario.unidad ?? '',
  ambienteHabitualId: usuario.ambienteHabitualId ?? '',
})

const opcionDeAmbiente = (ambiente) => ({ value: ambiente.id, label: ambiente.codigo })

// Al guardar se relee la sesión para que la cabecera muestre el nombre nuevo.
export default function PersonalDataForm({ usuario, catalogos, labelledBy, onSaved }) {
  const { refrescarUsuario } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const form = useForm({ initialValues: valoresDe(usuario), validate: validatePerfil })

  async function guardar(values) {
    const cambios = { ...values, ambienteHabitualId: values.ambienteHabitualId || null }
    let actualizado
    try {
      actualizado = await actualizarPerfil(usuario.id, cambios)
    } catch (error) {
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
      return
    }

    form.resetTo(valoresDe(actualizado))
    toast.success('Tus datos se guardaron correctamente.')
    onSaved()
    try {
      await refrescarUsuario()
    } catch {
      // ya se guardó; la cabecera se actualiza en la próxima carga
    }
  }

  async function descartar() {
    if (form.isDirty) {
      const confirmado = await confirm({
        title: '¿Descartar los cambios?',
        message: 'Se perderán los cambios que no guardaste.',
        confirmText: 'Descartar cambios',
        cancelText: 'Seguir editando',
        variant: 'destructive',
      })
      if (!confirmado) return
    }
    form.reset()
  }

  return (
    <form onSubmit={form.handleSubmit(guardar)} aria-labelledby={labelledBy} noValidate>
      <fieldset disabled={form.isSubmitting}>
        <div className="form-grid">
          <FormField label="Nombres" required error={form.errors.nombres}>
            <TextInput {...form.getFieldProps('nombres')} autoComplete="given-name" />
          </FormField>
          <FormField label="Apellidos" required error={form.errors.apellidos}>
            <TextInput {...form.getFieldProps('apellidos')} autoComplete="family-name" />
          </FormField>

          <FormField label="Correo institucional" hint="No editable.">
            <TextInput value={usuario.correo} type="email" readOnly autoComplete="email" />
          </FormField>
          <FormField label="Teléfono" required error={form.errors.telefono}>
            <TextInput {...form.getFieldProps('telefono')} type="tel" autoComplete="tel-national" />
          </FormField>

          <FormField label="Unidad o carrera" required error={form.errors.unidad}>
            <SelectInput
              {...form.getFieldProps('unidad')}
              options={catalogos.unidades}
              placeholder="Selecciona tu unidad o carrera"
            />
          </FormField>
          <FormField label="Ambiente habitual" error={form.errors.ambienteHabitualId}>
            <SelectInput
              {...form.getFieldProps('ambienteHabitualId')}
              options={catalogos.ambientes.map(opcionDeAmbiente)}
              placeholder="Sin ambiente habitual"
            />
          </FormField>

          <div className="form-actions form-grid__full">
            <Button type="submit" disabled={!form.isDirty} loading={form.isSubmitting} loadingText="Guardando…">
              Guardar cambios
            </Button>
            <Button variant="tertiary" onClick={descartar}>
              Descartar
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  )
}
