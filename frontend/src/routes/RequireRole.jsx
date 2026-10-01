import { useAuth } from '../hooks/useAuth.js'
import ForbiddenPage from '../pages/errors/ForbiddenPage.jsx'

/**
 * Muestra la página solo si el rol de la sesión está entre `roles` (los de la tabla de routeAccess.js). Si no, en su
 * lugar muestra la vista 403 dentro del layout y sin cambiar la URL (p11), con el `recurso` que se intentó ver.
 */
export default function RequireRole({ roles, recurso, children }) {
  const { usuario } = useAuth()

  if (!roles.includes(usuario.rol)) {
    // La clave reinicia la vista (y su «Solicitar acceso») al pasar de un recurso prohibido a otro.
    return <ForbiddenPage key={recurso} recurso={recurso} rolesPermitidos={roles} />
  }
  return children
}
