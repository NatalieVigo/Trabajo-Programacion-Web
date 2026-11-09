import { enTransaccion, siguienteId } from '../db/pool.js'
import { catalogoRepository } from '../repositories/catalogo.repository.js'
import { invitacionesRepository } from '../repositories/invitaciones.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { formatDate } from '../utils/format.js'
import { hashPassword } from '../utils/password.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'
import { textoAleatorio } from '../utils/tokens.js'
import {
  hasErrors,
  normalizeCorreo,
  normalizeNombre,
  normalizeTelefono,
  validateActivacion,
  validateInvitacion,
} from '../utils/validators.js'
import { emailTakenError, insertarCuenta } from './usuarios.service.js'

const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000
const UNIDAD_INFRAESTRUCTURA = 'Dirección de Infraestructura y Servicios'
const INVITACION_PENDIENTE = 'Ya hay una invitación pendiente para este correo.'

const NO_PENDIENTE = {
  aceptada: 'Esta invitación ya fue aceptada.',
  rechazada: 'Esta invitación fue rechazada.',
  revocada: 'Esta invitación fue revocada por el supervisor.',
}

// 'vencida' no se guarda, se calcula con la fecha de vencimiento
function estadoEfectivo(invitacion, ahora = Date.now()) {
  const vencida = invitacion.estado === 'pendiente' && invitacion.venceEn.getTime() < ahora
  return vencida ? 'vencida' : invitacion.estado
}

const presentar = (invitacion) => ({ ...invitacion, estadoEfectivo: estadoEfectivo(invitacion) })

async function buscarPorToken(token, db, opciones) {
  const invitacion = await invitacionesRepository.buscarPorToken(token, db, opciones)
  if (!invitacion) throw new ServiceError(404, 'INVITATION_NOT_FOUND', 'No encontramos esta invitación.')
  return invitacion
}

function assertPendiente(invitacion) {
  const estado = estadoEfectivo(invitacion)
  if (estado === 'vencida') {
    const mensaje = `Esta invitación venció el ${formatDate(invitacion.venceEn)}.`
    throw new ServiceError(410, 'INVITATION_EXPIRED', mensaje, null, { details: { venceEn: invitacion.venceEn } })
  }
  if (estado !== 'pendiente') {
    throw new ServiceError(409, 'INVITATION_NOT_PENDING', NO_PENDIENTE[estado], null, { details: { estado } })
  }
  return invitacion
}

// Datos precargados del alta por invitación (p07).
export async function obtenerPorToken(token) {
  return presentar(await buscarPorToken(token))
}

// categorías que se pueden elegir como especialidad (p07)
export async function opciones(token) {
  await buscarPorToken(token)
  return { categorias: await catalogoRepository.listarCategoriasActivas() }
}

// "Activar mi cuenta" (p07): crea la cuenta y deja la invitación como aceptada.
export async function aceptar(token, datos) {
  assertPendiente(await buscarPorToken(token))
  const categorias = (await catalogoRepository.listarCategoriasActivas()).map((categoria) => categoria.id)
  const fieldErrors = validateActivacion(datos ?? {}, { categorias })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const passwordHash = await hashPassword(datos.password)
  return enTransaccion(async (db) => {
    // se relee con bloqueo para que nadie la acepte o rechace al mismo tiempo
    const invitacion = assertPendiente(await buscarPorToken(token, db, { bloquear: true }))
    if (await usuariosRepository.buscarPorCorreo(invitacion.correo, db)) throw emailTakenError()

    const usuario = await insertarCuenta(
      {
        nombres: invitacion.nombres,
        apellidos: invitacion.apellidos,
        correo: invitacion.correo,
        telefono: normalizeTelefono(datos.telefono),
        rol: invitacion.rol,
        unidad: UNIDAD_INFRAESTRUCTURA,
        vinculo: null,
        especialidades: [...new Set(datos.especialidades)],
        passwordHash,
        aceptaTerminos: true,
        invitacionId: invitacion.id,
      },
      db,
    )
    await invitacionesRepository.responder(invitacion.id, 'aceptada', usuario.creadoEn, db)
    return usuario
  })
}

// "Rechazar invitación" (p07)
export async function rechazar(token) {
  return enTransaccion(async (db) => {
    const invitacion = assertPendiente(await buscarPorToken(token, db, { bloquear: true }))
    await invitacionesRepository.responder(invitacion.id, 'rechazada', new Date(), db)
    return presentar(await buscarPorToken(token, db))
  })
}

// Solo el supervisor (lo exige la ruta). Token aleatorio de 96 bits; la invitación vence a los 7 días.
export async function crear(datos, invitadoPorId) {
  const fieldErrors = validateInvitacion(datos ?? {})
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const correo = normalizeCorreo(datos.correo)
  return enTransaccion(async (db) => {
    const creadaEn = new Date()
    if (await usuariosRepository.buscarPorCorreo(correo, db)) throw emailTakenError()
    if (await invitacionesRepository.hayPendiente(correo, creadaEn, db)) {
      throw new ServiceError(409, 'INVITATION_PENDING', INVITACION_PENDIENTE, { correo: INVITACION_PENDIENTE })
    }

    const token = `INV-${textoAleatorio(12).toUpperCase()}`
    await invitacionesRepository.insertar(
      {
        id: await siguienteId(db, 'invitaciones', 'inv'),
        token,
        nombres: normalizeNombre(datos.nombres),
        apellidos: normalizeNombre(datos.apellidos),
        correo,
        rol: datos.rol,
        telefono: normalizeTelefono(datos.telefono),
        invitadoPor: invitadoPorId,
        venceEn: new Date(creadaEn.getTime() + VIGENCIA_MS),
        creadaEn,
      },
      db,
    )
    return presentar(await buscarPorToken(token, db))
  })
}
