/**
 * Reglas de validación compartidas (SPEC §7). La interfaz las aplica campo a campo y los servicios las vuelven
 * a aplicar antes de escribir, como lo haría el servidor. Cada función devuelve el mensaje de error o null.
 */

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 60
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 64
export const MAX_ESPECIALIDADES = 3

export const VALIDATION_MESSAGES = Object.freeze({
  nombresRequired: 'Ingresa tus nombres.',
  apellidosRequired: 'Ingresa tus apellidos.',
  nameChars: 'Usa solo letras y espacios.',
  nameLength: `Usa entre ${NAME_MIN_LENGTH} y ${NAME_MAX_LENGTH} caracteres.`,
  correoRequired: 'Ingresa tu correo institucional.',
  correoInstitucional: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
  correoTaken: 'Ya existe una cuenta con este correo.',
  correoAvailable: 'Correo válido y disponible.',
  telefonoRequired: 'Ingresa un número de contacto.',
  telefonoFormat: 'Ingresa un celular de 9 dígitos que empiece con 9.',
  passwordRequired: 'Ingresa una contraseña.',
  passwordRule: 'Mínimo 8 caracteres, con una mayúscula y un número.',
  passwordMaxLength: `Usa como máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  confirmacionRequired: 'Confirma tu contraseña.',
  confirmacionMismatch: 'Las contraseñas no coinciden.',
  unidadRequired: 'Selecciona tu unidad o carrera.',
  vinculoRequired: 'Selecciona tu vínculo con la universidad.',
  terminosRequired: 'Debes aceptar los términos para continuar.',
  especialidadesRange: 'Elige entre una y tres categorías.',
})

// Grupos de letras (con tildes y ñ) separados por espacios, apóstrofos o guiones: «María José», «O'Connor», «Ruiz-Tagle».
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[\s'’-]+[\p{L}\p{M}]+)*$/u
const CORREO_PATTERN = /^[a-z0-9._%+-]+@(aloe\.)?ulima\.edu\.pe$/i
const TELEFONO_PATTERN = /^9\d{8}$/
const UPPERCASE_PATTERN = /\p{Lu}/u
const DIGIT_PATTERN = /\d/

const asText = (value) => (typeof value === 'string' ? value : '')

/** «  María   José » → «María José». */
export function normalizeNombre(value) {
  return asText(value).trim().replace(/\s+/g, ' ')
}

/** « Camila.Quispe@ALOE.ulima.edu.pe » → «camila.quispe@aloe.ulima.edu.pe». */
export function normalizeCorreo(value) {
  return asText(value).trim().toLowerCase()
}

/** «987 654 321» → «987654321». */
export function normalizeTelefono(value) {
  return asText(value).replace(/\s+/g, '')
}

export function hasErrors(errors) {
  return Object.keys(errors ?? {}).length > 0
}

function validateName(value, requiredMessage) {
  const name = normalizeNombre(value)
  if (!name) return requiredMessage
  if (!NAME_PATTERN.test(name)) return VALIDATION_MESSAGES.nameChars
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) return VALIDATION_MESSAGES.nameLength
  return null
}

export function validateNombres(value) {
  return validateName(value, VALIDATION_MESSAGES.nombresRequired)
}

export function validateApellidos(value) {
  return validateName(value, VALIDATION_MESSAGES.apellidosRequired)
}

export function validateCorreo(value) {
  const correo = normalizeCorreo(value)
  if (!correo) return VALIDATION_MESSAGES.correoRequired
  return CORREO_PATTERN.test(correo) ? null : VALIDATION_MESSAGES.correoInstitucional
}

export function validateTelefono(value) {
  const telefono = normalizeTelefono(value)
  if (!telefono) return VALIDATION_MESSAGES.telefonoRequired
  return TELEFONO_PATTERN.test(telefono) ? null : VALIDATION_MESSAGES.telefonoFormat
}

/** Regla mínima: 8 caracteres o más, con al menos una mayúscula y un número. */
function meetsPasswordRule(password) {
  return password.length >= PASSWORD_MIN_LENGTH && UPPERCASE_PATTERN.test(password) && DIGIT_PATTERN.test(password)
}

export function validatePassword(value) {
  const password = asText(value)
  if (!password) return VALIDATION_MESSAGES.passwordRequired
  if (password.length > PASSWORD_MAX_LENGTH) return VALIDATION_MESSAGES.passwordMaxLength
  return meetsPasswordRule(password) ? null : VALIDATION_MESSAGES.passwordRule
}

export function validateConfirmacion(confirmacion, password) {
  if (!asText(confirmacion)) return VALIDATION_MESSAGES.confirmacionRequired
  return confirmacion === password ? null : VALIDATION_MESSAGES.confirmacionMismatch
}

/** Opción obligatoria de una lista. Si se pasan las `options` válidas, el valor debe ser una de ellas. */
function validateOption(value, options, message) {
  const isMissing = asText(value).trim() === ''
  const isUnknown = Array.isArray(options) && !options.includes(value)
  return isMissing || isUnknown ? message : null
}

export function validateUnidad(value, unidades) {
  return validateOption(value, unidades, VALIDATION_MESSAGES.unidadRequired)
}

export function validateVinculo(value, vinculos) {
  return validateOption(value, vinculos, VALIDATION_MESSAGES.vinculoRequired)
}

export function validateAceptaTerminos(value) {
  return value === true ? null : VALIDATION_MESSAGES.terminosRequired
}

export function validateEspecialidades(categoriaIds) {
  const count = Array.isArray(categoriaIds) ? new Set(categoriaIds).size : 0
  return count >= 1 && count <= MAX_ESPECIALIDADES ? null : VALIDATION_MESSAGES.especialidadesRange
}

/** Deja solo los campos con error: { campo: mensaje }. */
function collectErrors(results) {
  return Object.fromEntries(Object.entries(results).filter(([, message]) => message))
}

/**
 * Valida el formulario de registro y devuelve { campo: mensaje } solo con los campos inválidos ({} si todo es válido).
 * `catalogos` ({ unidades, vinculos }) es opcional: el servicio lo pasa para exigir valores del catálogo.
 */
export function validateRegistro(values, { unidades, vinculos } = {}) {
  return collectErrors({
    nombres: validateNombres(values.nombres),
    apellidos: validateApellidos(values.apellidos),
    correo: validateCorreo(values.correo),
    telefono: validateTelefono(values.telefono),
    password: validatePassword(values.password),
    confirmacion: validateConfirmacion(values.confirmacion, values.password),
    unidad: validateUnidad(values.unidad, unidades),
    vinculo: validateVinculo(values.vinculo, vinculos),
    aceptaTerminos: validateAceptaTerminos(values.aceptaTerminos),
  })
}
