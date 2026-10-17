import {
  categoriasRepository,
  habilitacionesRepository,
  subcategoriasRepository,
} from '../repositories/catalogo.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { CATALOGO_MESSAGES, parseHoras, validateCategoria } from '../utils/catalogoValidators.js'
import { pluralize } from '../utils/format.js'
import { nextId } from '../utils/ids.js'
import { hasErrors, normalizeNombre } from '../utils/validators.js'
import { assertNombreLibre, enUsoError, enumerar, pick } from './catalogoComun.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'
import { exigirSupervisorActivo } from './supervisorActivo.js'
import { SIN_TICKETS, contarTicketsPor } from './ticketsEnCurso.js'

// categoriaId es el padre; vacío para una categoría principal
const CAMPOS = ['nombre', 'categoriaId', 'descripcion', 'activa', 'prioridadPorDefecto', 'tiempoEsperadoHoras']

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es')

// lee tickets y especialidades de otras historias, sin modificarlos
function leerUsos() {
  const tickets = ticketsRepository.findAll()
  const especialidades = new Map()
  for (const usuario of usuariosRepository.findAll()) {
    for (const categoriaId of usuario.especialidades ?? []) {
      especialidades.set(categoriaId, (especialidades.get(categoriaId) ?? 0) + 1)
    }
  }
  return {
    porCategoria: contarTicketsPor('categoriaId', tickets),
    // los tickets del seed no traen subcategoría, así que ahí cuentan 0
    porSubcategoria: contarTicketsPor('subcategoriaId', tickets),
    especialidades,
  }
}

function presentarCategoria(categoria, totalSubcategorias, usos) {
  const tickets = usos.porCategoria.get(categoria.id) ?? SIN_TICKETS
  const enUso = {
    tickets: tickets.total,
    subcategorias: totalSubcategorias,
    especialidades: usos.especialidades.get(categoria.id) ?? 0,
  }
  return {
    tipo: 'categoria',
    ...categoria,
    ticketsEnCurso: tickets.enCurso,
    usos: enUso,
    eliminable: Object.values(enUso).every((cantidad) => cantidad === 0),
  }
}

// con la categoría inactiva, la subcategoría no está disponible aunque siga activa
function presentarSubcategoria(subcategoria, categoriaActiva, usos) {
  const tickets = usos.porSubcategoria.get(subcategoria.id) ?? SIN_TICKETS
  return {
    tipo: 'subcategoria',
    ...subcategoria,
    disponible: subcategoria.activa && categoriaActiva,
    ticketsEnCurso: tickets.enCurso,
    usos: { tickets: tickets.total },
    eliminable: tickets.total === 0,
  }
}

function buscar(id) {
  const categoria = categoriasRepository.findById(id)
  if (categoria) return { tipo: 'categoria', registro: categoria }
  const subcategoria = subcategoriasRepository.findById(id)
  if (subcategoria) return { tipo: 'subcategoria', registro: subcategoria }
  throw new ServiceError(404, 'CATEGORY_NOT_FOUND', 'No encontramos esta categoría. Puede que se haya eliminado.')
}

function presentar({ tipo, registro }, usos = leerUsos()) {
  if (tipo === 'subcategoria') {
    const categoriaActiva = categoriasRepository.findById(registro.categoriaId)?.activa ?? false
    return presentarSubcategoria(registro, categoriaActiva, usos)
  }
  return presentarCategoria(registro, subcategoriasRepository.findAll({ categoriaId: registro.id }).length, usos)
}

function erroresDe(valores) {
  const categorias = categoriasRepository.findAll().map((categoria) => categoria.id)
  const fieldErrors = validateCategoria(valores, { categorias })
  if (typeof valores.activa !== 'boolean') fieldErrors.activa = 'Indica si está activa.'
  return fieldErrors
}

function camposGuardados(valores) {
  return {
    nombre: normalizeNombre(valores.nombre),
    descripcion: String(valores.descripcion ?? '').trim(),
    activa: valores.activa,
    prioridadPorDefecto: valores.prioridadPorDefecto,
    tiempoEsperadoHoras: parseHoras(valores.tiempoEsperadoHoras),
  }
}

// una subcategoría puede repetir nombre si está en otra categoría
function assertNombreDisponible(nombre, categoriaId, idActual) {
  if (categoriaId) {
    const hermanas = subcategoriasRepository.findAll({ categoriaId })
    assertNombreLibre(hermanas, nombre, CATALOGO_MESSAGES.subcategoriaTaken, idActual)
  } else {
    assertNombreLibre(categoriasRepository.findAll(), nombre, CATALOGO_MESSAGES.categoriaTaken, idActual)
  }
}

function mensajeEnUso({ nombre, usos }) {
  const partes = [
    usos.tickets > 0 && pluralize(usos.tickets, 'ticket registrado', 'tickets registrados'),
    usos.subcategorias > 0 && pluralize(usos.subcategorias, 'subcategoría', 'subcategorías'),
    usos.especialidades > 0 &&
      pluralize(
        usos.especialidades,
        'técnico que la declaró como especialidad',
        'técnicos que la declararon como especialidad',
      ),
  ].filter(Boolean)
  return `No se puede eliminar «${nombre}»: tiene ${enumerar(partes)}. Puedes desactivarla en su lugar.`
}

