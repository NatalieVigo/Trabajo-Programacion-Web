import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readTable, writeTable } from '../repositories/db.js'
import { DEMO, renderApp } from '../test/test-utils.jsx'

// Una ruta pública sin datos asíncronos: el layout es el mismo que el de la landing.
const RUTA_PUBLICA = '/pagina-de-prueba'

describe('PublicLayout', () => {
  it('la cabecera enlaza las secciones de la landing y el acceso', () => {
    renderApp(RUTA_PUBLICA)

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Inicio', '/'],
      ['Cómo reportar', '/#como-reportar'],
      ['Categorías de servicio', '/#categorias'],
      ['Tiempos de atención', '/#tiempos'],
    ])
    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/iniciar-sesion')
    expect(within(banner).getByRole('link', { name: 'Registrarme' })).toHaveAttribute('href', '/registro')
  })

  it('con la sesión iniciada ofrece «Ir a mi panel» en lugar de ingresar o registrarse', async () => {
    renderApp(RUTA_PUBLICA, { usuario: DEMO.tecnico })

    const banner = await screen.findByRole('banner')
    expect(within(banner).getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute('href', '/tecnico')
    expect(within(banner).queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(within(banner).queryByRole('link', { name: 'Registrarme' })).not.toBeInTheDocument()
  })

  it('el botón «Menú» despliega y pliega la navegación', async () => {
    const { user } = renderApp(RUTA_PUBLICA)
    const toggle = screen.getByRole('button', { name: 'Menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()

    await user.click(toggle)
    await user.click(screen.getByRole('main'))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    await user.click(screen.getByRole('link', { name: 'Tiempos de atención' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('region', { name: 'Tiempos de atención esperados' })).toHaveFocus()
    expect(await screen.findByRole('heading', { level: 3, name: 'Audiovisuales' })).toBeInTheDocument()
  })

  it('un hash mal codificado en la URL no rompe la página', async () => {
    renderApp('/#%')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Reporta una falla del campus y sigue su atención en un solo lugar' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: 'Audiovisuales' })).toBeInTheDocument()
  })

  it('el pie muestra los datos de contacto de la mesa de ayuda', () => {
    renderApp(RUTA_PUBLICA)

    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText('Mesa de Ayuda de Servicios')).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'soporte.campus@ulima.edu.pe' })).toHaveAttribute(
      'href',
      'mailto:soporte.campus@ulima.edu.pe',
    )
    expect(within(footer).getByText('Emergencias eléctricas · anexo 30111')).toBeInTheDocument()
    expect(within(footer).getByRole('navigation', { name: 'Reportar' })).toBeInTheDocument()
    expect(within(footer).getByRole('navigation', { name: 'Ayuda' })).toBeInTheDocument()
  })

  it('en desarrollo restablece los datos de demostración tras confirmar', async () => {
    writeTable('categorias', [])
    const { user } = renderApp(RUTA_PUBLICA)

    await user.click(screen.getByRole('button', { name: 'Restablecer datos de demostración' }))
    const dialog = await screen.findByRole('alertdialog', { name: '¿Restablecer los datos de demostración?' })
    await user.click(within(dialog).getByRole('button', { name: 'Restablecer datos' }))

    expect(await screen.findByText('Datos de demostración restablecidos. La página se recargará.')).toBeInTheDocument()
    expect(readTable('categorias')).toHaveLength(7)
  })

  it('si se cancela la confirmación no cambia los datos', async () => {
    writeTable('categorias', [])
    const { user } = renderApp(RUTA_PUBLICA)

    await user.click(screen.getByRole('button', { name: 'Restablecer datos de demostración' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(readTable('categorias')).toEqual([])
  })
})
