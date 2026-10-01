import { restablecerContrasenaPath } from '../../routes/routePaths.js'
import { Alert, Button } from '../../shared/components'

const TITULO = 'Bandeja simulada · solo entrega 1'

/**
 * La entrega 1 no envía correos: este aviso muestra lo que llegaría a la bandeja de entrada. Con `tokenDemo` (la
 * cuenta existe) permite abrir el enlace de restablecimiento; sin él, indica que no llegó ningún correo.
 */
export default function SimulatedInbox({ tokenDemo }) {
  return (
    <Alert
      variant="info"
      title={TITULO}
      aria-label={TITULO}
      className="recovery-page__inbox"
      actions={
        tokenDemo && (
          <Button to={restablecerContrasenaPath(tokenDemo)} variant="secondary" size="sm">
            Abrir enlace de restablecimiento
          </Button>
        )
      }
    >
      {tokenDemo
        ? 'Llegó el correo con el enlace para restablecer tu contraseña.'
        : 'No llegó ningún correo a esta dirección.'}
    </Alert>
  )
}
