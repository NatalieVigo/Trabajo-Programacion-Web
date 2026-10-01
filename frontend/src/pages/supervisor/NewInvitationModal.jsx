import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useCopyLink } from '../../hooks/useCopyLink.js'
import { useForm } from '../../hooks/useForm.js'
import { crear } from '../../services/invitaciones.service.js'
import { Button, FormField, Modal, SelectInput, TextInput, useConfirm, useToast } from '../../shared/components'
import { formatDate, formatRol, getFullName } from '../../utils/format.js'
import { ROLES_INVITABLES, validateInvitacion } from '../../utils/validators.js'
import { enlaceDeInvitacion } from './invitationsList.js'

const INITIAL_VALUES = { nombres: '', apellidos: '', correo: '', rol: '', telefono: '' }
const ROL_OPTIONS = ROLES_INVITABLES.map((rol) => ({ value: rol, label: formatRol(rol) }))

function InvitationFields({ form, firstFieldRef }) {
  return (
    <fieldset disabled={form.isSubmitting}>
      <div className="form-grid">
        <FormField label="Nombres" required error={form.errors.nombres}>
          <TextInput ref={firstFieldRef} {...form.getFieldProps('nombres')} autoComplete="off" />
        </FormField>
        <FormField label="Apellidos" required error={form.errors.apellidos}>
          <TextInput {...form.getFieldProps('apellidos')} autoComplete="off" />
        </FormField>
        <FormField label="Correo institucional" required error={form.errors.correo}>
          <TextInput
            {...form.getFieldProps('correo')}
            type="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </FormField>
        <FormField label="Rol" required error={form.errors.rol}>
          <SelectInput {...form.getFieldProps('rol')} options={ROL_OPTIONS} placeholder="Selecciona el rol" />
        </FormField>
        <FormField
          label="Teléfono"
          required
          hint="La persona invitada podrá corregirlo al activar su cuenta."
          error={form.errors.telefono}
        >
          <TextInput {...form.getFieldProps('telefono')} type="tel" autoComplete="off" />
        </FormField>
      </div>
    </fieldset>
  )
}

function InvitationLink({ enlace, venceEn }) {
  return (
    <FormField label="Enlace de invitación" hint={`Vence el ${formatDate(venceEn)}.`}>
      <TextInput value={enlace} readOnly mono onFocus={(event) => event.target.select()} />
    </FormField>
  )
}

/**
 * Formulario de la invitación y, una vez creada, el enlace para compartir con «Copiar enlace». Cerrar el formulario
 * con datos ingresados pide confirmación. `onCreada` recibe la invitación creada.
 */
function NewInvitationDialog({ onClose, onCreada }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const copiar = useCopyLink()
  const formId = useId()
  // El mismo diálogo pasa del formulario al enlace: el foco va al primer campo y, después, a «Copiar enlace».
  const focoRef = useRef(null)
  const form = useForm({ initialValues: INITIAL_VALUES, validate: validateInvitacion })
  const [creada, setCreada] = useState(null)

  useEffect(() => {
    if (creada) focoRef.current?.focus()
  }, [creada])

  async function crearInvitacion(values) {
    try {
      const invitacion = await crear(values, usuario.id)
      toast.success(`Invitación creada para ${getFullName(invitacion)}.`)
      onCreada(invitacion)
      setCreada(invitacion)
    } catch (error) {
      // 400 y 409 (el correo ya tiene cuenta o una invitación pendiente) traen el mensaje de cada campo.
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
    }
  }

  async function cerrar() {
    if (form.isSubmitting) return
    if (!creada && form.isDirty) {
      const descartar = await confirm({
        title: '¿Descartar la invitación?',
        message: 'Se perderán los datos que ingresaste.',
        confirmText: 'Descartar',
        cancelText: 'Seguir editando',
        variant: 'destructive',
      })
      if (!descartar) return
    }
    onClose()
  }

  if (creada) {
    const enlace = enlaceDeInvitacion(creada.token)
    const rol = formatRol(creada.rol).toLowerCase()
    return (
      <Modal
        open
        onClose={cerrar}
        size="lg"
        initialFocusRef={focoRef}
        title="Invitación creada"
        description={`Comparte este enlace con ${getFullName(creada)} para que active su cuenta de ${rol}.`}
        footer={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Listo
            </Button>
            <Button ref={focoRef} onClick={() => copiar(enlace)}>
              Copiar enlace
            </Button>
          </>
        }
      >
        <InvitationLink enlace={enlace} venceEn={creada.venceEn} />
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={cerrar}
      size="lg"
      initialFocusRef={focoRef}
      title="Nueva invitación"
      description="Generaremos un enlace para que la persona invitada active su cuenta. Vence a los 7 días."
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={form.isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={form.isSubmitting} loadingText="Creando invitación…">
            Crear invitación
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(crearInvitacion)} noValidate>
        <InvitationFields form={form} firstFieldRef={focoRef} />
      </form>
    </Modal>
  )
}

/** «Nueva invitación» (HU-1 · 1.4). Se monta al abrirse, así cada vez empieza con el formulario vacío. */
export default function NewInvitationModal({ open, onClose, onCreada }) {
  return open ? <NewInvitationDialog onClose={onClose} onCreada={onCreada} /> : null
}
