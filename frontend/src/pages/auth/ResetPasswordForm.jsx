import { useNavigate } from 'react-router-dom'
import { useForm } from '../../hooks/useForm.js'
import { ROUTES } from '../../routes/routePaths.js'
import { restablecerPassword } from '../../services/auth.service.js'
import { Button, Card, FormField, PageHeader, PasswordInput, PasswordStrength, useToast } from '../../shared/components'
import { VALIDATION_MESSAGES, validateRestablecimiento } from '../../utils/validators.js'
import RecoveryStepper from './RecoveryStepper.jsx'

const VALORES_INICIALES = { password: '', confirmacion: '' }

/**
 * Paso 3 de la recuperación (p09): la contraseña nueva con su medidor de seguridad y la confirmación. Al guardarla
 * lleva a iniciar sesión con el correo precargado. Si el enlace deja de servir mientras se completa,
 * `onEnlaceInvalido` vuelve a comprobarlo para mostrar el aviso.
 */
export default function ResetPasswordForm({ token, correo, onEnlaceInvalido }) {
  const navigate = useNavigate()
  const toast = useToast()
  const form = useForm({ initialValues: VALORES_INICIALES, validate: validateRestablecimiento })

  async function guardar({ password, confirmacion }) {
    try {
      const cuenta = await restablecerPassword(token, password, confirmacion)
      toast.success('Tu contraseña fue actualizada. Inicia sesión con la nueva contraseña.')
      navigate(ROUTES.iniciarSesion, { replace: true, state: { correo: cuenta.correo } })
    } catch (error) {
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
      if (error.status === 404 || error.status === 410) onEnlaceInvalido()
    }
  }

  return (
    <Card className="recovery-page__card">
      <RecoveryStepper current={3} />
      <PageHeader title="Crea tu nueva contraseña" subtitle={`Para la cuenta ${correo}.`} />
      <form className="recovery-form" onSubmit={form.handleSubmit(guardar)} noValidate>
        <fieldset className="recovery-form__fields" disabled={form.isSubmitting}>
          {/* Para que el gestor de contraseñas guarde la nueva con la cuenta correcta. */}
          <input type="email" name="username" value={correo} autoComplete="username" readOnly hidden />
          <FormField
            label="Nueva contraseña"
            required
            hint={VALIDATION_MESSAGES.passwordRule}
            error={form.errors.password}
          >
            <PasswordInput {...form.getFieldProps('password')} autoComplete="new-password" />
            <PasswordStrength password={form.values.password} />
          </FormField>
          <FormField label="Confirmar" required error={form.errors.confirmacion}>
            <PasswordInput {...form.getFieldProps('confirmacion')} autoComplete="new-password" />
          </FormField>
        </fieldset>
        <Button type="submit" block loading={form.isSubmitting} loadingText="Guardando…">
          Guardar contraseña
        </Button>
      </form>
    </Card>
  )
}
