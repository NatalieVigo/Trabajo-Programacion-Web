import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/test-utils.jsx'
import { useConfirm } from './useConfirm.js'

function DeleteAction({ onResult }) {
  const confirm = useConfirm()

  async function handleClick() {
    onResult(
      await confirm({
        title: '¿Rechazar la invitación?',
        message: 'No podrás activar tu cuenta con este enlace.',
        confirmText: 'Rechazar invitación',
        variant: 'destructive',
      }),
    )
  }

  return (
    <button type="button" onClick={handleClick}>
      Rechazar
    </button>
  )
}

function setup() {
  const onResult = vi.fn()
  const view = renderWithProviders(<DeleteAction onResult={onResult} />)
  return { ...view, onResult }
}

async function openDialog(user) {
  await user.click(screen.getByRole('button', { name: 'Rechazar' }))
  return screen.findByRole('alertdialog', { name: '¿Rechazar la invitación?' })
}

describe('ConfirmDialog + useConfirm', () => {
  it('muestra el mensaje, enfoca «Cancelar» y resuelve true al confirmar', async () => {
    const { user, onResult } = setup()

    const dialog = await openDialog(user)

    expect(dialog).toHaveAccessibleDescription('No podrás activar tu cuenta con este enlace.')
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Rechazar invitación' }))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rechazar' })).toHaveFocus()
  })

  it('resuelve false al cancelar', async () => {
    const { user, onResult } = setup()

    const dialog = await openDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('resuelve false al presionar Esc', async () => {
    const { user, onResult } = setup()

    await openDialog(user)
    await user.keyboard('{Escape}')

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false))
  })

  it('mantiene el foco dentro del diálogo al tabular', async () => {
    const { user } = setup()

    const dialog = await openDialog(user)
    const cancelar = within(dialog).getByRole('button', { name: 'Cancelar' })
    const confirmar = within(dialog).getByRole('button', { name: 'Rechazar invitación' })

    await user.tab()
    expect(confirmar).toHaveFocus()
    await user.tab()
    expect(cancelar).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirmar).toHaveFocus()
  })
})
