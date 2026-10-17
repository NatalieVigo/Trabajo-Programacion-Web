import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { ROUTES } from './routePaths.js'

// guarda la página pedida en state.from para volver ahí después del login
export default function RequireAuth() {
  const { estado } = useAuth()
  const { pathname, search, hash } = useLocation()

  if (estado !== 'autenticado') {
    return <Navigate to={ROUTES.iniciarSesion} replace state={{ from: { pathname, search, hash } }} />
  }
  return <Outlet />
}
