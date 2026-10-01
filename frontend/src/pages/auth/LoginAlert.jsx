import { useEffect, useId, useRef, useState } from 'react'
import { recuperarContrasenaPath } from '../../routes/routePaths.js'
import { Alert, Button } from '../../shared/components'

const CORREO_SOPORTE = 'soporte.campus@ulima.edu.pe'

function CuentaBloqueadaAlert({ message, correo, ...rest }) {
  const [soporteVisible, setSoporteVisible] = useState(false)
  const soporteId = useId()

  return (
    <Alert
      {...rest}
      variant="warning"
      actions={
        <>
          <Button to={recuperarContrasenaPath(correo)}>Restablecer contraseña</Button>
          <Button
            variant="tertiary"
            aria-expanded={soporteVisible}
            aria-controls={soporteId}
            onClick={() => setSoporteVisible((visible) => !visible)}
          >
            Escribir a soporte
          </Button>
          <p id={soporteId} className="login-alert__support" hidden={!soporteVisible}>
            Escríbenos a <a href={`mailto:${CORREO_SOPORTE}`}>{CORREO_SOPORTE}</a>. Atendemos de lunes a sábado, de
            07:00 a 21:00.
          </p>
        </>
      }
    >
      {message}
    </Alert>
  )
}

/**
 * Mensaje del formulario de acceso según el error del servicio (p05): credenciales incorrectas con los intentos que
 * quedan, cuenta bloqueada por intentos (con «Restablecer contraseña» y «Escribir a soporte») o bloqueada por el
 * supervisor. Con `enfocar` recibe el foco al aparecer: el teclado sigue desde el aviso y no desde el inicio de la
 * página.
 */
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
