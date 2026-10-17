import { useState } from 'react'
import { correoDisponible } from '../services/usuarios.service.js'
import { normalizeCorreo, validateCorreo } from '../utils/validators.js'

// Revisa si el correo del registro está libre. Si el correo cambia, vuelve a 'idle'.
export function useEmailAvailability(value) {
  const [result, setResult] = useState({ correo: null, status: 'idle' })
  const correo = normalizeCorreo(value)
  const status = result.correo === correo ? result.status : 'idle'

  async function check() {
    if (status !== 'idle' || validateCorreo(correo)) return
    setResult({ correo, status: 'checking' })
    let next = 'idle'
    try {
      const { disponible } = await correoDisponible(correo)
      next = disponible ? 'available' : 'taken'
    } catch {
      // no se marca nada, igual registrar() lo vuelve a revisar al enviar
    }
    // así no pisa un markTaken() que llegó después
    setResult((current) =>
      current.correo === correo && current.status === 'checking' ? { correo, status: next } : current,
    )
  }

  function markTaken(takenCorreo) {
    setResult({ correo: normalizeCorreo(takenCorreo), status: 'taken' })
  }

  return { status, check, markTaken }
}
