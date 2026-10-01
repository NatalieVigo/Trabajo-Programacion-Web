import { useState } from 'react'
import { correoDisponible } from '../services/usuarios.service.js'
import { normalizeCorreo, validateCorreo } from '../utils/validators.js'

/**
 * Disponibilidad del correo que se está escribiendo en el registro.
 * status: 'idle' | 'checking' | 'available' | 'taken'. El estado siempre corresponde al valor actual: si el correo
 * cambia vuelve a 'idle' y la respuesta tardía de un valor anterior se descarta. `check()` no consulta si el formato
 * es inválido o si ese correo ya se consultó. `markTaken(correo)` guarda que el servicio lo rechazó por tener cuenta
 * (409 al registrar), para que no vuelva a mostrarse como disponible.
 */
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
      // Sin respuesta no se marca nada: registrar() vuelve a comprobar el correo al enviar.
    }
    // Solo resuelve la consulta pendiente de ese correo: no pisa un markTaken() posterior.
    setResult((current) =>
      current.correo === correo && current.status === 'checking' ? { correo, status: next } : current,
    )
  }

  function markTaken(takenCorreo) {
    setResult({ correo: normalizeCorreo(takenCorreo), status: 'taken' })
  }

  return { status, check, markTaken }
}
