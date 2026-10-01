import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { ROUTES } from './routePaths.js'

/**
 * Ruta de layout que exige sesión. Sin ella lleva a «Iniciar sesión» recordando en state.from la página pedida,
 * para volver a ella después de ingresar.
 */
export default function RequireAuth() {
  const { estado } = useAuth()
  const { pathname, search, hash } = useLocation()

  if (estado !== 'autenticado') {
    return <Navigate to={ROUTES.iniciarSesion} replace state={{ from: { pathname, search, hash } }} />
  }
  return <Outlet />
}
