import { act, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/test-utils.jsx'
import { useToast } from './useToast.js'

function SaveButton() {
  const toast = useToast()
  return (
    <>
      <button type="button" onClick={() => toast.success('Cambios guardados correctamente.')}>
        Guardar
      </button>
      <button type="button" onClick={() => toast.error('No pudimos guardar los cambios.')}>
        Fallar
      </button>
    </>
  )
}

function ToastOnMount({ message }) {
  const toast = useToast()
  useEffect(() => {
    toast.info(message)
  }, [toast, message])
  return null
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastProvider + useToast', () => {
  it('muestra el mensaje en la región de notificaciones', async () => {
    const { user } = renderWithProviders(<SaveButton />)

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const region = screen.getByRole('status', { name: 'Notificaciones' })
    expect(within(region).getByText('Cambios guardados correctamente.')).toBeInTheDocument()
    expect(region).toHaveTextContent('Éxito: Cambios guardados correctamente.')
  })

  it('apila varias notificaciones y permite cerrarlas', async () => {
    const { user } = renderWithProviders(<SaveButton />)

    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(screen.getByRole('button', { name: 'Fallar' }))
    expect(screen.getAllByRole('button', { name: 'Cerrar notificación' })).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: 'Cerrar notificación' })[0])

    expect(screen.queryByText('Cambios guardados correctamente.')).not.toBeInTheDocument()
    expect(screen.getByText('No pudimos guardar los cambios.')).toBeInTheDocument()
  })

  it('se cierra sola a los 5 segundos', () => {
    vi.useFakeTimers()
    renderWithProviders(<ToastOnMount message="El bloqueo se puede revertir desde la ficha de la cuenta." />)
    expect(screen.getByText('El bloqueo se puede revertir desde la ficha de la cuenta.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4900))
    expect(screen.getByText('El bloqueo se puede revertir desde la ficha de la cuenta.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(100))
    expect(screen.queryByText('El bloqueo se puede revertir desde la ficha de la cuenta.')).not.toBeInTheDocument()
  })
})
