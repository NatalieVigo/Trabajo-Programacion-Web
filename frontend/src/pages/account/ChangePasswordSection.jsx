import { useId } from 'react'
import { useForm } from '../../hooks/useForm.js'
import { cambiarPassword } from '../../services/auth.service.js'
import { Button, FormField, PasswordInput, PasswordStrength, useToast } from '../../shared/components'
import { VALIDATION_MESSAGES, validateCambioPassword } from '../../utils/validators.js'
import './ChangePasswordSection.css'

const CAMPOS_VACIOS = { actual: '', nueva: '', confirmacion: '' }

/**
 * Sección «Cambiar contraseña» de Mi cuenta (p10): la contraseña actual, la nueva con su medidor de seguridad y la
 * confirmación. Al actualizarla lo notifica y deja los campos vacíos.
 */
export default function ChangePasswordSection({ usuario }) {
  const toast = useToast()
  const tituloId = useId()
  const form = useForm({ initialValues: CAMPOS_VACIOS, validate: validateCambioPassword })

  async function actualizar(values) {
    try {
      await cambiarPassword(usuario.id, values)
    } catch (error) {
      // 400 trae el mensaje de cada campo, también cuando la contraseña actual no es la correcta.
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
          {/* Para que el gestor de contraseñas guarde la nueva con la cuenta correcta. */}
          <input type="email" name="username" value={usuario.correo} autoComplete="username" readOnly hidden />
          <div className="password-section__fields">
            <FormField label="Actual" required error={form.errors.actual}>
              <PasswordInput {...form.getFieldProps('actual')} autoComplete="current-password" />
            </FormField>
            <FormField label="Nueva" required hint={VALIDATION_MESSAGES.passwordRule} error={form.errors.nueva}>
              <PasswordInput {...form.getFieldProps('nueva')} autoComplete="new-password" />
              <PasswordStrength password={form.values.nueva} />
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
