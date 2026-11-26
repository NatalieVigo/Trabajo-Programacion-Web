import { useId } from 'react'
import { useForm } from '../../hooks/useForm.js'
import { cambiarPassword } from '../../services/auth.service.js'
import { Button, FormField, PasswordInput, useToast } from '../../shared/components'
import { validateCambioPassword } from '../../utils/validators.js'
import './ChangePasswordSection.css'

const CAMPOS_VACIOS = { actual: '', nueva: '', confirmacion: '' }

export default function ChangePasswordSection({ usuario }) {
  const toast = useToast()
  const tituloId = useId()
  const form = useForm({ initialValues: CAMPOS_VACIOS, validate: validateCambioPassword })

  async function actualizar(values) {
    try {
      await cambiarPassword(usuario.id, values)
    } catch (error) {
      // la contraseña actual incorrecta también llega como error de campo
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
      return
    }
    form.reset()
    toast.success('Tu contraseña se actualizó correctamente.')
  }

  return (
    <section className="account-section password-section" aria-labelledby={tituloId}>
      <h2 id={tituloId} className="account-section__title">
        Cambiar contraseña
      </h2>
      <form onSubmit={form.handleSubmit(actualizar)} aria-labelledby={tituloId} noValidate>
        <fieldset disabled={form.isSubmitting}>
          {/* para que el gestor de contraseñas sepa de qué cuenta es */}
          <input type="email" name="username" value={usuario.correo} autoComplete="username" readOnly hidden />
          <div className="password-section__fields">
            <FormField label="Actual" required error={form.errors.actual}>
              <PasswordInput {...form.getFieldProps('actual')} autoComplete="current-password" />
            </FormField>
            <FormField label="Nueva" required error={form.errors.nueva}>
              <PasswordInput {...form.getFieldProps('nueva')} autoComplete="new-password" />
            </FormField>
            <FormField label="Confirmar" required error={form.errors.confirmacion}>
              <PasswordInput {...form.getFieldProps('confirmacion')} autoComplete="new-password" />
            </FormField>

            <div className="form-actions form-grid__full">
              <Button type="submit" loading={form.isSubmitting} loadingText="Actualizando…">
                Actualizar contraseña
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
