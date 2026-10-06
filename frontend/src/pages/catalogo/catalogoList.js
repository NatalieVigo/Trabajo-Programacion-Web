/** Búsqueda, filtros y paginación de las listas del catálogo (HU-2), en la interfaz y sin pedir datos de nuevo. */

/** «Huamán» y «huaman» se buscan igual: sin tildes y en minúsculas. */
export function normalizarBusqueda(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/** Si cada palabra de la `busqueda` aparece en alguno de los `textos`. Una búsqueda vacía coincide con todo. */
export function coincideBusqueda(textos, busqueda) {
  const palabras = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean)
  const texto = normalizarBusqueda(textos.join(' '))
  return palabras.every((palabra) => texto.includes(palabra))
}

/** Si alguno de los filtros tiene valor. */
export function hayFiltros(filtros) {
  return Object.values(filtros).some(Boolean)
}

/**
 * La `pagina` pedida de `elementos` (se ajusta si quedó fuera de rango, por ejemplo tras eliminar): { pagina,
 * totalPaginas, visibles, desde, hasta }, con `desde` y `hasta` contados desde 1 para «Mostrando 1–10 de 48».
 */
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

/**
 * Catálogo filtrado (p12). «Solo activas» deja las categorías activas y las subcategorías disponibles, y la prioridad
 * se aplica a cada fila. La búsqueda encuentra categorías y subcategorías: si coincide el nombre de una categoría,
 * se muestran también sus subcategorías. Una categoría aparece si cumple los filtros o si alguna de sus subcategorías
 * los cumple (para mostrar a qué categoría pertenece).
 */
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

/** Filas de un catálogo: cada categoría y cada subcategoría. */
export function contarFilas(categorias) {
  return categorias.reduce((total, { subcategorias }) => total + 1 + subcategorias.length, 0)
}

export const AMBIENTES_SIN_FILTROS = Object.freeze({ busqueda: '', sedeId: '', pabellonId: '', tipo: '' })

/** Ambientes de la sede, el pabellón y el tipo elegidos ('' = todos) cuyo código o nombre coincide con la búsqueda. */
export function filtrarAmbientes(ambientes, { busqueda, sedeId, pabellonId, tipo }) {
  return ambientes.filter(
    (ambiente) =>
      (!sedeId || ambiente.sedeId === sedeId) &&
      (!pabellonId || ambiente.pabellonId === pabellonId) &&
      (!tipo || ambiente.tipo === tipo) &&
      coincideBusqueda([ambiente.codigo, ambiente.nombre], busqueda),
  )
}
