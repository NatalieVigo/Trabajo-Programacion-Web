import { pluralize } from '../../utils/format.js'

/** Más tickets en curso por técnico habilitado que esto merece un aviso (p16). */
export const TICKETS_POR_TECNICO = 2

/** Categorías habilitadas de cada técnico: { tecnicoId: [categoriaIds] }. */
export function habilitadasDe(tecnicos) {
  return Object.fromEntries(tecnicos.map(({ id, habilitadas }) => [id, habilitadas]))
}

const mismasCategorias = (a = [], b = []) => a.length === b.length && a.every((id) => b.includes(id))

/** Técnicos cuya lista de categorías habilitadas cambió respecto de lo guardado. */
export function tecnicosCambiados(guardadas, actuales) {
  return Object.keys(actuales).filter((tecnicoId) => !mismasCategorias(guardadas[tecnicoId], actuales[tecnicoId]))
}

/** Marca o desmarca la `categoriaId` de un técnico, conservando el orden de las `categorias`. */
export function alternarHabilitacion(habilitadas, tecnicoId, categoriaId, categorias) {
  const actuales = habilitadas[tecnicoId] ?? []
  const siguientes = actuales.includes(categoriaId)
    ? actuales.filter((id) => id !== categoriaId)
    : categorias.map(({ id }) => id).filter((id) => id === categoriaId || actuales.includes(id))
  return { ...habilitadas, [tecnicoId]: siguientes }
}

/**
 * Avisos sobre cómo está cubierta cada categoría activa con las habilitaciones que se están editando: ninguna persona
 * habilitada, o más de dos tickets en curso por técnico habilitado (p16: «Climatización tiene solo dos técnicos
 * habilitados y 5 tickets abiertos…»).
 */
export function avisosDeCobertura(categorias, habilitadas) {
  const listas = Object.values(habilitadas)
  return categorias
    .filter((categoria) => categoria.activa)
    .flatMap((categoria) => {
      const habilitados = listas.filter((ids) => ids.includes(categoria.id)).length
      if (habilitados === 0) {
        return [{ categoriaId: categoria.id, variante: 'warning', mensaje: `Ningún técnico está habilitado para atender ${categoria.nombre}.` }]
      }
      if (categoria.ticketsEnCurso > habilitados * TICKETS_POR_TECNICO) {
        const mensaje =
          `${categoria.nombre} tiene ${pluralize(habilitados, 'técnico habilitado', 'técnicos habilitados')} y ` +
          `${pluralize(categoria.ticketsEnCurso, 'ticket en curso', 'tickets en curso')}. Considera habilitar a otro técnico.`
        return [{ categoriaId: categoria.id, variante: 'info', mensaje }]
      }
      return []
    })
}

/** Encabezado corto de una categoría en la matriz, como en p16: «Redes y conectividad» → «Redes». */
export function nombreCorto(nombre) {
  return nombre.split(/\s+/)[0]
}
