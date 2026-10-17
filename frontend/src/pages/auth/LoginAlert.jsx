import { useEffect, useRef } from 'react'
import { recuperarContrasenaPath } from '../../routes/routePaths.js'
import { Alert, Button } from '../../shared/components'

const CORREO_SOPORTE = 'soporte.campus@ulima.edu.pe'

function CuentaBloqueadaAlert({ message, correo, ...rest }) {
  return (
    <Alert
      {...rest}
      variant="warning"
      actions={
        <>
          <Button to={recuperarContrasenaPath(correo)}>Restablecer contraseña</Button>
          <Button variant="tertiary" href={`mailto:${CORREO_SOPORTE}`}>
            Escribir a soporte
          </Button>
        </>
      }
    >
      {message}
    </Alert>
  )
}

// con enfocar, el aviso toma el foco para que el teclado siga desde ahí
export default function LoginAlert({ error, correo, enfocar = false }) {
  const alertRef = useRef(null)

  useEffect(() => {
    if (enfocar) alertRef.current?.focus()
  }, [error, enfocar])

  const props = { ref: alertRef, tabIndex: enfocar ? -1 : undefined, className: 'login-alert' }
  if (error.code === 'ACCOUNT_LOCKED') return <CuentaBloqueadaAlert {...props} message={error.message} correo={correo} />
  return (
    <Alert {...props} variant="error">
      {error.message}
    </Alert>
  )
}
