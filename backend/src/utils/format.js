const LOCALE = 'es-PE'
const TIME_ZONE = 'America/Lima'

// los mensajes muestran la hora de Lima, aunque la base guarda UTC
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export function formatDate(value) {
  return dateFormatter.format(new Date(value))
}

export function formatTime(value) {
  return timeFormatter.format(new Date(value))
}

export function getFullName({ nombres = '', apellidos = '' } = {}) {
  return `${nombres} ${apellidos}`.trim()
}
