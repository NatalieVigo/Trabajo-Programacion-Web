import { useCallback, useEffect, useState } from 'react'

/**
 * Ejecuta `loader` (una función estable que devuelve una promesa, normalmente un servicio) y expone
 * su estado explícito: status 'loading' | 'success' | 'error', data, error, reload() y updateData(updater).
 * Si cambia `loader` (otro token, otro id…) vuelve a 'loading' en vez de mostrar los datos anteriores.
 * `updateData` aplica a los datos ya cargados lo que devolvió una escritura, sin volver a pedirlos.
 */
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

  // El resultado guardado solo vale para la carga en curso (mismo loader y mismo intento).
  const isCurrent = result?.loader === loader && result.attempt === attempt
  return {
    status: isCurrent ? result.status : 'loading',
    data: isCurrent ? result.data : undefined,
    error: isCurrent ? result.error : null,
    reload,
    updateData,
  }
}