// Catálogo completo (HU-2), con contadores y si cada elemento se puede eliminar.
export function listar() {
  return simulateRequest(() => {
    const usos = leerUsos()
    const subcategorias = subcategoriasRepository.findAll().sort(porNombre)
    return categoriasRepository
      .findAll()
      .sort(porNombre)
      .map((categoria) => {
        const propias = subcategorias.filter((subcategoria) => subcategoria.categoriaId === categoria.id)
        return {
          ...presentarCategoria(categoria, propias.length, usos),
          subcategorias: propias.map((subcategoria) => presentarSubcategoria(subcategoria, categoria.activa, usos)),
        }
      })
  })
}

export function obtener(id) {
  return simulateRequest(() => presentar(buscar(id)))
}

// Crea una categoría, o una subcategoría si viene categoriaId.
export function crear(datos, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const valores = { categoriaId: '', activa: true, ...pick(datos ?? {}, CAMPOS) }
    const fieldErrors = erroresDe(valores)
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

    const campos = camposGuardados(valores)
    const padreId = valores.categoriaId || null
    assertNombreDisponible(campos.nombre, padreId)
    if (!padreId) {
      const categoria = categoriasRepository.insert({ id: nextId('cat', categoriasRepository.findAll(), 2), ...campos })
      return presentar({ tipo: 'categoria', registro: categoria })
    }
    const subcategoria = subcategoriasRepository.insert({
      id: nextId('sub', subcategoriasRepository.findAll(), 2),
      categoriaId: padreId,
      ...campos,
    })
    return presentar({ tipo: 'subcategoria', registro: subcategoria })
  })
}

// Si tiene tickets en curso, pide confirmación antes de desactivar.
function assertDesactivacionConfirmada(elemento, activa, confirmado) {
  const desactiva = elemento.activa && activa === false
  if (!desactiva || elemento.ticketsEnCurso === 0 || confirmado === true) return
  const tickets = pluralize(elemento.ticketsEnCurso, 'ticket en curso', 'tickets en curso')
  throw new ServiceError(
    409,
    'OPEN_TICKETS',
    `«${elemento.nombre}» tiene ${tickets}. Confirma la desactivación: seguirán atendiéndose, pero no se podrán registrar tickets nuevos.`,
    null,
    { details: { ticketsEnCurso: elemento.ticketsEnCurso } },
  )
}

// una categoría no pasa a subcategoría; una subcategoría sí puede cambiar de padre
export function actualizar(id, datos, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const { tipo, registro } = buscar(id)
    const valores = { ...registro, categoriaId: registro.categoriaId ?? '', ...pick(datos ?? {}, CAMPOS) }
    const fieldErrors = erroresDe(valores)
    if (tipo === 'categoria' && valores.categoriaId) fieldErrors.categoriaId = CATALOGO_MESSAGES.padreNoPermitido
    if (tipo === 'subcategoria' && !valores.categoriaId) fieldErrors.categoriaId = CATALOGO_MESSAGES.padreRequired
    if (hasErrors(fieldErrors)) throw validationError(fieldErrors)
    assertDesactivacionConfirmada(presentar({ tipo, registro }), valores.activa, datos?.confirmado)

    const campos = camposGuardados(valores)
    if (tipo === 'categoria') {
      assertNombreDisponible(campos.nombre, null, id)
      return presentar({ tipo, registro: categoriasRepository.update(id, campos) })
    }
    assertNombreDisponible(campos.nombre, valores.categoriaId, id)
    return presentar({ tipo, registro: subcategoriasRepository.update(id, { categoriaId: valores.categoriaId, ...campos }) })
  })
}

// Solo elimina lo que no se usa; las habilitaciones de la categoría se van con ella.
export function eliminar(id, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const elemento = presentar(buscar(id))
    if (!elemento.eliminable) {
      throw enUsoError(mensajeEnUso(elemento), elemento.usos)
    }
    if (elemento.tipo === 'categoria') {
      habilitacionesRepository.findAll({ categoriaId: id }).forEach(({ id: habilitacionId }) => {
        habilitacionesRepository.remove(habilitacionId)
      })
      categoriasRepository.remove(id)
    } else {
      subcategoriasRepository.remove(id)
    }
    return { id, tipo: elemento.tipo, nombre: elemento.nombre }
  })
}

// Lo inactivo no recibe tickets nuevos, pero los que ya tiene siguen su curso.
export function cambiarEstado(id, activa, supervisorId, { confirmado = false } = {}) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    if (typeof activa !== 'boolean') throw validationError({ activa: 'Indica si está activa.' })
    const { tipo, registro } = buscar(id)
    assertDesactivacionConfirmada(presentar({ tipo, registro }), activa, confirmado)
    const repositorio = tipo === 'categoria' ? categoriasRepository : subcategoriasRepository
    return presentar({ tipo, registro: repositorio.update(id, { activa }) })
  })
}

// Lo que se ofrece al registrar tickets; sin subcategorías activas no aparece.
export function listarDisponibles() {
  return simulateRequest(() => {
    const campos = ({ id, nombre, descripcion, prioridadPorDefecto, tiempoEsperadoHoras }) => ({
      id,
      nombre,
      descripcion,
      prioridadPorDefecto,
      tiempoEsperadoHoras,
    })
    const subcategorias = subcategoriasRepository.findAll({ activa: true }).sort(porNombre)
    return categoriasRepository
      .findAll({ activa: true })
      .sort(porNombre)
      .map((categoria) => ({
        ...campos(categoria),
        subcategorias: subcategorias
          .filter((subcategoria) => subcategoria.categoriaId === categoria.id)
          .map(campos),
      }))
      .filter((categoria) => categoria.subcategorias.length > 0)
  })
}
