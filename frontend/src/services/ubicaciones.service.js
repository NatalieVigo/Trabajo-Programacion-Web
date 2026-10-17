import { ambientesRepository, pabellonesRepository, sedesRepository } from '../repositories/catalogo.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import {
  CATALOGO_MESSAGES,
  TIPOS_AMBIENTE,
  normalizeCodigo,
  parseEntero,
  validateAmbiente,
  validatePabellon,
  validateSede,
} from '../utils/catalogoValidators.js'
import { pluralize } from '../utils/format.js'
import { nextId } from '../utils/ids.js'
import { hasErrors, normalizeNombre } from '../utils/validators.js'
import { assertNombreLibre, contarPor, enUsoError, enumerar, pick } from './catalogoComun.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'
import { exigirSupervisorActivo } from './supervisorActivo.js'
import { SIN_TICKETS, contarTicketsPor } from './ticketsEnCurso.js'

const CAMPOS_PABELLON = ['sedeId', 'nombre']
const CAMPOS_AMBIENTE = ['codigo', 'nombre', 'tipo', 'pabellonId', 'piso', 'capacidad']

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true })
const porCodigo = (a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })

function buscar(repositorio, id, code, mensaje) {
  const registro = repositorio.findById(id)
  if (!registro) throw new ServiceError(404, code, mensaje)
  return registro
}

const buscarSede = (id) => buscar(sedesRepository, id, 'SEDE_NOT_FOUND', 'No encontramos esta sede.')
const buscarPabellon = (id) => buscar(pabellonesRepository, id, 'PABELLON_NOT_FOUND', 'No encontramos este pabellón.')
const buscarAmbiente = (id) => buscar(ambientesRepository, id, 'AMBIENTE_NOT_FOUND', 'No encontramos este ambiente.')

// Sedes y pabellones

// una sede se puede borrar si no tiene pabellones, y un pabellón si no tiene ambientes
export function listarSedes() {
  return simulateRequest(() => {
    const ambientesPorPabellon = contarPor(ambientesRepository.findAll(), 'pabellonId')
    const pabellones = pabellonesRepository.findAll().sort(porNombre)
    return sedesRepository
      .findAll()
      .sort(porNombre)
      .map((sede) => {
        const propios = pabellones
          .filter((pabellon) => pabellon.sedeId === sede.id)
          .map((pabellon) => {
            const ambientes = ambientesPorPabellon.get(pabellon.id) ?? 0
            return { ...pabellon, ambientes, eliminable: ambientes === 0 }
          })
        const ambientes = propios.reduce((total, pabellon) => total + pabellon.ambientes, 0)
        return { ...sede, pabellones: propios, ambientes, eliminable: propios.length === 0 }
      })
  })
}

function validarSede(valores, idActual) {
  const fieldErrors = validateSede(valores)
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)
  const nombre = normalizeNombre(valores.nombre)
  assertNombreLibre(sedesRepository.findAll(), nombre, CATALOGO_MESSAGES.sedeTaken, idActual)
  return { nombre }
}

export function crearSede(datos, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const campos = validarSede(datos ?? {})
    return sedesRepository.insert({ id: nextId('sed', sedesRepository.findAll(), 2), ...campos })
  })
}

export function actualizarSede(id, datos, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const sede = buscarSede(id)
    const campos = validarSede({ ...sede, ...pick(datos ?? {}, ['nombre']) }, id)
    return sedesRepository.update(id, campos)
  })
}

export function eliminarSede(id, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const sede = buscarSede(id)
    const pabellones = pabellonesRepository.findAll({ sedeId: id }).length
    if (pabellones > 0) {
      const mensaje = `No se puede eliminar «${sede.nombre}»: tiene ${pluralize(pabellones, 'pabellón', 'pabellones')}.`
      throw enUsoError(mensaje, { pabellones })
    }
    sedesRepository.remove(id)
    return sede
  })
}

function validarPabellon(valores, idActual) {
  const sedes = sedesRepository.findAll().map((sede) => sede.id)
  const fieldErrors = validatePabellon(valores, { sedes })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)
  const campos = { sedeId: valores.sedeId, nombre: normalizeNombre(valores.nombre) }
  const vecinos = pabellonesRepository.findAll({ sedeId: campos.sedeId })
  assertNombreLibre(vecinos, campos.nombre, CATALOGO_MESSAGES.pabellonTaken, idActual)
  return campos
}

// el nombre no se puede repetir dentro de la misma sede
export function crearPabellon(datos, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const campos = validarPabellon(pick(datos ?? {}, CAMPOS_PABELLON))
    return pabellonesRepository.insert({ id: nextId('pab', pabellonesRepository.findAll(), 2), ...campos })
  })
}

