import { claveDeNombre } from '../utils/catalogoValidators.js'
import { ServiceError } from './ServiceError.js'

/** Pasos internos que comparten los servicios del catálogo (HU-2). No son operaciones de la API. */

/** Solo los `campos` presentes en `objeto`. */
export function pick(objeto, campos) {
  return Object.fromEntries(campos.filter((campo) => Object.hasOwn(objeto, campo)).map((campo) => [campo, objeto[campo]]))
}

/** «a», «a y b», «a, b y c». */
export function enumerar(partes) {
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0]
}

/** Cantidad de `filas` por el valor de `campo`: Map valor → cantidad. Las filas sin ese campo no se cuentan. */
export function contarPor(filas, campo) {
  const conteo = new Map()
  for (const fila of filas) {
    const clave = fila[campo]
    if (clave !== undefined && clave !== null) conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
  }
  return conteo
}

/**
 * El `nombre` no se repite entre las `filas` (salvo en la fila `idActual`, que es la que se edita), sin distinguir
 * mayúsculas ni tildes. Si se repite, falla con 409 NAME_TAKEN y el `mensaje` junto al campo.
 */
export function assertNombreLibre(filas, nombre, mensaje, idActual) {
  const clave = claveDeNombre(nombre)
  if (filas.some((fila) => fila.id !== idActual && claveDeNombre(fila.nombre) === clave)) {
    throw new ServiceError(409, 'NAME_TAKEN', mensaje, { nombre: mensaje })
  }
}

/** 409 IN_USE de algo que no se puede eliminar porque se usa; `usos` cuenta lo que lo impide. */
export function enUsoError(mensaje, usos) {
  return new ServiceError(409, 'IN_USE', mensaje, null, { details: { usos } })
}
