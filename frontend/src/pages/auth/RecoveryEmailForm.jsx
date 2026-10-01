import { useForm } from '../../hooks/useForm.js'
import { ROUTES } from '../../routes/routePaths.js'
import { solicitarRecuperacion } from '../../services/auth.service.js'
import { Button, FormField, PageHeader, TextInput, useToast } from '../../shared/components'
import { validateRecuperacion } from '../../utils/validators.js'

/**
 * Paso 1 de la recuperación (p08): el correo de la cuenta. `onEnviado` recibe la respuesta del servicio, que es la
 * misma exista o no la cuenta. `autoFocus` enfoca el correo, por ejemplo al volver del paso 2 para usar otro.
 */
export default function RecoveryEmailForm({ correoInicial, autoFocus = false, onEnviado }) {
  const toast = useToast()
  const form = useForm({ initialValues: { correo: correoInicial }, validate: validateRecuperacion })

  async function enviar({ correo }) {
    try {
      onEnviado(await solicitarRecuperacion(correo))
    } catch (error) {
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Recuperar mi contraseña"
        subtitle="Te enviaremos un enlace de restablecimiento válido por 30 minutos."
      />
      <form className="recovery-form" onSubmit={form.handleSubmit(enviar)} noValidate>
        <fieldset disabled={form.isSubmitting}>
          <FormField
            label="Correo institucional"
            required
            hint="Si la cuenta existe recibirás el enlace; por seguridad no informamos lo contrario."
            error={form.errors.correo}
          >
            <TextInput
              {...form.getFieldProps('correo')}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus={autoFocus}
            />
          </FormField>
        </fieldset>
        <div className="form-actions">
          <Button type="submit" loading={form.isSubmitting} loadingText="Enviando…">
            Enviar enlace
          </Button>
          <Button to={ROUTES.iniciarSesion} variant="tertiary" disabled={form.isSubmitting}>
            Volver a iniciar sesión
          </Button>
        </div>
      </form>
    </>
  )
}
