import { claveDeNombre } from '../utils/catalogoValidators.js'
import { ServiceError } from './ServiceError.js'

// Helpers que comparten los servicios del catálogo (HU-2).

export function pick(objeto, campos) {
  return Object.fromEntries(campos.filter((campo) => Object.hasOwn(objeto, campo)).map((campo) => [campo, objeto[campo]]))
}

// "a", "a y b", "a, b y c"
export function enumerar(partes) {
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0]
}

// las filas sin ese campo no se cuentan
export function contarPor(filas, campo) {
  const conteo = new Map()
  for (const fila of filas) {
    const clave = fila[campo]
    if (clave !== undefined && clave !== null) conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
  }
  return conteo
}

// compara sin mayúsculas ni tildes y salta la fila que se está editando
export function assertNombreLibre(filas, nombre, mensaje, idActual) {
  const clave = claveDeNombre(nombre)
  if (filas.some((fila) => fila.id !== idActual && claveDeNombre(fila.nombre) === clave)) {
    throw new ServiceError(409, 'NAME_TAKEN', mensaje, { nombre: mensaje })
  }
}

export function enUsoError(mensaje, usos) {
  return new ServiceError(409, 'IN_USE', mensaje, null, { details: { usos } })
}
