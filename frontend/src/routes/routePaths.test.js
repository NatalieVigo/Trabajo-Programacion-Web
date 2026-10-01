import { describe, expect, it } from 'vitest'
import {
  ROUTES,
  invitacionPath,
  landingSectionPath,
  recuperarContrasenaPath,
  restablecerContrasenaPath,
} from './routePaths.js'

describe('routePaths', () => {
  it('define rutas absolutas y sin repetir', () => {
    const paths = Object.values(ROUTES).filter((path) => path !== ROUTES.notFound)

    expect(new Set(paths).size).toBe(paths.length)
    paths.forEach((path) => expect(path.startsWith('/')).toBe(true))
    expect(ROUTES.supervisorInvitaciones).toBe('/supervisor/invitaciones')
  })

  it('construye las rutas con parámetros', () => {
    expect(invitacionPath('INV-TEC-2026-DEMO')).toBe('/invitacion/INV-TEC-2026-DEMO')
    expect(restablecerContrasenaPath('a1b2c3')).toBe('/restablecer-contrasena/a1b2c3')
    expect(landingSectionPath('tiempos')).toEqual({ pathname: '/', hash: '#tiempos' })
    expect(recuperarContrasenaPath('camila.quispe@aloe.ulima.edu.pe')).toEqual({
      pathname: '/recuperar-contrasena',
      search: '?correo=camila.quispe%40aloe.ulima.edu.pe',
    })
  })
})
