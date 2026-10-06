/**
 * Reglas de validación del catálogo de servicios (HU-2). Igual que validators.js, la interfaz las aplica campo a campo
 * y los servicios las vuelven a aplicar antes de escribir. Cada función devuelve el mensaje de error o null.
 */
import { normalizeNombre } from './validators.js'

export const PRIORIDADES = Object.freeze(['critica', 'alta', 'media', 'baja'])

const NOMBRE_MIN_LENGTH = 2
const NOMBRE_MAX_LENGTH = 60
export const DESCRIPCION_MAX_LENGTH = 240
const HORAS_MAX = 720

export const CATALOGO_MESSAGES = Object.freeze({
  nombreRequired: 'El nombre es obligatorio.',
  nombreLength: `Usa entre ${NOMBRE_MIN_LENGTH} y ${NOMBRE_MAX_LENGTH} caracteres.`,
  prioridadRequired: 'Elige la prioridad por defecto.',
  horasRequired: 'Ingresa el tiempo esperado en horas.',
  horasPositivo: 'Debe ser un número mayor que cero.',
  horasEntero: 'Usa un número entero de horas.',
  horasMax: `Usa como máximo ${HORAS_MAX} horas.`,
  descripcionMax: `Usa como máximo ${DESCRIPCION_MAX_LENGTH} caracteres.`,
  padreUnknown: 'Elige una categoría de la lista.',
  padreRequired: 'Elige la categoría a la que pertenece.',
  padreNoPermitido: 'Una categoría principal no puede pasar a ser subcategoría.',
  categoriaTaken: 'Ya existe una categoría con ese nombre.',
  subcategoriaTaken: 'Esta categoría ya tiene una subcategoría con ese nombre.',
})

const asText = (value) => (typeof value === 'string' ? value : '')

/** Clave para comparar nombres sin importar mayúsculas, tildes ni espacios repetidos: «Climatización» = «climatizacion». */
export function claveDeNombre(value) {
  return normalizeNombre(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Tiempo esperado tal como se guarda: «8» → 8. */
export function parseHoras(value) {
  return Number(String(value ?? '').trim())
}

/** Deja solo los campos con error: { campo: mensaje }. */
function soloErrores(results) {
  return Object.fromEntries(Object.entries(results).filter(([, message]) => message))
}

export function validateNombreCatalogo(value) {
  const nombre = normalizeNombre(value)
  if (!nombre) return CATALOGO_MESSAGES.nombreRequired
  if (nombre.length < NOMBRE_MIN_LENGTH || nombre.length > NOMBRE_MAX_LENGTH) return CATALOGO_MESSAGES.nombreLength
  return null
}

export function validatePrioridad(value) {
  return PRIORIDADES.includes(value) ? null : CATALOGO_MESSAGES.prioridadRequired
}

/** Horas hábiles: un entero de 1 a 720. Admite el texto del campo («8») o un número. */
export function validateHoras(value) {
  if (String(value ?? '').trim() === '') return CATALOGO_MESSAGES.horasRequired
  const horas = parseHoras(value)
  if (!Number.isFinite(horas) || horas <= 0) return CATALOGO_MESSAGES.horasPositivo
  if (!Number.isInteger(horas)) return CATALOGO_MESSAGES.horasEntero
  return horas > HORAS_MAX ? CATALOGO_MESSAGES.horasMax : null
}

/** Opcional, de hasta 240 caracteres. */
export function validateDescripcion(value) {
  return asText(value).trim().length > DESCRIPCION_MAX_LENGTH ? CATALOGO_MESSAGES.descripcionMax : null
}

/**
 * Categoría padre: vacía para una categoría principal. Si se pasan las `categorias` válidas (ids), debe ser una de
 * ellas.
 */
export function validatePadre(value, categorias) {
  if (value === null || value === undefined || value === '') return null
  return Array.isArray(categorias) && !categorias.includes(value) ? CATALOGO_MESSAGES.padreUnknown : null
}

/**
 * Valida el formulario de categoría o subcategoría (p13): `categoriaId` es la categoría padre ('' para una principal).
 * `catalogos.categorias` (ids) es opcional: el servicio lo pasa para exigir un padre que exista.
 */
export function validateCategoria(values, { categorias } = {}) {
  return soloErrores({
    nombre: validateNombreCatalogo(values.nombre),
    categoriaId: validatePadre(values.categoriaId, categorias),
    prioridadPorDefecto: validatePrioridad(values.prioridadPorDefecto),
    tiempoEsperadoHoras: validateHoras(values.tiempoEsperadoHoras),
    descripcion: validateDescripcion(values.descripcion),
  })
}
