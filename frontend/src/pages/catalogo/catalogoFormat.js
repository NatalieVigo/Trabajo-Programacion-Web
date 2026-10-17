import { TIPOS_AMBIENTE } from '../../utils/catalogoValidators.js'

export function formatTipoAmbiente(tipo) {
  return TIPOS_AMBIENTE[tipo] ?? tipo
}

export const OPCIONES_TIPO_AMBIENTE = Object.entries(TIPOS_AMBIENTE).map(([value, label]) => ({ value, label }))

export function formatHoras(horas) {
  return `${horas} h hábiles`
}

export function nombreDeTipo(tipo, { mayuscula = false } = {}) {
  const nombre = tipo === 'subcategoria' ? 'subcategoría' : 'categoría'
  return mayuscula ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : nombre
}
