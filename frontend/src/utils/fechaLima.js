// Fechas en hora de Lima (UTC-5, sin horario de verano) para los inputs de tipo date.
const DESFASE_LIMA = '-05:00'
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const fechaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function fechaEnLima(instante) {
  return fechaFormatter.format(new Date(instante))
}

export function hoyEnLima(ahora = Date.now()) {
  return fechaEnLima(ahora)
}

// ojo que '2026-02-30' tiene buen formato pero no existe
export function esFechaDeCalendario(value) {
  if (typeof value !== 'string' || !FECHA_PATTERN.test(value)) return false
  const instante = new Date(`${value}T12:00:00.000${DESFASE_LIMA}`)
  return !Number.isNaN(instante.getTime()) && fechaEnLima(instante) === value
}

// los plazos se guardan como el último instante del día en Lima
export function finDelDiaEnLima(fecha) {
  return new Date(`${fecha}T23:59:59.000${DESFASE_LIMA}`).toISOString()
}
