import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO, renderApp, ubicacionActual } from '../test/test-utils.jsx'

const campo = (label) => screen.getByLabelText(label)

async function ingresar(user, correo, password) {
  await user.type(campo('Correo institucional'), correo)
  await user.type(campo('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('RequireAuth', () => {
  it('sin sesión, una página privada lleva a «Iniciar sesión»', () => {
    renderApp('/supervisor/cola')

    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/iniciar-sesion')
    expect(screen.queryByRole('heading', { level: 1, name: 'Cola de atención' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Supervisión' })).not.toBeInTheDocument()
  })

  it('después de ingresar vuelve a la página que se pidió, con su búsqueda, si el rol puede verla', async () => {
    const { user } = renderApp('/usuario/tickets?codigo=TCK-2026-00147')

    await ingresar(user, 'camila.quispe@aloe.ulima.edu.pe', 'Camila2026')

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis tickets' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/usuario/tickets?codigo=TCK-2026-00147')
    expect(screen.getByText('TCK-2026-00147')).toBeInTheDocument()
    expect(await screen.findByText('Mis tickets abiertos')).toBeInTheDocument()
  })

  it('después de ingresar no lleva a una página que el rol no puede ver, sino a su vista principal', async () => {
    const { user } = renderApp('/supervisor/cola')

    await ingresar(user, 'jparedes@ulima.edu.pe', 'Tecnico2026')

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi bandeja' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/tecnico')
    expect(screen.queryByText('403')).not.toBeInTheDocument()
    expect(await screen.findByText('Te damos la bienvenida, Julio. Tienes 8 tickets asignados.')).toBeInTheDocument()
    expect(await screen.findByText('Asignados a mí')).toBeInTheDocument()
  })

  it('con sesión muestra la página privada dentro del layout de la aplicación', async () => {
    renderApp('/tecnico/historial', { usuario: DEMO.tecnico })

    expect(await screen.findByRole('heading', { level: 1, name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Atención' })).toBeInTheDocument()
    expect(await screen.findByText('Asignados a mí')).toBeInTheDocument()
  })
})
