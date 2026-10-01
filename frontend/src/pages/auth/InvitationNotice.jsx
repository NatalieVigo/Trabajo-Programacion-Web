import { ROUTES } from '../../routes/routePaths.js'
import { Badge, Button, MessageCard } from '../../shared/components'
import { formatDate } from '../../utils/format.js'

const AVISOS = {
  vencida: {
    tone: 'warning',
    etiqueta: 'Invitación vencida',
    titulo: (invitacion) => `Esta invitación venció el ${formatDate(invitacion.venceEn)}`,
    descripcion: 'Pide al supervisor que te envíe una nueva invitación para activar tu cuenta.',
  },
  aceptada: {
    tone: 'success',
    etiqueta: 'Invitación aceptada',
    titulo: () => 'Esta invitación ya fue aceptada',
    descripcion: 'La cuenta ya está activa: ingresa con tu correo institucional y tu contraseña.',
  },
  rechazada: {
    tone: 'neutral',
    etiqueta: 'Invitación rechazada',
    titulo: () => 'Esta invitación fue rechazada',
    descripcion: 'Si fue un error, pide al supervisor que te envíe una nueva invitación.',
  },
  revocada: {
    tone: 'neutral',
    etiqueta: 'Invitación revocada',
    titulo: () => 'Esta invitación fue revocada',
    descripcion: 'El supervisor la anuló. Si necesitas acceso a la Mesa de Ayuda, pídele una nueva invitación.',
  },
}

const volverAlInicio = <Button to={ROUTES.home}>Ir al inicio</Button>

/**
 * Aviso de una invitación con la que ya no se puede activar la cuenta (vencida, aceptada, rechazada o revocada) o que
 * no existe (sin `invitacion`). Sigue el patrón de mensajes de p09 y lleva al inicio.
 */
export default function InvitationNotice({ invitacion }) {
  if (!invitacion) {
    return (
      <MessageCard
        code="404"
        title="No encontramos esta invitación"
        description="Revisa que el enlace esté completo o pide al supervisor que te envíe uno nuevo."
        actions={volverAlInicio}
        focusTitle
      />
    )
  }

  const { tone, etiqueta, titulo, descripcion } = AVISOS[invitacion.estadoEfectivo]
  return (
    <MessageCard
      badge={
        <Badge tone={tone} uppercase>
          {etiqueta}
        </Badge>
      }
      title={titulo(invitacion)}
      description={descripcion}
      actions={volverAlInicio}
      focusTitle
    />
  )
}
