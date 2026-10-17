export const MINUTO_MS = 60 * 1000
export const HORA_MS = 60 * MINUTO_MS

const MINUTOS_POR_DIA = 24 * 60

const dosDigitos = (numero) => String(numero).padStart(2, '0')

// sin segundos, por ejemplo "3 h 24 min" o "1 d 6 h 12 min"
export function formatDuracion(ms) {
  const total = Math.floor(Math.max(ms, 0) / MINUTO_MS)
  if (total === 0) return 'menos de 1 min'

  const dias = Math.floor(total / MINUTOS_POR_DIA)
  const horas = Math.floor(total / 60) % 24
  const minutos = total % 60
  if (dias > 0) return `${dias} d ${horas} h ${dosDigitos(minutos)} min`
  if (horas > 0) return `${horas} h ${dosDigitos(minutos)} min`
  return `${minutos} min`
}
