import { describe, expect, it } from 'vitest'
import { PRIVATE_ROUTES, canAccess } from './routeAccess.js'
import { ROUTES } from './routePaths.js'

const RUTAS_PUBLICAS = [
  ROUTES.home,
  ROUTES.registro,
  ROUTES.invitacion,
  ROUTES.iniciarSesion,
  ROUTES.recuperarContrasena,
  ROUTES.restablecerContrasena,
  ROUTES.notFound,
]

describe('routeAccess', () => {
  it('declara una sola vez cada ruta privada de la aplicación', () => {
    const privadas = Object.values(ROUTES).filter((path) => !RUTAS_PUBLICAS.includes(path))

    expect(PRIVATE_ROUTES.map(({ path }) => path).sort()).toEqual(privadas.sort())
  })

  it('las rutas exclusivas de un rol nombran el recurso que muestran, para la vista 403', () => {
    const exclusivas = PRIVATE_ROUTES.filter(({ roles }) => roles.length === 1)

    expect(exclusivas).toHaveLength(14)
    exclusivas.forEach(({ recurso }) => expect(recurso).toMatch(/^(el|la|los|las) \S/))
    expect(PRIVATE_ROUTES.find(({ path }) => path === '/supervisor/cola').recurso).toBe('la cola de atención')
  })

  it.each([
    ['usuario', '/usuario', true],
    ['usuario', '/usuario/tickets/nuevo', true],
    ['usuario', '/supervisor/cola', false],
    ['usuario', '/tecnico', false],
    ['tecnico', '/tecnico/historial', true],
    ['tecnico', '/usuario', false],
    ['tecnico', '/supervisor/invitaciones', false],
    ['supervisor', '/supervisor/invitaciones', true],
    ['supervisor', '/usuario/encuestas', false],
  ])('%s en %s: %s', (rol, pathname, permitido) => {
    expect(canAccess(rol, pathname)).toBe(permitido)
  })

  it('todas las cuentas ven «Mi cuenta» y la vista de acceso denegado', () => {
    for (const rol of ['usuario', 'tecnico', 'supervisor']) {
      expect(canAccess(rol, '/mi-cuenta')).toBe(true)
      expect(canAccess(rol, '/acceso-denegado')).toBe(true)
    }
  })

  it('reconoce la ruta igual que el router: sin distinguir mayúsculas y con barra final', () => {
    expect(canAccess('supervisor', '/Supervisor/Cola/')).toBe(true)
    expect(canAccess('usuario', '/usuario/tickets/')).toBe(true)
  })

  it('no concede rutas que no son privadas ni roles desconocidos', () => {
    expect(canAccess('usuario', '/')).toBe(false)
    expect(canAccess('usuario', '/registro')).toBe(false)
    expect(canAccess('usuario', '/usuario/tickets/TCK-2026-00147')).toBe(false)
    expect(canAccess('administrador', '/mi-cuenta')).toBe(false)
    expect(canAccess(undefined, '/mi-cuenta')).toBe(false)
  })
})
