import { categoriasRepository, habilitacionesRepository } from '../repositories/catalogo.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { getFullName } from '../utils/format.js'
import { nextId } from '../utils/ids.js'
import { simulateRequest } from './request.js'
import { ServiceError } from './ServiceError.js'
import { exigirSupervisorActivo } from './supervisorActivo.js'
import { SIN_TICKETS, contarTicketsPor } from './ticketsEnCurso.js'

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es')
const porNombreCompleto = (a, b) => getFullName(a).localeCompare(getFullName(b), 'es')

/** Técnicos que pueden recibir habilitaciones: con rol técnico y cuenta activa (HU-1), por nombre. */
function tecnicosActivos() {
  return usuariosRepository.findAll({ rol: 'tecnico', estado: 'activo' }).sort(porNombreCompleto)
}

/**
 * La matriz técnico × categoría (p16). Lee las cuentas (HU-1) y los tickets (HU-3) sin modificarlos: la especialidad
 * que cada técnico declaró al activar su cuenta y su carga actual (tickets asignados en curso).
 */
function leerMatriz() {
  const categorias = categoriasRepository.findAll().sort(porNombre)
  const existentes = new Set(categorias.map((categoria) => categoria.id))
  const ticketsPorCategoria = contarTicketsPor('categoriaId')
  const cargaPorTecnico = contarTicketsPor('asignadoA')
  const habilitaciones = habilitacionesRepository.findAll()
  const orden = new Map(categorias.map((categoria, indice) => [categoria.id, indice]))
  const enOrden = (ids) => ids.filter((id) => existentes.has(id)).sort((a, b) => orden.get(a) - orden.get(b))

  return {
    categorias: categorias.map(({ id, nombre, activa }) => ({
      id,
      nombre,
      activa,
      ticketsEnCurso: (ticketsPorCategoria.get(id) ?? SIN_TICKETS).enCurso,
    })),
    tecnicos: tecnicosActivos().map((tecnico) => ({
      id: tecnico.id,
      nombres: tecnico.nombres,
      apellidos: tecnico.apellidos,
      especialidades: enOrden(tecnico.especialidades ?? []),
      carga: (cargaPorTecnico.get(tecnico.id) ?? SIN_TICKETS).enCurso,
      habilitadas: enOrden(
        habilitaciones.filter(({ tecnicoId }) => tecnicoId === tecnico.id).map(({ categoriaId }) => categoriaId),
      ),
    })),
  }
}

/**
 * Técnicos por categoría (HU-2 · 2.3, p16): { categorias: [{ id, nombre, activa, ticketsEnCurso }], tecnicos: [{ id,
 * nombres, apellidos, especialidades (declaradas), carga, habilitadas }] }. Las categorías van por nombre y las
 * listas de cada técnico, en ese mismo orden.
 */
export function obtenerMatriz() {
  return simulateRequest(leerMatriz)
}

/**
 * Guarda la matriz: `cambios` es { tecnicoId: [categoriaIds] } con las categorías en las que queda habilitado cada
 * técnico que se envía; los demás no cambian. Falla con 403 FORBIDDEN o con 400 VALIDATION_ERROR si nombra un técnico
 * que no está activo o una categoría que no existe. Devuelve la matriz actualizada.
 */
export function guardarMatriz(cambios, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const tecnicos = new Set(tecnicosActivos().map(({ id }) => id))
    const categorias = new Set(categoriasRepository.findAll().map(({ id }) => id))
    const entradas = Object.entries(cambios ?? {})
    const valida = entradas.every(
      ([tecnicoId, ids]) => tecnicos.has(tecnicoId) && Array.isArray(ids) && ids.every((id) => categorias.has(id)),
    )
    if (!valida) {
      throw new ServiceError(
        400,
        'VALIDATION_ERROR',
        'La matriz cambió mientras la editabas: hay técnicos o categorías que ya no están. Actualiza la página.',
      )
    }

    for (const [tecnicoId, ids] of entradas) {
      const deseadas = new Set(ids)
      const actuales = habilitacionesRepository.findAll({ tecnicoId })
      actuales
        .filter(({ categoriaId }) => !deseadas.has(categoriaId))
        .forEach(({ id }) => habilitacionesRepository.remove(id))
      const yaHabilitadas = new Set(actuales.map(({ categoriaId }) => categoriaId))
      for (const categoriaId of deseadas) {
        if (yaHabilitadas.has(categoriaId)) continue
        const id = nextId('hab', habilitacionesRepository.findAll())
        habilitacionesRepository.insert({ id, tecnicoId, categoriaId })
      }
    }
    return leerMatriz()
  })
}
