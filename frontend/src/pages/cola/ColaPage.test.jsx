import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ticketsRepository } from '../../repositories/tickets.repository.js'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

describe('HU-4 · cola y bandeja', () => {
  it('asigna desde «Sin asignar» y el técnico puede abrir la bitácora existente', async () => {
    const { user, unmount } = renderApp('/supervisor/cola', { usuario: DEMO.supervisor })
    await screen.findByRole('table', { name: 'Tickets de la cola de atención' })
    await user.click(screen.getByRole('button', { name: 'Asignar TCK-2026-00147' }))
    const modal = screen.getByRole('dialog', { name: 'Asignar TCK-2026-00147' })
    await user.click(within(modal).getByRole('radio', { name: /Julio Paredes Soto/ }))
    await user.type(within(modal).getByRole('textbox', { name: 'Nota para el técnico' }), 'Atender antes de la clase.')
    await user.click(within(modal).getByRole('button', { name: 'Asignar' }))
    await waitFor(() => expect(ticketsRepository.findById('tck-00147').asignadoA).toBe(DEMO.tecnico))
    unmount()

    const bandeja = renderApp('/tecnico', { usuario: DEMO.tecnico })
    await screen.findByRole('table', { name: 'Tickets asignados a mí' })
    await bandeja.user.click(screen.getByRole('link', { name: 'Abrir bitácora de TCK-2026-00147' }))
    expect(ubicacionActual()).toBe('/tecnico/tickets/TCK-2026-00147')
    expect(await screen.findByRole('heading', { name: /Bitácora/ })).toBeInTheDocument()
  })

  it('las acciones en lote cambian prioridad y devuelven un ticket con confirmación', async () => {
    const { user } = renderApp('/supervisor/cola', { usuario: DEMO.supervisor })
    await screen.findByRole('table', { name: 'Tickets de la cola de atención' })
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar TCK-2026-00144' }))
    await user.click(screen.getByRole('button', { name: 'Cambiar prioridad' }))
    const modal = screen.getByRole('dialog', { name: 'Cambiar prioridad' })
    await user.click(within(modal).getByRole('radio', { name: 'Baja' }))
    await user.type(within(modal).getByRole('textbox', { name: 'Motivo (obligatorio)' }), 'La falla tiene una solución temporal.')
    await user.click(within(modal).getByRole('button', { name: 'Guardar prioridad' }))
    await waitFor(() => expect(ticketsRepository.findById('tck-00144').prioridad).toBe('baja'))

    await screen.findByRole('table', { name: 'Tickets de la cola de atención' })
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar TCK-2026-00144' }))
    await user.click(screen.getByRole('button', { name: 'Devolver a la cola' }))
    const confirmacion = screen.getByRole('alertdialog', { name: /Devolver 1 ticket a la cola/ })
    await user.click(within(confirmacion).getByRole('button', { name: 'Devolver a la cola' }))
    await waitFor(() => expect(ticketsRepository.findById('tck-00144')).toMatchObject({ estado: 'abierto', asignadoA: null }))
  })

  it('los indicadores filtran abiertos y solo resueltos de hoy', async () => {
    const { user } = renderApp('/supervisor/cola', { usuario: DEMO.supervisor })
    await screen.findByRole('table', { name: 'Tickets de la cola de atención' })
    await user.click(screen.getByRole('button', { name: /Abiertos 2/ }))
    expect(screen.getAllByRole('row')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: /Resueltos hoy 0/ }))
    expect(screen.getByText('No hay tickets con estos filtros')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(screen.getAllByRole('row')).toHaveLength(7)
  })

  it('no permite devolver a la cola un ticket que ya está sin asignar', async () => {
    const { user } = renderApp('/supervisor/cola', { usuario: DEMO.supervisor })
    await screen.findByRole('table', { name: 'Tickets de la cola de atención' })
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar TCK-2026-00147' }))
    expect(screen.getByRole('button', { name: 'Devolver a la cola' })).toBeDisabled()
  })

  it('el indicador Abiertos de la bandeja muestra solo los tickets abiertos', async () => {
    const { user } = renderApp('/tecnico', { usuario: DEMO.tecnico })
    await screen.findByRole('table', { name: 'Tickets asignados a mí' })
    await user.click(screen.getByRole('button', { name: /Abiertos/ }))
    expect(screen.getByText('No hay tickets con este filtro')).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/tecnico?vista=abiertos')
  })
})
