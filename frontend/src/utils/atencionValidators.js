// Validaciones de la atención (HU-5). Los servicios las repiten antes de guardar.
import { ESTADOS } from './estadosTicket.js'
import { esFechaDeCalendario, hoyEnLima } from './fechaLima.js'

// el público lo ve quien reportó, el interno solo el equipo
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

export function normalizeTexto(value) {
  return asText(value).trim()
}

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

export function validateRetornoEstimado(value, hoy = hoyEnLima()) {
  if (asText(value).trim() === '') return ATENCION_MESSAGES.retornoRequired
  if (!esFechaDeCalendario(value)) return ATENCION_MESSAGES.retornoInvalido
  return value < hoy ? ATENCION_MESSAGES.retornoPasado : null
}

// si el cambio se permite desde el estado actual lo revisa el servicio
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

export function validateCierre(values) {
  return soloErrores({ solucion: validateSolucion(values.solucion) })
}
