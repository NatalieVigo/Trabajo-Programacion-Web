import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encuestasRepository } from '../../repositories/tickets.repository.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

const resumen = () => screen.getByRole('region', { name: 'Tu resumen' })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime('2026-10-01T15:00:00.000Z')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('UserHomePage', () => {
  it('da la bienvenida y resume los tickets y encuestas del usuario', async () => {
    renderApp('/usuario', { usuario: DEMO.usuario })

    expect(await screen.findByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument()
    expect(
      screen.getByText('Te damos la bienvenida, Camila. Desde aquí reportas fallas del campus y sigues su atención.'),
    ).toBeInTheDocument()
    await within(resumen()).findByText('Tickets abiertos')
    const valores = within(resumen())
      .getAllByRole('term')
      .map((termino) => [termino.textContent, termino.nextElementSibling.textContent])
    expect(valores).toEqual([
      ['Tickets abiertos', '3'],
      ['Tickets reportados', '12'],
      ['Encuestas pendientes', '1'],
      ['Encuestas respondidas', '7'],
    ])
    expect(document.title).toBe('Inicio · Mesa de Ayuda')
    await screen.findByText('Mis tickets abiertos')
  })

  it('ofrece accesos rápidos a «Nuevo ticket» y «Mis tickets»', async () => {
    const { user } = renderApp('/usuario', { usuario: DEMO.usuario })

    const accesos = await screen.findByRole('region', { name: 'Accesos rápidos' })
    expect(within(accesos).getByRole('link', { name: 'Nuevo ticket' })).toHaveAttribute('href', '/usuario/tickets/nuevo')
    expect(within(accesos).getByText('Reporta una falla indicando la categoría y el ambiente afectado.')).toBeInTheDocument()
    await within(resumen()).findByText('Tickets reportados')

    await user.click(within(accesos).getByRole('link', { name: 'Mis tickets' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis tickets' })).toBeInTheDocument()
    await screen.findByText('Mis tickets abiertos')
  })

  it('un usuario sin tickets ve el estado vacío con el acceso para registrar uno', async () => {
    renderApp('/usuario', { usuario: DEMO.sinTickets })

    expect(await screen.findByRole('heading', { level: 3, name: 'Aún no registras tickets' })).toBeInTheDocument()
    expect(within(resumen()).getByRole('link', { name: 'Registrar un ticket' })).toHaveAttribute(
      'href',
      '/usuario/tickets/nuevo',
    )
    expect(within(resumen()).queryByRole('term')).not.toBeInTheDocument()
    await screen.findByText('Mis tickets abiertos')
  })

  it('si no puede cargar el resumen lo informa y permite reintentar', async () => {
    const findAll = vi.spyOn(encuestasRepository, 'findAll').mockImplementation(() => {
      throw new Error('Sin conexión')
    })
    const { user } = renderApp('/usuario', { usuario: DEMO.usuario })

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tu resumen.')

    findAll.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await within(resumen()).findByText('Tickets reportados')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
