import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { validarTokenRecuperacion } from '../../services/auth.service.js'
import { Alert, Button, Card } from '../../shared/components'
import ResetLinkNotice from './ResetLinkNotice.jsx'
import ResetPasswordForm from './ResetPasswordForm.jsx'
import './PasswordRecovery.css'

function ContenidoDelEnlace({ token, status, data, error, reload }) {
  if (status === 'loading') {
    return (
      <Card className="recovery-page__status" aria-busy="true">
        <p role="status" className="text-muted">
          Verificando el enlace…
        </p>
      </Card>
    )
  }
  if (status === 'error' && (error.status === 404 || error.status === 410)) {
    return <ResetLinkNotice code={error.code} />
  }
  if (status === 'error') {
    return (
      <Alert
        variant="error"
        className="recovery-page__status"
        actions={
          <Button variant="secondary" size="sm" onClick={reload}>
            Reintentar
          </Button>
        }
      >
        No pudimos verificar el enlace. Inténtalo otra vez.
      </Alert>
    )
  }
  return <ResetPasswordForm token={token} correo={data.correo} onEnlaceInvalido={reload} />
}

/** Nueva contraseña desde el enlace de recuperación (HU-1 · 1.6, mockup p09): /restablecer-contrasena/:token. */
export default function ResetPasswordPage() {
  const { token } = useParams()
  const validarEnlace = useCallback(() => validarTokenRecuperacion(token), [token])
  const enlace = useAsyncData(validarEnlace)
  useDocumentTitle('Nueva contraseña')

  return (
    <div className="container page recovery-page">
      <ContenidoDelEnlace token={token} {...enlace} />
    </div>
  )
}
