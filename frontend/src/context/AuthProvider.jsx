import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/auth.service.js'
import { DB_STORAGE_KEY } from '../repositories/db.js'
import { PageLoader } from '../shared/components'
import { AuthContext } from './AuthContext.js'

const ANONIMO = { estado: 'anonimo', usuario: null }
const autenticado = (usuario) => ({ estado: 'autenticado', usuario })
const segunSesion = (sesion) => (sesion ? autenticado(sesion.usuario) : ANONIMO)

// si no hay sesión guardada no hay nada que restaurar y la app se muestra de una vez
const estadoInicial = () => (authService.haySesionGuardada() ? { estado: 'cargando', usuario: null } : ANONIMO)

// Sesión de la app (HU-1). Mientras restaura la sesión guardada muestra un loader.
export default function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(estadoInicial)
  const cargando = sesion.estado === 'cargando'

  useEffect(() => {
    if (!cargando) return undefined
    let activo = true
    authService.obtenerSesion().then(
      (restaurada) => {
        if (activo) setSesion(segunSesion(restaurada))
      },
      () => {
        if (activo) setSesion(ANONIMO)
      },
    )
    return () => {
      activo = false
    }
  }, [cargando])

  // alIngresar va en la misma transición para no ver el login con la sesión ya iniciada
  const iniciarSesion = useCallback(async (credenciales, alIngresar) => {
    const { usuario } = await authService.iniciarSesion(credenciales)
    startTransition(() => {
      setSesion(autenticado(usuario))
      alIngresar?.(usuario)
    })
    return usuario
  }, [])

  // igual que al entrar; por separado, RequireAuth mandaría al login antes del destino
  const cerrarSesion = useCallback(async (alCerrar) => {
    await authService.cerrarSesion()
    startTransition(() => {
      setSesion(ANONIMO)
      alCerrar?.()
    })
  }, [])

  const refrescarUsuario = useCallback(async () => {
    const siguiente = segunSesion(await authService.obtenerSesion())
    setSesion(siguiente)
    return siguiente.usuario
  }, [])

  // si bloquean la cuenta desde otra pestaña, esta sesión también cae
  useEffect(() => {
    if (sesion.estado !== 'autenticado') return undefined
    let activo = true
    const actualizar = () => authService.obtenerSesion().then((restaurada) => {
      if (activo) setSesion(segunSesion(restaurada))
    }, () => {})
    const desdeStorage = (event) => { if (event.key === DB_STORAGE_KEY || event.key === null) actualizar() }
    window.addEventListener('storage', desdeStorage)
    window.addEventListener('focus', actualizar)
    window.addEventListener('mesa-ayuda:cuentas-actualizadas', actualizar)
    return () => {
      activo = false
      window.removeEventListener('storage', desdeStorage)
      window.removeEventListener('focus', actualizar)
      window.removeEventListener('mesa-ayuda:cuentas-actualizadas', actualizar)
    }
  }, [sesion.estado, sesion.usuario?.id])

  const value = useMemo(
    () => ({ ...sesion, user: sesion.usuario, iniciarSesion, cerrarSesion, refrescarUsuario }),
    [sesion, iniciarSesion, cerrarSesion, refrescarUsuario],
  )

  return <AuthContext value={value}>{cargando ? <PageLoader message="Cargando tu sesión…" /> : children}</AuthContext>
}
