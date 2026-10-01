import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/auth.service.js'
import { PageLoader } from '../shared/components'
import { AuthContext } from './AuthContext.js'

const ANONIMO = { estado: 'anonimo', usuario: null }
const autenticado = (usuario) => ({ estado: 'autenticado', usuario })
const segunSesion = (sesion) => (sesion ? autenticado(sesion.usuario) : ANONIMO)

// Solo hay algo que restaurar si el navegador guardó una sesión: sin ella la aplicación se muestra de inmediato.
const estadoInicial = () => (authService.haySesionGuardada() ? { estado: 'cargando', usuario: null } : ANONIMO)

/**
 * Sesión de la aplicación (HU-1 · 1.3). Al montarse restaura la sesión guardada y, mientras tanto, muestra un
 * indicador a pantalla completa. Expone { usuario, estado, iniciarSesion, cerrarSesion, refrescarUsuario }.
 */
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

  /**
   * Inicia la sesión y devuelve el usuario. `alIngresar(usuario)` (por ejemplo, navegar a la vista del rol) se aplica
   * en la misma transición que el cambio de sesión, igual que al cerrarla: la página de acceso nunca se muestra con
   * la sesión ya iniciada.
   */
  const iniciarSesion = useCallback(async (credenciales, alIngresar) => {
    const { usuario } = await authService.iniciarSesion(credenciales)
    startTransition(() => {
      setSesion(autenticado(usuario))
      alIngresar?.(usuario)
    })
    return usuario
  }, [])

  /**
   * Termina la sesión. `alCerrar` (por ejemplo, navegar a la landing) se aplica en la misma transición que el cambio
   * de sesión: el router navega con transiciones y, si se aplicaran por separado, RequireAuth alcanzaría a mandar a
   * «Iniciar sesión» antes de llegar al destino.
   */
  const cerrarSesion = useCallback(async (alCerrar) => {
    await authService.cerrarSesion()
    startTransition(() => {
      setSesion(ANONIMO)
      alCerrar?.()
    })
  }, [])

  /** Vuelve a leer la cuenta (tras editarla, por ejemplo). Si ya no es válida, la sesión termina. */
  const refrescarUsuario = useCallback(async () => {
    const siguiente = segunSesion(await authService.obtenerSesion())
    setSesion(siguiente)
    return siguiente.usuario
  }, [])

  const value = useMemo(
    () => ({ ...sesion, iniciarSesion, cerrarSesion, refrescarUsuario }),
    [sesion, iniciarSesion, cerrarSesion, refrescarUsuario],
  )

  return <AuthContext value={value}>{cargando ? <PageLoader message="Cargando tu sesión…" /> : children}</AuthContext>
}
