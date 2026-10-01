import { useNavigate } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useEmailAvailability } from '../../hooks/useEmailAvailability.js'
import { useForm } from '../../hooks/useForm.js'
import { ROUTES } from '../../routes/routePaths.js'
import { listarUnidades, listarVinculos } from '../../services/catalogo.service.js'
import { registrar } from '../../services/usuarios.service.js'
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  PasswordInput,
  PasswordStrength,
  SelectInput,
  TextInput,
  useConfirm,
  useToast,
} from '../../shared/components'
import { VALIDATION_MESSAGES, validateRegistro } from '../../utils/validators.js'
import './RegisterForm.css'

const INITIAL_VALUES = {
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  password: '',
  confirmacion: '',
  unidad: '',
  vinculo: '',
  aceptaTerminos: false,
}

const cargarOpciones = () =>
  Promise.all([listarUnidades(), listarVinculos()]).then(([unidades, vinculos]) => ({ unidades, vinculos }))

/** Mensaje del correo: error de validación o del servicio, luego el resultado de la verificación de disponibilidad. */
function correoFeedback(error, availability) {
  if (error) return { error }
  if (availability === 'taken') return { error: VALIDATION_MESSAGES.correoTaken }
  if (availability === 'available') return { success: VALIDATION_MESSAGES.correoAvailable }
  if (availability === 'checking') return { hint: 'Verificando disponibilidad…' }
  return {}
}

/** Formulario de registro (p06): validación en línea y verificación del correo al salir del campo. */
export default function RegisterForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const form = useForm({ initialValues: INITIAL_VALUES, validate: validateRegistro })
  const opciones = useAsyncData(cargarOpciones)
  const emailAvailability = useEmailAvailability(form.values.correo)
  const opcionesListas = opciones.status === 'success'

  async function crearCuenta(values) {
    try {
      const usuario = await registrar(values)
      toast.success('Tu cuenta fue creada. Ya puedes iniciar sesión.')
      navigate(ROUTES.iniciarSesion, { replace: true, state: { correo: usuario.correo } })
    } catch (error) {
      if (error.code === 'EMAIL_TAKEN') emailAvailability.markTaken(values.correo)
      // 400 y 409 traen el mensaje de cada campo: el formulario los muestra junto a ellos.
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
    }
  }

  async function handleCancel() {
    if (form.isDirty) {
      const confirmed = await confirm({
        title: '¿Descartar el registro?',
        message: 'Se perderán los datos que ingresaste.',
        confirmText: 'Descartar',
        cancelText: 'Seguir editando',
        variant: 'destructive',
      })
      if (!confirmed) return
    }
    navigate(ROUTES.home)
  }

  function handleCorreoBlur(event) {
    form.handleBlur(event)
    emailAvailability.check()
  }

  return (
    <form className="register-form" onSubmit={form.handleSubmit(crearCuenta)} noValidate>
      <fieldset disabled={form.isSubmitting}>
        <div className="form-grid">
          <FormField label="Nombres" required error={form.errors.nombres}>
            <TextInput {...form.getFieldProps('nombres')} autoComplete="given-name" />
          </FormField>
          <FormField label="Apellidos" required error={form.errors.apellidos}>
            <TextInput {...form.getFieldProps('apellidos')} autoComplete="family-name" />
          </FormField>

          <FormField
            label="Correo institucional"
            required
            {...correoFeedback(form.errors.correo, emailAvailability.status)}
          >
            <TextInput
              {...form.getFieldProps('correo')}
              onBlur={handleCorreoBlur}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </FormField>
          <FormField label="Teléfono" required hint="Para coordinar el acceso al ambiente." error={form.errors.telefono}>
            <TextInput {...form.getFieldProps('telefono')} type="tel" autoComplete="tel-national" />
          </FormField>

          <FormField label="Contraseña" required hint={VALIDATION_MESSAGES.passwordRule} error={form.errors.password}>
            <PasswordInput {...form.getFieldProps('password')} autoComplete="new-password" />
            <PasswordStrength password={form.values.password} />
          </FormField>
          <FormField label="Confirmar contraseña" required error={form.errors.confirmacion}>
            <PasswordInput {...form.getFieldProps('confirmacion')} autoComplete="new-password" />
          </FormField>

          {opciones.status === 'error' && (
            <Alert
              variant="error"
              className="form-grid__full"
              actions={
                <Button variant="secondary" size="sm" onClick={opciones.reload}>
                  Reintentar
                </Button>
              }
            >
              No pudimos cargar las unidades y los vínculos con la universidad.
            </Alert>
          )}
          <FormField label="Unidad o carrera" required error={form.errors.unidad}>
            <SelectInput
              {...form.getFieldProps('unidad')}
              options={opciones.data?.unidades}
              placeholder={opcionesListas ? 'Selecciona tu unidad o carrera' : 'Cargando unidades…'}
              disabled={!opcionesListas}
            />
          </FormField>
          <FormField label="Vínculo con la universidad" required error={form.errors.vinculo}>
            <SelectInput
              {...form.getFieldProps('vinculo')}
              options={opciones.data?.vinculos}
              placeholder={opcionesListas ? 'Selecciona tu vínculo' : 'Cargando vínculos…'}
              disabled={!opcionesListas}
            />
          </FormField>

          <Checkbox
            {...form.getFieldProps('aceptaTerminos')}
            required
            className="form-grid__full"
            label="Acepto los términos del servicio y la política de privacidad."
            error={form.errors.aceptaTerminos}
          />

          <div className="form-actions form-grid__full register-form__actions">
            <Button type="submit" loading={form.isSubmitting} loadingText="Creando cuenta…">
              Crear cuenta
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  )
}
