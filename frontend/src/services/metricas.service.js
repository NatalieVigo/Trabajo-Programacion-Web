import { fechaEnLima, sumarDiasAFecha } from '../utils/fechaLima.js'
import { apiFetch } from './apiClient.js'
import { validationError } from './ServiceError.js'

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DIAS_POR_DEFECTO = 30

export function rangoMetricasInicial(ahora = Date.now()) {
  const hasta = fechaEnLima(ahora)
  return { desde: sumarDiasAFecha(hasta, -(DIAS_POR_DEFECTO - 1)), hasta }
}

export function validarRangoMetricas({ desde, hasta } = {}) {
  const errores = {}
  if (!FECHA_PATTERN.test(String(desde ?? ''))) errores.desde = 'Elige una fecha de inicio válida.'
  if (!FECHA_PATTERN.test(String(hasta ?? ''))) errores.hasta = 'Elige una fecha de fin válida.'
  if (!errores.desde && !errores.hasta && desde > hasta) {
    errores.hasta = 'La fecha final no puede ser anterior a la inicial.'
  }
  return errores
}

export async function obtenerTablero(filtros = {}) {
  const errores = validarRangoMetricas(filtros)
  if (Object.keys(errores).length > 0) throw validationError(errores)
  return apiFetch('/metricas/tablero', {
    params: { desde: filtros.desde, hasta: filtros.hasta },
  })
}

export async function obtenerCargaTecnicos(filtros = {}) {
  const errores = validarRangoMetricas(filtros)
  if (Object.keys(errores).length > 0) throw validationError(errores)
  return apiFetch('/metricas/carga-tecnicos', {
    params: { desde: filtros.desde, hasta: filtros.hasta },
  })
}
