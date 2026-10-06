/**
 * Reglas de validación del catálogo de servicios (HU-2). Igual que validators.js, la interfaz las aplica campo a campo
 * y los servicios las vuelven a aplicar antes de escribir. Cada función devuelve el mensaje de error o null.
 */
import { normalizeNombre } from './validators.js'

export const PRIORIDADES = Object.freeze(['critica', 'alta', 'media', 'baja'])

/** Tipos de ambiente con su nombre visible. */
export const TIPOS_AMBIENTE = Object.freeze({
  aula: 'Aula',
  laboratorio: 'Laboratorio',
  auditorio: 'Auditorio',
  oficina: 'Oficina',
  biblioteca: 'Biblioteca',
})

const NOMBRE_MIN_LENGTH = 2
const NOMBRE_MAX_LENGTH = 60
export const DESCRIPCION_MAX_LENGTH = 240
const HORAS_MAX = 720
const PABELLON_MAX_LENGTH = 30
const CODIGO_MAX_LENGTH = 12
const PISO_MIN = -3
const PISO_MAX = 20
const CAPACIDAD_MAX = 1000

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
  sedeTaken: 'Ya existe una sede con ese nombre.',
  sedeRequired: 'Elige la sede.',
  sedeUnknown: 'Elige una sede de la lista.',
  pabellonTaken: 'Esta sede ya tiene un pabellón con ese nombre.',
  pabellonLength: `Usa como máximo ${PABELLON_MAX_LENGTH} caracteres.`,
  pabellonRequired: 'Elige el pabellón.',
  pabellonUnknown: 'Elige un pabellón de la lista.',
  codigoRequired: 'El código es obligatorio.',
  codigoFormato: 'Usa letras, números y guiones, como A-201 o BIB-P2.',
  codigoLength: `Usa como máximo ${CODIGO_MAX_LENGTH} caracteres.`,
  codigoTaken: 'Ya existe un ambiente con ese código.',
  tipoRequired: 'Elige el tipo de ambiente.',
  pisoRequired: 'Ingresa el piso.',
  pisoRango: `Usa un número entero entre ${PISO_MIN} y ${PISO_MAX}.`,
  capacidadRequired: 'Ingresa la capacidad.',
  capacidadRango: `Usa un número entero entre 1 y ${CAPACIDAD_MAX}.`,
})

// Grupos de letras o números separados por guiones: «A-201», «BIB-P2», «AUD-CEN».
const CODIGO_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/

const asText = (value) => (typeof value === 'string' ? value : '')

/** Clave para comparar nombres sin importar mayúsculas, tildes ni espacios repetidos: «Climatización» = «climatizacion». */
export function claveDeNombre(value) {
  return normalizeNombre(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Número entero tal como se guarda: el tiempo esperado, el piso o la capacidad. «8» → 8. */
export function parseEntero(value) {
  return Number(String(value ?? '').trim())
}

export const parseHoras = parseEntero

/** Código de un ambiente tal como se guarda: « h-212 » → «H-212». */
export function normalizeCodigo(value) {
  return asText(value).trim().toUpperCase()
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

/** Elección obligatoria de una lista (sede, pabellón): si se pasan los `ids` válidos, debe ser uno de ellos. */
function validateEleccion(value, ids, { required, unknown }) {
  if (asText(value) === '') return required
  return Array.isArray(ids) && !ids.includes(value) ? unknown : null
}

/** Entero obligatorio dentro de un rango, desde el texto del campo o un número. */
function validateEnteroEnRango(value, min, max, { required, rango }) {
  if (String(value ?? '').trim() === '') return required
  const numero = parseEntero(value)
  return Number.isInteger(numero) && numero >= min && numero <= max ? null : rango
}

export function validateCodigoAmbiente(value) {
  const codigo = normalizeCodigo(value)
  if (!codigo) return CATALOGO_MESSAGES.codigoRequired
  if (codigo.length > CODIGO_MAX_LENGTH) return CATALOGO_MESSAGES.codigoLength
  return CODIGO_PATTERN.test(codigo) ? null : CATALOGO_MESSAGES.codigoFormato
}

export function validateTipoAmbiente(value) {
  return Object.hasOwn(TIPOS_AMBIENTE, asText(value)) ? null : CATALOGO_MESSAGES.tipoRequired
}

/** Nombre de un ambiente: opcional (se arma con el tipo y el código) y, si se escribe, de 2 a 60 caracteres. */
export function validateNombreAmbiente(value) {
  return normalizeNombre(value) ? validateNombreCatalogo(value) : null
}

export function validatePiso(value) {
  return validateEnteroEnRango(value, PISO_MIN, PISO_MAX, {
    required: CATALOGO_MESSAGES.pisoRequired,
    rango: CATALOGO_MESSAGES.pisoRango,
  })
}

export function validateCapacidad(value) {
  return validateEnteroEnRango(value, 1, CAPACIDAD_MAX, {
    required: CATALOGO_MESSAGES.capacidadRequired,
    rango: CATALOGO_MESSAGES.capacidadRango,
  })
}

/** Valida una sede: solo su nombre. */
export function validateSede(values) {
  return soloErrores({ nombre: validateNombreCatalogo(values.nombre) })
}

/** Nombre de un pabellón: suele ser una letra («A», «H») o una palabra («Biblioteca»), de hasta 30 caracteres. */
export function validateNombrePabellon(value) {
  const nombre = normalizeNombre(value)
  if (!nombre) return CATALOGO_MESSAGES.nombreRequired
  return nombre.length > PABELLON_MAX_LENGTH ? CATALOGO_MESSAGES.pabellonLength : null
}

/** Valida un pabellón: su sede y su nombre. `catalogos.sedes` (ids) es opcional: el servicio lo pasa. */
export function validatePabellon(values, { sedes } = {}) {
  return soloErrores({
    sedeId: validateEleccion(values.sedeId, sedes, {
      required: CATALOGO_MESSAGES.sedeRequired,
      unknown: CATALOGO_MESSAGES.sedeUnknown,
    }),
    nombre: validateNombrePabellon(values.nombre),
  })
}

/**
 * Valida un ambiente (p15): código, tipo, nombre opcional, pabellón, piso y capacidad. `catalogos.pabellones` (ids)
 * es opcional: el servicio lo pasa para exigir un pabellón que exista.
 */
export function validateAmbiente(values, { pabellones } = {}) {
  return soloErrores({
    codigo: validateCodigoAmbiente(values.codigo),
    tipo: validateTipoAmbiente(values.tipo),
    nombre: validateNombreAmbiente(values.nombre),
    pabellonId: validateEleccion(values.pabellonId, pabellones, {
      required: CATALOGO_MESSAGES.pabellonRequired,
      unknown: CATALOGO_MESSAGES.pabellonUnknown,
    }),
    piso: validatePiso(values.piso),
    capacidad: validateCapacidad(values.capacidad),
  })
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
