/**
 * Reglas de validación de la atención de tickets (HU-5). Igual que validators.js, la interfaz las aplica campo a campo
 * y los servicios las vuelven a aplicar antes de escribir. Cada función devuelve el mensaje de error o null.
 */

/** Tipos de entrada de la bitácora: comentario público (lo ve quien reportó) o nota interna (solo el equipo). */
export const TIPOS_ENTRADA = Object.freeze(['publico', 'interno'])

export const MENSAJE_MAX_LENGTH = 600

export const ATENCION_MESSAGES = Object.freeze({
  tipoRequired: 'Elige si es un comentario público o una nota interna.',
  mensajeRequired: 'Escribe un mensaje antes de guardar.',
  mensajeMax: `Usa como máximo ${MENSAJE_MAX_LENGTH} caracteres.`,
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
