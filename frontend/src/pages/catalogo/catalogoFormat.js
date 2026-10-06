/** Tiempo esperado como en el catálogo (p12): 4 → «4 h hábiles». */
export function formatHoras(horas) {
  return `${horas} h hábiles`
}

/** Nombre del tipo de elemento del catálogo, con o sin mayúscula: «Categoría», «subcategoría». */
export function nombreDeTipo(tipo, { mayuscula = false } = {}) {
  const nombre = tipo === 'subcategoria' ? 'subcategoría' : 'categoría'
  return mayuscula ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : nombre
}
