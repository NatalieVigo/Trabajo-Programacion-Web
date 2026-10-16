import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO, renderApp, ubicacionActual } from '../test/test-utils.jsx'

const PILDORA = { usuario: 'Mis tickets abiertos', tecnico: 'Asignados a mí', supervisor: 'Cola sin asignar' }

describe('GuestOnly', () => {
  it.each([
    ['usuario', '/iniciar-sesion', 'Mis tickets', '/usuario/tickets'],
    ['tecnico', '/registro', 'Mi bandeja', '/tecnico'],
    ['supervisor', '/recuperar-contrasena', 'Tablero de métricas', '/supervisor'],
    ['usuario', '/restablecer-contrasena/a1b2c3', 'Mis tickets', '/usuario/tickets'],
  ])('con la sesión de %s, %s lleva a la vista del rol', async (rol, ruta, titulo, inicio) => {
    renderApp(ruta, { usuario: DEMO[rol] })

    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
    expect(ubicacionActual()).toBe(inicio)
    expect(screen.queryByRole('heading', { level: 1, name: 'Iniciar sesión' })).not.toBeInTheDocument()
    await screen.findByText(PILDORA[rol])
  })

  it.each([
    ['/iniciar-sesion', 'Iniciar sesión'],
    ['/registro', 'Crear mi cuenta'],
    ['/recuperar-contrasena', 'Recuperar mi contraseña'],
    ['/restablecer-contrasena/a1b2c3', 'No encontramos este enlace'],
  ])('sin sesión, %s se muestra normalmente', async (ruta, titulo) => {
    renderApp(ruta)

    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
    expect(ubicacionActual()).toBe(ruta)
  })
})
