import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { getRoleHome } from './roleHome.js'

/**
 * Ruta de layout de las páginas para visitantes (registro, ingreso y recuperación de contraseña): con la sesión
 * iniciada llevan a la vista principal del rol.
 */
export default function GuestOnly() {
  const { estado, usuario } = useAuth()

  if (estado === 'autenticado') return <Navigate to={getRoleHome(usuario.rol).path} replace />
  return <Outlet />
}
