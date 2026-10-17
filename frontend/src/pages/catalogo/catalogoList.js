// Filtros y paginación de las listas del catálogo (HU-2), todo del lado del cliente.

// sin tildes y en minúsculas, así "Huamán" y "huaman" dan lo mismo
export function normalizarBusqueda(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

// cada palabra debe aparecer en algún texto; si la búsqueda está vacía, todo coincide
export function coincideBusqueda(textos, busqueda) {
  const palabras = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean)
  const texto = normalizarBusqueda(textos.join(' '))
  return palabras.every((palabra) => texto.includes(palabra))
}

export function hayFiltros(filtros) {
  return Object.values(filtros).some(Boolean)
}

// ajusta la página si quedó fuera de rango (por ejemplo tras eliminar)
export function paginar(elementos, pagina, porPagina) {
  const totalPaginas = Math.max(1, Math.ceil(elementos.length / porPagina))
  const actual = Math.min(Math.max(1, pagina), totalPaginas)
  const inicio = (actual - 1) * porPagina
  return {
    pagina: actual,
    totalPaginas,
    visibles: elementos.slice(inicio, inicio + porPagina),
    desde: elementos.length > 0 ? inicio + 1 : 0,
    hasta: Math.min(inicio + porPagina, elementos.length),
  }
}

export const CATALOGO_SIN_FILTROS = Object.freeze({ busqueda: '', soloActivas: false, prioridad: '' })

// Si coincide el nombre de la categoría, salen también sus subcategorías.
// La categoría sale si cumple o si alguna de sus subcategorías cumple.
export function filtrarCatalogo(categorias, { busqueda, soloActivas, prioridad }) {
  const cumple = (elemento) =>
    (!soloActivas || (elemento.tipo === 'subcategoria' ? elemento.disponible : elemento.activa)) &&
    (!prioridad || elemento.prioridadPorDefecto === prioridad)

  return categorias.flatMap((categoria) => {
    const nombreCoincide = coincideBusqueda([categoria.nombre], busqueda)
    const subcategorias = categoria.subcategorias.filter(
      (subcategoria) => cumple(subcategoria) && (nombreCoincide || coincideBusqueda([subcategoria.nombre], busqueda)),
    )
    const visible = (nombreCoincide && cumple(categoria)) || subcategorias.length > 0
    return visible ? [{ ...categoria, subcategorias }] : []
  })
}

export function contarFilas(categorias) {
  return categorias.reduce((total, { subcategorias }) => total + 1 + subcategorias.length, 0)
}

export const AMBIENTES_SIN_FILTROS = Object.freeze({ busqueda: '', sedeId: '', pabellonId: '', tipo: '' })

export function filtrarAmbientes(ambientes, { busqueda, sedeId, pabellonId, tipo }) {
  return ambientes.filter(
    (ambiente) =>
      (!sedeId || ambiente.sedeId === sedeId) &&
      (!pabellonId || ambiente.pabellonId === pabellonId) &&
      (!tipo || ambiente.tipo === tipo) &&
      coincideBusqueda([ambiente.codigo, ambiente.nombre], busqueda),
  )
}
