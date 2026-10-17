import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { getRoleHome } from './roleHome.js'

export default function GuestOnly() {
  const { estado, usuario } = useAuth()

  if (estado === 'autenticado') return <Navigate to={getRoleHome(usuario.rol).path} replace />
  return <Outlet />
}
