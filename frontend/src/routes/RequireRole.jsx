import { useAuth } from '../hooks/useAuth.js'
import ForbiddenPage from '../pages/errors/ForbiddenPage.jsx'

// Si el rol no puede verla, muestra el 403 dentro del layout y sin cambiar la URL.
export default function RequireRole({ roles, recurso, children }) {
  const { usuario } = useAuth()

  if (!roles.includes(usuario.rol)) {
    // la key reinicia la vista al pasar de un recurso prohibido a otro
    return <ForbiddenPage key={recurso} recurso={recurso} rolesPermitidos={roles} />
  }
  return children
}
