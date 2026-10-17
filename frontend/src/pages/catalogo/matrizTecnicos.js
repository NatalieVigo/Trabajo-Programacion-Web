import { pluralize } from '../../utils/format.js'

// con más tickets en curso por técnico que esto, se muestra un aviso
export const TICKETS_POR_TECNICO = 2

export function habilitadasDe(tecnicos) {
  return Object.fromEntries(tecnicos.map(({ id, habilitadas }) => [id, habilitadas]))
}

const mismasCategorias = (a = [], b = []) => a.length === b.length && a.every((id) => b.includes(id))

export function tecnicosCambiados(guardadas, actuales) {
  return Object.keys(actuales).filter((tecnicoId) => !mismasCategorias(guardadas[tecnicoId], actuales[tecnicoId]))
}

// mantiene el mismo orden que la lista de categorías
export function alternarHabilitacion(habilitadas, tecnicoId, categoriaId, categorias) {
  const actuales = habilitadas[tecnicoId] ?? []
  const siguientes = actuales.includes(categoriaId)
    ? actuales.filter((id) => id !== categoriaId)
    : categorias.map(({ id }) => id).filter((id) => id === categoriaId || actuales.includes(id))
  return { ...habilitadas, [tecnicoId]: siguientes }
}

// avisa si una categoría activa no tiene técnicos o tiene demasiados tickets por técnico
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

export function nombreCorto(nombre) {
  return nombre.split(/\s+/)[0]
}
