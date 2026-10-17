/**
 * Estados de un ticket y los cambios que admite cada uno (HU-5 · 5.2). La interfaz ofrece solo estos cambios y el
 * servicio rechaza los demás.
 */
export const ESTADOS = Object.freeze([
  'abierto',
  'en_atencion',
  'en_espera',
  'resuelto',
  'cerrado',
  'reabierto',
  'cancelado',
])

/**
 * Cambios de estado que hace el técnico que atiende el ticket: estado actual → estados a los que puede pasar. A
 * «cerrado» no se llega con un cambio de estado, sino cerrando el ticket con su solución, y a «abierto» o «reabierto»
 * lo devuelven otras historias (la cola de HU-4 y la reapertura de HU-3).
 */
export const TRANSICIONES = Object.freeze({
  abierto: Object.freeze(['en_atencion']),
  reabierto: Object.freeze(['en_atencion']),
  en_atencion: Object.freeze(['en_espera', 'resuelto']),
  en_espera: Object.freeze(['en_atencion', 'resuelto']),
  resuelto: Object.freeze(['en_atencion']),
  cerrado: Object.freeze([]),
  cancelado: Object.freeze([]),
})

const SIN_TRANSICIONES = Object.freeze([])

/** Estados a los que puede pasar un ticket que está en `estado`. */
export function transicionesDesde(estado) {
  return Object.hasOwn(TRANSICIONES, estado) ? TRANSICIONES[estado] : SIN_TRANSICIONES
}

export function esTransicionValida(desde, hacia) {
  return transicionesDesde(desde).includes(hacia)
}

/** Estados desde los que el técnico puede cerrar el ticket con su solución: mientras lo atiende o ya resuelto. */
export const ESTADOS_QUE_SE_CIERRAN = Object.freeze(['en_atencion', 'resuelto'])

export function sePuedeCerrar(estado) {
  return ESTADOS_QUE_SE_CIERRAN.includes(estado)
}
