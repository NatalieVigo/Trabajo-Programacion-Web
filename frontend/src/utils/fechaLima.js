/**
 * Fechas de calendario en hora de Lima (UTC−5, sin horario de verano), para los campos de tipo fecha. La base guarda
 * los plazos como el último instante de ese día en Lima, igual que el vencimiento de las invitaciones.
 */
const DESFASE_LIMA = '-05:00'
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const fechaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** El día en Lima de un instante, como lo usa un <input type="date">: «2026-10-01». */
export function fechaEnLima(instante) {
  return fechaFormatter.format(new Date(instante))
}

/** El día de hoy en Lima: «2026-10-01». */
export function hoyEnLima(ahora = Date.now()) {
  return fechaEnLima(ahora)
}

/** Si el texto es un día que existe, con el formato de un <input type="date">: «2026-02-30» no lo es. */
export function esFechaDeCalendario(value) {
  if (typeof value !== 'string' || !FECHA_PATTERN.test(value)) return false
  const instante = new Date(`${value}T12:00:00.000${DESFASE_LIMA}`)
  return !Number.isNaN(instante.getTime()) && fechaEnLima(instante) === value
}

/** Último instante de ese día en Lima, en ISO: «2026-10-05» → «2026-10-06T04:59:59.000Z». */
export function finDelDiaEnLima(fecha) {
  return new Date(`${fecha}T23:59:59.000${DESFASE_LIMA}`).toISOString()
}
