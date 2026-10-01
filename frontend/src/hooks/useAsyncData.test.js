import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAsyncData } from './useAsyncData.js'

function deferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('useAsyncData', () => {
  it('pasa de loading a success con los datos del loader', async () => {
    const loader = () => Promise.resolve(['Audiovisuales', 'Limpieza'])
    const { result } = renderHook(() => useAsyncData(loader))

    expect(result.current).toMatchObject({ status: 'loading', data: undefined, error: null })
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toEqual(['Audiovisuales', 'Limpieza'])
  })

  it('expone el error y reload() vuelve a intentar la carga', async () => {
    const error = new Error('Sin conexión')
    const loader = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok')
    const { result } = renderHook(() => useAsyncData(loader))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(error)

    act(() => result.current.reload())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toBe('ok')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('al cambiar de loader vuelve a loading sin mostrar los datos anteriores', async () => {
    const pendiente = deferred()
    const cargarA = () => Promise.resolve('Invitación A')
    const cargarB = () => pendiente.promise
    const { result, rerender } = renderHook(({ loader }) => useAsyncData(loader), {
      initialProps: { loader: cargarA },
    })
    await waitFor(() => expect(result.current.data).toBe('Invitación A'))

    rerender({ loader: cargarB })
    expect(result.current).toMatchObject({ status: 'loading', data: undefined })

    await act(async () => pendiente.resolve('Invitación B'))
    expect(result.current).toMatchObject({ status: 'success', data: 'Invitación B' })
  })
})
