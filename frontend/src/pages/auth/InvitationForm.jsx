import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from '../../hooks/useForm.js'
import { ROUTES } from '../../routes/routePaths.js'
import { aceptar, rechazar } from '../../services/invitaciones.service.js'
import {
  Badge,
  Button,
  Card,
  FormField,
  PageHeader,
  PasswordInput,
  TextInput,
  useConfirm,
  useToast,
} from '../../shared/components'
import { formatDate, formatRol, formatTelefono, getFullName } from '../../utils/format.js'
import { validateActivacion } from '../../utils/validators.js'
import EspecialidadesField from './EspecialidadesField.jsx'
import './InvitationForm.css'

// con estos errores hay que volver a leer la invitación
const INVITACION_CAMBIADA = new Set(['INVITATION_NOT_FOUND', 'INVITATION_EXPIRED', 'INVITATION_NOT_PENDING'])

export default function InvitationForm({ invitacion, onInvitacionCambiada }) {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const form = useForm({
    initialValues: { telefono: formatTelefono(invitacion.telefono), password: '', confirmacion: '', especialidades: [] },
    validate: validateActivacion,
  })
  const [rechazando, setRechazando] = useState(false)
  const rol = formatRol(invitacion.rol).toLowerCase()
  const invitador = invitacion.invitadoPorNombre ?? 'El área de Infraestructura'

  function notificarError(error) {
    toast.error(error.message)
    if (INVITACION_CAMBIADA.has(error.code)) onInvitacionCambiada()
  }

  async function activarCuenta(values) {
    try {
      const usuario = await aceptar(invitacion.token, values)
      toast.success(`Tu cuenta de ${rol} está activa. Ya puedes iniciar sesión.`)
      navigate(ROUTES.iniciarSesion, { replace: true, state: { correo: usuario.correo } })
    } catch (error) {
      // el correo no se puede editar, así que se le dice qué hacer
      if (error.code === 'EMAIL_TAKEN') {
        toast.error('Este correo ya tiene una cuenta. Inicia sesión con ella o pide ayuda al supervisor.')
      }
      if (error.fieldErrors) return error.fieldErrors
      notificarError(error)
    }
  }

  async function handleRechazar() {
    const confirmado = await confirm({
      title: '¿Rechazar la invitación?',
      message: 'No podrás activar tu cuenta con este enlace.',
      confirmText: 'Rechazar invitación',
      variant: 'destructive',
    })
    if (!confirmado) return

    setRechazando(true)
    try {
      await rechazar(invitacion.token)
      toast.success('Rechazaste la invitación.')
      onInvitacionCambiada()
    } catch (error) {
      setRechazando(false)
      notificarError(error)
    }
  }

  return (
    <Card className="invitation-form">
      <Badge tone="accent" uppercase className="invitation-form__badge">
        Invitación válida hasta el {formatDate(invitacion.venceEn)}
      </Badge>
      <PageHeader
        title={`Activa tu cuenta de ${rol}`}
        subtitle={`${invitador} te invitó a la Mesa de Ayuda. Revisa tus datos, define tu contraseña y elige tu especialidad.`}
      />

      <form onSubmit={form.handleSubmit(activarCuenta)} noValidate>
        <fieldset disabled={form.isSubmitting || rechazando}>
          <div className="form-grid">
            <FormField label="Nombres y apellidos" hint="Dato de la invitación, no editable.">
              <TextInput value={getFullName(invitacion)} readOnly />
            </FormField>
            <FormField label="Correo institucional" error={form.errors.correo}>
              <TextInput name="correo" value={invitacion.correo} readOnly autoComplete="username" />
            </FormField>

            <FormField label="Rol asignado">
              <TextInput value={formatRol(invitacion.rol)} readOnly />
            </FormField>
            <FormField label="Teléfono de contacto" required error={form.errors.telefono}>
              <TextInput {...form.getFieldProps('telefono')} type="tel" autoComplete="tel-national" />
            </FormField>

            <FormField label="Contraseña" required error={form.errors.password}>
              <PasswordInput {...form.getFieldProps('password')} autoComplete="new-password" />
            </FormField>
            <FormField label="Confirmar contraseña" required error={form.errors.confirmacion}>
              <PasswordInput {...form.getFieldProps('confirmacion')} autoComplete="new-password" />
            </FormField>

            <EspecialidadesField
              className="form-grid__full"
              value={form.values.especialidades}
              onChange={(especialidades) => form.setFieldValue('especialidades', especialidades)}
              onBlur={form.handleBlur}
              error={form.errors.especialidades}
            />

            <div className="form-actions form-grid__full invitation-form__actions">
              <Button type="submit" loading={form.isSubmitting} loadingText="Activando…">
                Activar mi cuenta
              </Button>
              <Button variant="tertiary" onClick={handleRechazar} loading={rechazando} loadingText="Rechazando…">
                Rechazar invitación
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </Card>
  )
}
