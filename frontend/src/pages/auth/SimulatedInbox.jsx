import { restablecerContrasenaPath } from '../../routes/routePaths.js'
import { Alert, Button } from '../../shared/components'

const TITULO = 'Bandeja simulada · solo entrega 1'

// Como todavía no se mandan correos, aquí se simula lo que llegaría a la bandeja.
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
