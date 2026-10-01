import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.js'

/**
 * Sesión actual: { usuario, estado: 'cargando' | 'autenticado' | 'anonimo', iniciarSesion(credenciales, alIngresar),
 * cerrarSesion(alCerrar), refrescarUsuario() }.
 */
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return auth
}
