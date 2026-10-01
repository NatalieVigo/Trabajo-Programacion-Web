import { ROUTES } from '../../routes/routePaths.js'
import { Badge, Button, MessageCard } from '../../shared/components'

const AVISOS = {
  RESET_TOKEN_NOT_FOUND: {
    codigo: '404',
    titulo: 'No encontramos este enlace',
    descripcion: 'Revisa que el enlace esté completo. Si pediste más de uno, solo sirve el del correo más reciente.',
  },
  RESET_TOKEN_EXPIRED: {
    etiqueta: { tono: 'warning', texto: 'Enlace vencido' },
    titulo: 'Este enlace venció',
    descripcion: 'Los enlaces para restablecer la contraseña son válidos por 30 minutos. Solicita uno nuevo.',
  },
  RESET_TOKEN_USED: {
    etiqueta: { tono: 'neutral', texto: 'Enlace usado' },
    titulo: 'Este enlace ya se usó',
    descripcion: 'Cada enlace sirve una sola vez. Si necesitas cambiar tu contraseña otra vez, solicita uno nuevo.',
  },
}

/**
 * Aviso de un enlace de restablecimiento que ya no sirve, con el patrón de mensajes de p09: no existe o se pidió otro
 * después (404), venció o ya se usó (410). Lleva a pedir un enlace nuevo.
 */
export default function ResetLinkNotice({ code }) {
  const { codigo, etiqueta, titulo, descripcion } = AVISOS[code] ?? AVISOS.RESET_TOKEN_NOT_FOUND

  return (
    <MessageCard
      code={codigo}
      badge={
        etiqueta && (
          <Badge tone={etiqueta.tono} uppercase>
            {etiqueta.texto}
          </Badge>
        )
      }
      title={titulo}
      description={descripcion}
      actions={
        <>
          <Button to={ROUTES.recuperarContrasena}>Solicitar un nuevo enlace</Button>
          <Button to={ROUTES.iniciarSesion} variant="secondary">
            Volver a iniciar sesión
          </Button>
        </>
      }
      focusTitle
    />
  )
}