export function actualizarPabellon(id, datos, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const pabellon = buscarPabellon(id)
    const campos = validarPabellon({ ...pabellon, ...pick(datos ?? {}, CAMPOS_PABELLON) }, id)
    return pabellonesRepository.update(id, campos)
  })
}

export function eliminarPabellon(id, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const pabellon = buscarPabellon(id)
    const ambientes = ambientesRepository.findAll({ pabellonId: id }).length
    if (ambientes > 0) {
      const mensaje = `No se puede eliminar el pabellón «${pabellon.nombre}»: tiene ${pluralize(ambientes, 'ambiente', 'ambientes')}.`
      throw enUsoError(mensaje, { ambientes })
    }
    pabellonesRepository.remove(id)
    return pabellon
  })
}

// Ambientes

// tickets y usuarios son de otras historias, aquí solo se leen
function contextoDeAmbientes() {
  return {
    tickets: contarTicketsPor('ambienteId'),
    habituales: contarPor(usuariosRepository.findAll(), 'ambienteHabitualId'),
    pabellones: new Map(pabellonesRepository.findAll().map((pabellon) => [pabellon.id, pabellon])),
    sedes: new Map(sedesRepository.findAll().map((sede) => [sede.id, sede])),
  }
}

function presentarAmbiente(ambiente, contexto = contextoDeAmbientes()) {
  const pabellon = contexto.pabellones.get(ambiente.pabellonId)
  const sede = pabellon ? contexto.sedes.get(pabellon.sedeId) : undefined
  const tickets = contexto.tickets.get(ambiente.id) ?? SIN_TICKETS
  const usos = { tickets: tickets.total, usuarios: contexto.habituales.get(ambiente.id) ?? 0 }
  return {
    ...ambiente,
    pabellonNombre: pabellon?.nombre ?? null,
    sedeId: sede?.id ?? null,
    sedeNombre: sede?.nombre ?? null,
    ticketsEnCurso: tickets.enCurso,
    usos,
    eliminable: usos.tickets === 0 && usos.usuarios === 0,
  }
}

export function listarAmbientes() {
  return simulateRequest(() => {
    const contexto = contextoDeAmbientes()
    return ambientesRepository
      .findAll()
      .sort(porCodigo)
      .map((ambiente) => presentarAmbiente(ambiente, contexto))
  })
}

// si no tiene nombre se arma con tipo y código, por ejemplo "Laboratorio H-212"
function validarAmbiente(valores, idActual) {
  const pabellones = pabellonesRepository.findAll().map((pabellon) => pabellon.id)
  const fieldErrors = validateAmbiente(valores, { pabellones })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const codigo = normalizeCodigo(valores.codigo)
  if (ambientesRepository.findAll().some((ambiente) => ambiente.id !== idActual && ambiente.codigo === codigo)) {
    throw new ServiceError(409, 'CODE_TAKEN', CATALOGO_MESSAGES.codigoTaken, { codigo: CATALOGO_MESSAGES.codigoTaken })
  }
  return {
    codigo,
    nombre: normalizeNombre(valores.nombre) || `${TIPOS_AMBIENTE[valores.tipo]} ${codigo}`,
    tipo: valores.tipo,
    pabellonId: valores.pabellonId,
    piso: parseEntero(valores.piso),
    capacidad: parseEntero(valores.capacidad),
  }
}

export function crearAmbiente(datos, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const campos = validarAmbiente(pick(datos ?? {}, CAMPOS_AMBIENTE))
    const ambiente = ambientesRepository.insert({ id: nextId('amb', ambientesRepository.findAll(), 2), ...campos })
    return presentarAmbiente(ambiente)
  })
}

// los campos que no se envían se quedan como estaban
export function actualizarAmbiente(id, datos, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const ambiente = buscarAmbiente(id)
    const campos = validarAmbiente({ ...ambiente, ...pick(datos ?? {}, CAMPOS_AMBIENTE) }, id)
    return presentarAmbiente(ambientesRepository.update(id, campos))
  })
}

// no se borra si tiene tickets o alguien lo tiene como ambiente habitual
export function eliminarAmbiente(id, supervisorId) {
  return simulateRequest(() => {
    exigirSupervisorActivo(supervisorId)
    const ambiente = presentarAmbiente(buscarAmbiente(id))
    if (!ambiente.eliminable) {
      const { tickets, usuarios } = ambiente.usos
      const partes = [
        tickets > 0 && pluralize(tickets, 'ticket registrado', 'tickets registrados'),
        usuarios > 0 &&
          pluralize(usuarios, 'usuario que lo tiene como ambiente habitual', 'usuarios que lo tienen como ambiente habitual'),
      ].filter(Boolean)
      throw enUsoError(`No se puede eliminar «${ambiente.codigo}»: tiene ${enumerar(partes)}.`, ambiente.usos)
    }
    ambientesRepository.remove(id)
    return ambiente
  })
}
