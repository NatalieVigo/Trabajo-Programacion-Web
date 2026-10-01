import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useForm } from '../../hooks/useForm.js'
import { getRoleHome } from '../../routes/roleHome.js'
import { canAccess } from '../../routes/routeAccess.js'
import { ROUTES } from '../../routes/routePaths.js'
import { obtenerContadores } from '../../services/resumen.service.js'
import { Button, Checkbox, FormField, PasswordInput, TextInput, TextLink, useToast } from '../../shared/components'
import { normalizeCorreo, validateLogin } from '../../utils/validators.js'
import LoginAlert from './LoginAlert.jsx'
import { buildWelcomeMessage } from './welcomeMessage.js'

const VERIFICA_TUS_DATOS = 'Verifica tus datos e inténtalo otra vez.'
// Errores que se explican con un aviso sobre el formulario (p05); los inesperados se notifican con un toast.
const ERRORES_CON_AVISO = new Set(['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', 'ACCOUNT_BLOCKED'])

/**
 * Tras ingresar: la página privada que se pidió sin sesión (RequireAuth la deja en state.from) si el rol puede verla;
 * si no, la vista del rol en lugar de un 403.
 */
function destinoTrasIngresar(from, rol) {
  return typeof from?.pathname === 'string' && canAccess(rol, from.pathname) ? from : getRoleHome(rol).path
}

async function mensajeDeBienvenida(usuario) {
  try {
    return buildWelcomeMessage(usuario, await obtenerContadores(usuario))
  } catch {
    return buildWelcomeMessage(usuario)
  }
}

/**
 * Formulario de acceso (p04, p05). Mientras se valida la sesión muestra «Ingresando…» con los campos y enlaces
 * deshabilitados. El correo llega precargado desde el registro o la invitación (state.correo).
 */
export default function LoginForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { iniciarSesion } = useAuth()
  const correoRecibido = typeof location.state?.correo === 'string' ? location.state.correo : ''
  const form = useForm({
    initialValues: { correo: correoRecibido, password: '', recordar: false },
    validate: validateLogin,
  })
  const [aviso, setAviso] = useState(null)
  const enviando = form.isSubmitting

  function irTrasIngresar(usuario) {
    navigate(destinoTrasIngresar(location.state?.from, usuario.rol), { replace: true })
  }

  async function ingresar(values) {
    setAviso(null)
    try {
      const usuario = await iniciarSesion(values, irTrasIngresar)
      // La vista del rol se abre sin esperar los contadores: la bienvenida llega cuando estén listos.
      mensajeDeBienvenida(usuario).then(toast.success)
    } catch (error) {
      if (error.fieldErrors) return error.fieldErrors
      if (!ERRORES_CON_AVISO.has(error.code)) {
        toast.error(error.message)
        return null
      }
      const fieldErrors = error.code === 'INVALID_CREDENTIALS' ? { password: VERIFICA_TUS_DATOS } : null
      // Sin un campo que corregir (cuenta bloqueada), el foco pasa al aviso y desde ahí a sus acciones.
      setAviso({ error, correo: normalizeCorreo(values.correo), enfocar: !fieldErrors })
      return fieldErrors
    }
  }

  return (
    <form className="login-form" onSubmit={form.handleSubmit(ingresar)} noValidate>
      {aviso && <LoginAlert error={aviso.error} correo={aviso.correo} enfocar={aviso.enfocar} />}

      <fieldset className="login-form__fields" disabled={enviando}>
        <FormField label="Correo institucional" required error={form.errors.correo}>
          <TextInput
            {...form.getFieldProps('correo')}
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </FormField>
        <FormField label="Contraseña" required error={form.errors.password}>
          <PasswordInput
            {...form.getFieldProps('password')}
            autoComplete="current-password"
            autoFocus={Boolean(correoRecibido)}
          />
        </FormField>
        <div className="login-form__options">
          <Checkbox {...form.getFieldProps('recordar')} label="Recordarme en este equipo" />
          <TextLink to={ROUTES.recuperarContrasena} disabled={enviando} className="login-form__forgot">
            ¿Olvidaste tu contraseña?
          </TextLink>
        </div>
      </fieldset>

      <Button type="submit" block loading={enviando} loadingText="Ingresando…">
        Ingresar
      </Button>
      <p className="login-form__signup">
        ¿No tienes cuenta?{' '}
        <TextLink to={ROUTES.registro} disabled={enviando}>
          Regístrate
        </TextLink>
      </p>
    </form>
  )
}
