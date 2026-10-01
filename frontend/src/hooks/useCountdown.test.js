import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown.js'

const pasan = (ms) => act(() => vi.advanceTimersByTime(ms))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown', () => {
  it('arranca al montar, descuenta un segundo por segundo y se detiene en cero', () => {
    const { result } = renderHook(() => useCountdown(3))
    expect(result.current).toMatchObject({ secondsLeft: 3, isRunning: true })

    pasan(999)
    expect(result.current.secondsLeft).toBe(3)
    pasan(1)
    expect(result.current.secondsLeft).toBe(2)
    pasan(2000)

    expect(result.current).toMatchObject({ secondsLeft: 0, isRunning: false })
    expect(vi.getTimerCount()).toBe(0)
    pasan(5000)
    expect(result.current.secondsLeft).toBe(0)
  })

  it('restart() vuelve a contar desde el inicio', () => {
    const { result } = renderHook(() => useCountdown(3))
    pasan(3000)

    act(() => result.current.restart())

    expect(result.current).toMatchObject({ secondsLeft: 3, isRunning: true })
    pasan(1000)
    expect(result.current.secondsLeft).toBe(2)
  })

  it('al reiniciar a mitad de la cuenta, el primer segundo de la nueva dura un segundo completo', () => {
    const { result } = renderHook(() => useCountdown(10))
    pasan(2500)
    expect(result.current.secondsLeft).toBe(8)

    act(() => result.current.restart())

    pasan(999)
    expect(result.current.secondsLeft).toBe(10)
    pasan(1)
    expect(result.current.secondsLeft).toBe(9)
  })

  it('al desmontar limpia su temporizador', () => {
    const { unmount } = renderHook(() => useCountdown(45))
    expect(vi.getTimerCount()).toBe(1)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
