const LOCALE = 'es-PE'
const TIME_ZONE = 'America/Lima'

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export const PRIORIDAD_LABELS = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

export const ROL_LABELS = {
  usuario: 'Usuario',
  tecnico: 'Técnico',
  supervisor: 'Supervisor',
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Fecha en hora de Lima con formato dd/mm/aaaa. */
export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : ''
}

/** Hora en hora de Lima con formato HH:MM (24 h). */
export function formatTime(value) {
  const date = toDate(value)
  return date ? timeFormatter.format(date) : ''
}

export function formatDateTime(value) {
  const date = toDate(value)
  return date ? `${formatDate(date)} ${formatTime(date)}` : ''
}

/** "987654321" → "987 654 321"; cualquier otro valor se devuelve sin cambios. */
export function formatTelefono(telefono) {
  const digits = String(telefono ?? '').replace(/\s+/g, '')
  return /^\d{9}$/.test(digits) ? digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : String(telefono ?? '')
}

export function getFirstName(nombres = '') {
  return nombres.trim().split(/\s+/)[0] ?? ''
}

/** Iniciales del primer nombre y del primer apellido: "CQ". */
export function getInitials(nombres = '', apellidos = '') {
  return `${getFirstName(nombres).charAt(0)}${getFirstName(apellidos).charAt(0)}`.toUpperCase()
}

/** Nombre completo: "Camila Alejandra Quispe Ramos". */
export function getFullName({ nombres = '', apellidos = '' } = {}) {
  return `${nombres} ${apellidos}`.trim()
}

/** Primer nombre y apellidos, como en la cabecera: "Camila Quispe Ramos". */
export function getDisplayName({ nombres = '', apellidos = '' } = {}) {
  return `${getFirstName(nombres)} ${apellidos}`.trim()
}

export function formatPrioridad(prioridad) {
  return PRIORIDAD_LABELS[prioridad] ?? prioridad
}

export function formatRol(rol) {
  return ROL_LABELS[rol] ?? rol
}
