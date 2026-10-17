// Validaciones del catálogo (HU-2). Se usan en el formulario y otra vez en los servicios.
import { normalizeNombre } from './validators.js'

export const PRIORIDADES = Object.freeze(['critica', 'alta', 'media', 'baja'])

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

// letras o números separados por guiones, como A-201 o BIB-P2
const CODIGO_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/

const asText = (value) => (typeof value === 'string' ? value : '')

// para comparar nombres sin importar mayúsculas, tildes ni espacios de más
export function claveDeNombre(value) {
  return normalizeNombre(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function parseEntero(value) {
  return Number(String(value ?? '').trim())
}

export const parseHoras = parseEntero

export function normalizeCodigo(value) {
  return asText(value).trim().toUpperCase()
}

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

export function validateHoras(value) {
  if (String(value ?? '').trim() === '') return CATALOGO_MESSAGES.horasRequired
  const horas = parseHoras(value)
  if (!Number.isFinite(horas) || horas <= 0) return CATALOGO_MESSAGES.horasPositivo
  if (!Number.isInteger(horas)) return CATALOGO_MESSAGES.horasEntero
  return horas > HORAS_MAX ? CATALOGO_MESSAGES.horasMax : null
}

export function validateDescripcion(value) {
  return asText(value).trim().length > DESCRIPCION_MAX_LENGTH ? CATALOGO_MESSAGES.descripcionMax : null
}

// vacío quiere decir que es una categoría principal
export function validatePadre(value, categorias) {
  if (value === null || value === undefined || value === '') return null
  return Array.isArray(categorias) && !categorias.includes(value) ? CATALOGO_MESSAGES.padreUnknown : null
}

function validateEleccion(value, ids, { required, unknown }) {
  if (asText(value) === '') return required
  return Array.isArray(ids) && !ids.includes(value) ? unknown : null
}

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

// es opcional, si no se escribe se arma con el tipo y el código
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

export function validateSede(values) {
  return soloErrores({ nombre: validateNombreCatalogo(values.nombre) })
}

export function validateNombrePabellon(value) {
  const nombre = normalizeNombre(value)
  if (!nombre) return CATALOGO_MESSAGES.nombreRequired
  return nombre.length > PABELLON_MAX_LENGTH ? CATALOGO_MESSAGES.pabellonLength : null
}

// las listas de ids son opcionales, el servicio las pasa para exigir que existan
export function validatePabellon(values, { sedes } = {}) {
  return soloErrores({
    sedeId: validateEleccion(values.sedeId, sedes, {
      required: CATALOGO_MESSAGES.sedeRequired,
      unknown: CATALOGO_MESSAGES.sedeUnknown,
    }),
    nombre: validateNombrePabellon(values.nombre),
  })
}

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

export function validateCategoria(values, { categorias } = {}) {
  return soloErrores({
    nombre: validateNombreCatalogo(values.nombre),
    categoriaId: validatePadre(values.categoriaId, categorias),
    prioridadPorDefecto: validatePrioridad(values.prioridadPorDefecto),
    tiempoEsperadoHoras: validateHoras(values.tiempoEsperadoHoras),
    descripcion: validateDescripcion(values.descripcion),
  })
}
