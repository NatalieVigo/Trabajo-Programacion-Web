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

export const ESTADO_LABELS = {
  abierto: 'Abierto',
  en_atencion: 'En atención',
  en_espera: 'En espera',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  reabierto: 'Reabierto',
  cancelado: 'Cancelado',
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

export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : ''
}

export function formatTime(value) {
  const date = toDate(value)
  return date ? timeFormatter.format(date) : ''
}

export function formatDateTime(value) {
  const date = toDate(value)
  return date ? `${formatDate(date)} ${formatTime(date)}` : ''
}

export function formatCountdown(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// si no son 9 dígitos se devuelve tal cual
export function formatTelefono(telefono) {
  const digits = String(telefono ?? '').replace(/\s+/g, '')
  return /^\d{9}$/.test(digits) ? digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : String(telefono ?? '')
}

export function getFirstName(nombres = '') {
  return nombres.trim().split(/\s+/)[0] ?? ''
}

export function getInitials(nombres = '', apellidos = '') {
  return `${getFirstName(nombres).charAt(0)}${getFirstName(apellidos).charAt(0)}`.toUpperCase()
}

export function getFullName({ nombres = '', apellidos = '' } = {}) {
  return `${nombres} ${apellidos}`.trim()
}

// solo el primer nombre, como en la cabecera
export function getDisplayName({ nombres = '', apellidos = '' } = {}) {
  return `${getFirstName(nombres)} ${apellidos}`.trim()
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function formatPrioridad(prioridad) {
  return PRIORIDAD_LABELS[prioridad] ?? prioridad
}

export function formatEstado(estado) {
  return ESTADO_LABELS[estado] ?? estado
}

export function formatRol(rol) {
  return ROL_LABELS[rol] ?? rol
}
