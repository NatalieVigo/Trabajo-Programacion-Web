import { useCallback, useEffect, useState } from 'react'

const UN_SEGUNDO_MS = 1000

export function useCountdown(seconds) {
  const [secondsLeft, setSecondsLeft] = useState(seconds)
  // con cada reinicio se crea otro intervalo, así el primer segundo dura completo
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
