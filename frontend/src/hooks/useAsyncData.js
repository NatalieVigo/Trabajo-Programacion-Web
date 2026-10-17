import { useCallback, useEffect, useState } from 'react'

// Carga datos con loader. Si el loader cambia, vuelve a 'loading' en vez de mostrar lo anterior.
export function useAsyncData(loader) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let active = true
    loader().then(
      (data) => {
        if (active) setResult({ loader, attempt, status: 'success', data, error: null })
      },
      (error) => {
        if (active) setResult({ loader, attempt, status: 'error', data: undefined, error })
      },
    )
    return () => {
      active = false
    }
  }, [loader, attempt])

  const reload = useCallback(() => setAttempt((current) => current + 1), [])

  const updateData = useCallback((updater) => {
    setResult((current) => (current?.status === 'success' ? { ...current, data: updater(current.data) } : current))
  }, [])

  // solo vale si es del mismo loader y del mismo intento
  const isCurrent = result?.loader === loader && result.attempt === attempt
  return {
    status: isCurrent ? result.status : 'loading',
    data: isCurrent ? result.data : undefined,
    error: isCurrent ? result.error : null,
    reload,
    updateData,
  }
}
