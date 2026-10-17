import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ticketsRepository } from '../../repositories/tickets.repository.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

describe('historia 4 integrada', () => {
  it('permite al técnico confirmar la autoasignación desde Disponibles', async () => {
    const { user } = renderApp('/tecnico?vista=disponibles', { usuario: DEMO.tecnico })
    await screen.findByRole('button', { name: 'Autoasignarme' })
    await user.click(screen.getByRole('button', { name: 'Autoasignarme' }))

    const dialogo = screen.getByRole('alertdialog', {
      name: '¿Autoasignar TCK-2026-00147?',
    })
    await user.click(
      within(dialogo).getByRole('button', { name: 'Confirmar autoasignación' }),
    )

    await waitFor(() =>
      expect(ticketsRepository.findById('tck-00147').asignadoA).toBe(DEMO.tecnico),
    )
    expect(
      await screen.findByRole('link', { name: 'Abrir bitácora de TCK-2026-00147' }),
    ).toBeInTheDocument()
  })

  it('ofrece reasignar un ticket y pide el motivo antes de guardarlo', async () => {
    const { user } = renderApp('/supervisor/cola', { usuario: DEMO.supervisor })
    await screen.findByRole('table', { name: 'Tickets de la cola de atención' })
    const botones = screen.getAllByRole('button', { name: /^Reasignar TCK/ })
    await user.click(botones[0])
    const modal = screen.getByRole('dialog')
    expect(
      within(modal).getByRole('textbox', { name: /Motivo de la reasignación/ }),
    ).toBeInTheDocument()
  })
})
