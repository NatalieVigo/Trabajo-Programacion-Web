import { useCallback, useEffect, useState } from 'react'

const UN_SEGUNDO_MS = 1000

/**
 * Cuenta regresiva de `seconds` segundos que arranca al montar: { secondsLeft, isRunning, restart }. `restart()` vuelve
 * a contar desde `seconds`. El temporizador se detiene al llegar a cero y se limpia al desmontar.
 */
export function useCountdown(seconds) {
  const [secondsLeft, setSecondsLeft] = useState(seconds)
  // Cada reinicio crea un temporizador nuevo, para que el primer segundo de la nueva cuenta dure un segundo completo.
  const [round, setRound] = useState(0)
  const isRunning = secondsLeft > 0

  useEffect(() => {
    if (!isRunning) return undefined
    const timer = setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0))
    }, UN_SEGUNDO_MS)
    return () => clearInterval(timer)
  }, [isRunning, round])

  const restart = useCallback(() => {
    setSecondsLeft(seconds)
    setRound((current) => current + 1)
  }, [seconds])

  return { secondsLeft, isRunning, restart }
}
