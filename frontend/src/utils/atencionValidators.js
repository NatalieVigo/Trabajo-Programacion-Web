/**
 * Reglas de validación de la atención de tickets (HU-5). Igual que validators.js, la interfaz las aplica campo a campo
 * y los servicios las vuelven a aplicar antes de escribir. Cada función devuelve el mensaje de error o null.
 */
import { ESTADOS } from './estadosTicket.js'
import { esFechaDeCalendario, hoyEnLima } from './fechaLima.js'

/** Tipos de entrada de la bitácora: comentario público (lo ve quien reportó) o nota interna (solo el equipo). */
export const TIPOS_ENTRADA = Object.freeze(['publico', 'interno'])

export const MENSAJE_MAX_LENGTH = 600
export const MOTIVO_MAX_LENGTH = 240
export const SOLUCION_MIN_LENGTH = 10
export const SOLUCION_MAX_LENGTH = 600

export const ATENCION_MESSAGES = Object.freeze({
  tipoRequired: 'Elige si es un comentario público o una nota interna.',
  mensajeRequired: 'Escribe un mensaje antes de guardar.',
  mensajeMax: `Usa como máximo ${MENSAJE_MAX_LENGTH} caracteres.`,
  estadoRequired: 'Elige el nuevo estado.',
  motivoRequired: 'Indica el motivo de la espera.',
  motivoMax: `Usa como máximo ${MOTIVO_MAX_LENGTH} caracteres.`,
  retornoRequired: 'Indica la fecha estimada de retorno.',
  retornoInvalido: 'Ingresa una fecha válida.',
  retornoPasado: 'La fecha de retorno no puede ser anterior a hoy.',
  solucionRequired: 'Describe la solución aplicada.',
  solucionMin: `Describe la solución con al menos ${SOLUCION_MIN_LENGTH} caracteres.`,
  solucionMax: `Usa como máximo ${SOLUCION_MAX_LENGTH} caracteres.`,
})

const asText = (value) => (typeof value === 'string' ? value : '')

/** Texto tal como se guarda: sin espacios al inicio ni al final; los saltos de línea del medio se conservan. */
export function normalizeTexto(value) {
  return asText(value).trim()
}

/** Deja solo los campos con error: { campo: mensaje }. */
function soloErrores(results) {
  return Object.fromEntries(Object.entries(results).filter(([, message]) => message))
}

export function validateTipoEntrada(value) {
  return TIPOS_ENTRADA.includes(value) ? null : ATENCION_MESSAGES.tipoRequired
}

export function validateMensaje(value) {
  const mensaje = normalizeTexto(value)
  if (!mensaje) return ATENCION_MESSAGES.mensajeRequired
  return mensaje.length > MENSAJE_MAX_LENGTH ? ATENCION_MESSAGES.mensajeMax : null
}

/** Valida una entrada de la bitácora (p25): su tipo y su mensaje. */
export function validateEntrada(values) {
  return soloErrores({
    tipo: validateTipoEntrada(values.tipo),
    mensaje: validateMensaje(values.mensaje),
  })
}

export function validateNuevoEstado(value) {
  return ESTADOS.includes(value) ? null : ATENCION_MESSAGES.estadoRequired
}

export function validateMotivoEspera(value) {
  const motivo = normalizeTexto(value)
  if (!motivo) return ATENCION_MESSAGES.motivoRequired
  return motivo.length > MOTIVO_MAX_LENGTH ? ATENCION_MESSAGES.motivoMax : null
}

/** Fecha estimada de retorno: un día con el formato de un campo de fecha («2026-10-05»), desde `hoy` en adelante. */
export function validateRetornoEstimado(value, hoy = hoyEnLima()) {
  if (asText(value).trim() === '') return ATENCION_MESSAGES.retornoRequired
  if (!esFechaDeCalendario(value)) return ATENCION_MESSAGES.retornoInvalido
  return value < hoy ? ATENCION_MESSAGES.retornoPasado : null
}

/**
 * Valida un cambio de estado (p26): el estado al que pasa el ticket y, solo si queda en espera, el motivo y la fecha
 * estimada de retorno. Si el estado actual admite el cambio lo decide el servicio. `hoy` («2026-10-01») es opcional.
 */
export function validateCambioEstado(values, { hoy } = {}) {
  const enEspera = values.estado === 'en_espera'
  return soloErrores({
    estado: validateNuevoEstado(values.estado),
    motivo: enEspera ? validateMotivoEspera(values.motivo) : null,
    retornoEstimado: enEspera ? validateRetornoEstimado(values.retornoEstimado, hoy) : null,
  })
}

export function validateSolucion(value) {
  const solucion = normalizeTexto(value)
  if (!solucion) return ATENCION_MESSAGES.solucionRequired
  if (solucion.length < SOLUCION_MIN_LENGTH) return ATENCION_MESSAGES.solucionMin
  return solucion.length > SOLUCION_MAX_LENGTH ? ATENCION_MESSAGES.solucionMax : null
}

/** Valida el cierre de un ticket (p26): la descripción de la solución aplicada. */
export function validateCierre(values) {
  return soloErrores({ solucion: validateSolucion(values.solucion) })
}
