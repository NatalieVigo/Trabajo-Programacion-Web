import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bitacoraRepository, historialRepository } from '../repositories/atencion.repository.js'
import { readTable, writeTable } from '../repositories/db.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { ATENCION_MESSAGES } from '../utils/atencionValidators.js'
import { agregarEntrada, cambiarEstado, obtenerAtencion } from './atencion.service.js'

const CAMILA = 'usr-001'
const JULIO = 'usr-002'
const LUCIA = 'usr-003'
const BLOQUEADO = 'usr-004'
const RENZO = 'usr-005'

/** Lo reportó Camila y lo atiende Julio. */
const EN_ATENCION = 'TCK-2026-00144'
const EN_ESPERA = 'TCK-2026-00143'
const RESUELTO = 'TCK-2026-00141'
const DE_SANDRA = 'TCK-2026-00138'
const SIN_ASIGNAR = 'TCK-2026-00147'
const CERRADO = 'TCK-2026-00131'
const AHORA = '2026-10-01T15:00:00.000Z'

const fallo = (promise) => promise.catch((error) => error)
const permisosDe = async (codigo, usuarioId) => (await obtenerAtencion(codigo, usuarioId)).permisos
const estadoDe = (ticketId) => ticketsRepository.findById(ticketId).estado
const historialDe = (ticketId) => historialRepository.findAll({ ticketId })

/** Cambia un ticket directamente en la base, como lo harían la asignación (HU-4) o la reapertura (HU-3). */
function modificarTicket(ticketId, cambios) {
  writeTable(
    'tickets',
    readTable('tickets').map((ticket) => (ticket.id === ticketId ? { ...ticket, ...cambios } : ticket)),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('atencion.service · obtenerAtencion', () => {
  it('devuelve el ticket con los nombres de su categoría, su ambiente y las personas', async () => {
    const { ticket } = await obtenerAtencion(EN_ATENCION, JULIO)

    expect(ticket).toEqual({
      id: 'tck-00144',
      codigo: 'TCK-2026-00144',
      asunto: 'Punto de red caído en laboratorio',
      estado: 'en_atencion',
      prioridad: 'critica',
      creadoEn: '2026-09-29T20:40:00.000Z',
      cerradoEn: null,
      categoria: { id: 'cat-02', nombre: 'Redes y conectividad' },
      ambiente: { id: 'amb-05', codigo: 'H-210', nombre: 'Laboratorio de Redes' },
      solicitante: { id: CAMILA, nombres: 'Camila Alejandra', apellidos: 'Quispe Ramos', rol: 'usuario' },
      tecnico: { id: JULIO, nombres: 'Julio César', apellidos: 'Paredes Soto', rol: 'tecnico' },
    })
  })

  it('un ticket en cola no tiene técnico', async () => {
    const { ticket } = await obtenerAtencion(SIN_ASIGNAR, LUCIA)

    expect(ticket.tecnico).toBeNull()
  })

  it('el equipo lee toda la bitácora, de la entrada más antigua a la más reciente', async () => {
    const { bitacora } = await obtenerAtencion(EN_ATENCION, JULIO)

    expect(bitacora.map(({ id, tipo, autor }) => [id, tipo, autor.id])).toEqual([
      ['bit-039', 'publico', CAMILA],
      ['bit-040', 'publico', LUCIA],
      ['bit-041', 'interno', JULIO],
      ['bit-042', 'publico', JULIO],
    ])
    expect(bitacora[2]).toEqual({
      id: 'bit-041',
      tipo: 'interno',
      mensaje: 'El switch del gabinete del piso 2 está apagado: no le llega energía del tomacorriente del rack.',
      creadoEn: '2026-09-29T21:30:00.000Z',
      autor: { id: JULIO, nombres: 'Julio César', apellidos: 'Paredes Soto', rol: 'tecnico' },
    })
  })

  it('quien reportó el ticket solo recibe los comentarios públicos', async () => {
    const { bitacora, permisos } = await obtenerAtencion(EN_ATENCION, CAMILA)

    expect(bitacora.map(({ id }) => id)).toEqual(['bit-039', 'bit-040', 'bit-042'])
    expect(bitacora.every(({ tipo }) => tipo === 'publico')).toBe(true)
    expect(permisos).toEqual({ verInternas: false, comentar: true, notaInterna: false, transiciones: [] })
  })

  it('el técnico asignado y el supervisor escriben; otro técnico solo lee', async () => {
    const escribe = { verInternas: true, comentar: true, notaInterna: true }
    const soloLee = { verInternas: true, comentar: false, notaInterna: false }

    expect(await permisosDe(EN_ATENCION, JULIO)).toMatchObject(escribe)
    expect(await permisosDe(DE_SANDRA, LUCIA)).toMatchObject(escribe)
    expect(await permisosDe(SIN_ASIGNAR, LUCIA)).toMatchObject(escribe)
    expect(await permisosDe(DE_SANDRA, JULIO)).toMatchObject(soloLee)
    expect(await permisosDe(SIN_ASIGNAR, JULIO)).toMatchObject(soloLee)
  })

  it('un ticket cerrado ya no admite entradas de nadie', async () => {
    expect(await permisosDe(CERRADO, JULIO)).toMatchObject({ verInternas: true, comentar: false, notaInterna: false })
    expect(await permisosDe(CERRADO, LUCIA)).toMatchObject({ verInternas: true, comentar: false, notaInterna: false })
    expect(await permisosDe(CERRADO, CAMILA)).toMatchObject({ verInternas: false, comentar: false, notaInterna: false })
  })

  it('ofrece los cambios de estado solo al técnico que tiene asignado el ticket', async () => {
    expect((await permisosDe(EN_ATENCION, JULIO)).transiciones).toEqual(['en_espera', 'resuelto'])
    expect((await permisosDe(EN_ESPERA, JULIO)).transiciones).toEqual(['en_atencion', 'resuelto'])
    expect((await permisosDe(RESUELTO, JULIO)).transiciones).toEqual(['en_atencion'])
    expect((await permisosDe(CERRADO, JULIO)).transiciones).toEqual([])
    expect((await permisosDe(DE_SANDRA, JULIO)).transiciones).toEqual([])
    expect((await permisosDe(SIN_ASIGNAR, JULIO)).transiciones).toEqual([])
    expect((await permisosDe(EN_ATENCION, LUCIA)).transiciones).toEqual([])
  })

  it('encuentra el ticket aunque el código llegue en minúsculas o con espacios', async () => {
    const { ticket } = await obtenerAtencion(' tck-2026-00144 ', JULIO)

    expect(ticket.id).toBe('tck-00144')
  })

  it('nunca expone el correo ni la contraseña de las personas', async () => {
    const respuesta = JSON.stringify(await obtenerAtencion(EN_ATENCION, LUCIA))

    expect(respuesta).not.toContain('ulima.edu.pe')
    expect(respuesta).not.toContain('password')
  })

  it('rechaza a quien no es del equipo ni reportó el ticket', async () => {
    expect(await fallo(obtenerAtencion(EN_ATENCION, RENZO))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('exige una cuenta activa', async () => {
    expect(await fallo(obtenerAtencion(EN_ATENCION, 'usr-999'))).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
    expect(await fallo(obtenerAtencion(EN_ATENCION, undefined))).toMatchObject({ status: 401 })
    expect(await fallo(obtenerAtencion(EN_ATENCION, BLOQUEADO))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('responde 404 si el código no es de ningún ticket', async () => {
    expect(await fallo(obtenerAtencion('TCK-2026-99999', JULIO))).toMatchObject({ status: 404, code: 'TICKET_NOT_FOUND' })
    expect(await fallo(obtenerAtencion(undefined, JULIO))).toMatchObject({ status: 404, code: 'TICKET_NOT_FOUND' })
  })
})

describe('atencion.service · agregarEntrada', () => {
  it('el técnico asignado publica un comentario y recibe la atención actualizada', async () => {
    const { bitacora } = await agregarEntrada(
      EN_ATENCION,
      { tipo: 'publico', mensaje: '  Ya llegó energía al gabinete.  ' },
      JULIO,
    )

    expect(bitacora).toHaveLength(5)
    expect(bitacora.at(-1)).toEqual({
      id: 'bit-045',
      tipo: 'publico',
      mensaje: 'Ya llegó energía al gabinete.',
      creadoEn: AHORA,
      autor: { id: JULIO, nombres: 'Julio César', apellidos: 'Paredes Soto', rol: 'tecnico' },
    })
    expect(bitacoraRepository.findById('bit-045')).toEqual({
      id: 'bit-045',
      ticketId: 'tck-00144',
      autorId: JULIO,
      tipo: 'publico',
      mensaje: 'Ya llegó energía al gabinete.',
      creadoEn: AHORA,
    })
  })

  it('una nota interna la lee el equipo pero no quien reportó el ticket', async () => {
    await agregarEntrada(EN_ATENCION, { tipo: 'interno', mensaje: 'Pedí un tomacorriente al almacén.' }, JULIO)

    const equipo = await obtenerAtencion(EN_ATENCION, LUCIA)
    const solicitante = await obtenerAtencion(EN_ATENCION, CAMILA)
    expect(equipo.bitacora.at(-1)).toMatchObject({ tipo: 'interno', mensaje: 'Pedí un tomacorriente al almacén.' })
    expect(solicitante.bitacora).toHaveLength(3)
  })

  it('conserva los saltos de línea del mensaje', async () => {
    const { bitacora } = await agregarEntrada(EN_ATENCION, { tipo: 'publico', mensaje: 'Paso 1.\nPaso 2.' }, JULIO)

    expect(bitacora.at(-1).mensaje).toBe('Paso 1.\nPaso 2.')
  })

  it('el supervisor escribe en cualquier ticket que no esté cerrado', async () => {
    const { bitacora } = await agregarEntrada(SIN_ASIGNAR, { tipo: 'interno', mensaje: 'Lo asigno a primera hora.' }, LUCIA)

    expect(bitacora.at(-1)).toMatchObject({ tipo: 'interno', autor: { id: LUCIA, rol: 'supervisor' } })
  })

  it('quien reportó el ticket agrega comentarios públicos, pero no notas internas', async () => {
    const { bitacora } = await agregarEntrada(EN_ATENCION, { tipo: 'publico', mensaje: 'La práctica pasó al aula H-105.' }, CAMILA)
    expect(bitacora.at(-1)).toMatchObject({ tipo: 'publico', autor: { id: CAMILA, rol: 'usuario' } })

    const interna = await fallo(agregarEntrada(EN_ATENCION, { tipo: 'interno', mensaje: 'Nota.' }, CAMILA))
    expect(interna).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(bitacoraRepository.findAll()).toHaveLength(45)
  })

  it('un técnico no escribe en un ticket que no tiene asignado', async () => {
    const ajeno = await fallo(agregarEntrada(DE_SANDRA, { tipo: 'publico', mensaje: 'Puedo ayudar.' }, JULIO))
    const enCola = await fallo(agregarEntrada(SIN_ASIGNAR, { tipo: 'interno', mensaje: 'Lo reviso.' }, JULIO))

    expect(ajeno).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(enCola).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(bitacoraRepository.findAll()).toHaveLength(44)
  })

  it('un ticket cerrado responde 409 y no guarda nada', async () => {
    const error = await fallo(agregarEntrada(CERRADO, { tipo: 'publico', mensaje: 'Sigue fallando.' }, JULIO))

    expect(error).toMatchObject({ status: 409, code: 'TICKET_CLOSED' })
    expect(bitacoraRepository.findAll()).toHaveLength(44)
  })

  it('vuelve a validar el tipo y el mensaje antes de guardar', async () => {
    const vacio = await fallo(agregarEntrada(EN_ATENCION, { tipo: 'publico', mensaje: '   ' }, JULIO))
    const largo = await fallo(agregarEntrada(EN_ATENCION, { tipo: 'interno', mensaje: 'a'.repeat(601) }, JULIO))
    const sinTipo = await fallo(agregarEntrada(EN_ATENCION, { tipo: 'privado', mensaje: 'Hola.' }, JULIO))
    const sinDatos = await fallo(agregarEntrada(EN_ATENCION, undefined, JULIO))

    expect(vacio).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(vacio.fieldErrors).toEqual({ mensaje: ATENCION_MESSAGES.mensajeRequired })
    expect(largo.fieldErrors).toEqual({ mensaje: ATENCION_MESSAGES.mensajeMax })
    expect(sinTipo.fieldErrors).toEqual({ tipo: ATENCION_MESSAGES.tipoRequired })
    expect(sinDatos.fieldErrors).toEqual({
      tipo: ATENCION_MESSAGES.tipoRequired,
      mensaje: ATENCION_MESSAGES.mensajeRequired,
    })
    expect(bitacoraRepository.findAll()).toHaveLength(44)
  })

  it('exige una cuenta activa y un ticket que exista', async () => {
    const datos = { tipo: 'publico', mensaje: 'Hola.' }

    expect(await fallo(agregarEntrada(EN_ATENCION, datos, 'usr-999'))).toMatchObject({ status: 401 })
    expect(await fallo(agregarEntrada(EN_ATENCION, datos, RENZO))).toMatchObject({ status: 403 })
    expect(await fallo(agregarEntrada('TCK-2026-99999', datos, JULIO))).toMatchObject({ status: 404 })
  })
})

describe('atencion.service · cambiarEstado', () => {
  it('pasa el ticket al nuevo estado y devuelve la atención actualizada', async () => {
    const { ticket, permisos } = await cambiarEstado(EN_ATENCION, { estado: 'resuelto' }, JULIO)

    expect(ticket).toMatchObject({ codigo: EN_ATENCION, estado: 'resuelto', cerradoEn: null })
    expect(permisos.transiciones).toEqual(['en_atencion'])
    expect(ticketsRepository.findById('tck-00144')).toMatchObject({ estado: 'resuelto', cerradoEn: null, asignadoA: JULIO })
  })

  it('deja el cambio en el historial con su autor y su momento', async () => {
    await cambiarEstado(EN_ATENCION, { estado: 'en_espera' }, JULIO)

    expect(historialDe('tck-00144')).toHaveLength(4)
    expect(historialDe('tck-00144').at(-1)).toEqual({
      id: 'his-067',
      ticketId: 'tck-00144',
      tipo: 'estado',
      estado: 'en_espera',
      asignadoA: null,
      autorId: JULIO,
      motivo: null,
      retornoEstimado: null,
      solucion: null,
      creadoEn: AHORA,
    })
  })

  it.each([
    [EN_ESPERA, 'tck-00143', 'en_atencion'],
    [EN_ESPERA, 'tck-00143', 'resuelto'],
    [RESUELTO, 'tck-00141', 'en_atencion'],
    [EN_ATENCION, 'tck-00144', 'en_espera'],
  ])('%s (%s) admite pasar a %s', async (codigo, ticketId, estado) => {
    await cambiarEstado(codigo, { estado }, JULIO)

    expect(estadoDe(ticketId)).toBe(estado)
  })

  it('un ticket abierto o reabierto pasa a en atención cuando su técnico lo toma', async () => {
    modificarTicket('tck-00147', { asignadoA: JULIO })
    await cambiarEstado(SIN_ASIGNAR, { estado: 'en_atencion' }, JULIO)
    expect(estadoDe('tck-00147')).toBe('en_atencion')

    modificarTicket('tck-00141', { estado: 'reabierto' })
    await cambiarEstado(RESUELTO, { estado: 'en_atencion' }, JULIO)
    expect(estadoDe('tck-00141')).toBe('en_atencion')
  })

  it('rechaza con 409 un cambio que el estado actual no admite, e indica los que sí', async () => {
    const aAbierto = await fallo(cambiarEstado(EN_ATENCION, { estado: 'abierto' }, JULIO))
    const aCerrado = await fallo(cambiarEstado(EN_ATENCION, { estado: 'cerrado' }, JULIO))
    const alMismo = await fallo(cambiarEstado(EN_ATENCION, { estado: 'en_atencion' }, JULIO))
    const desdeResuelto = await fallo(cambiarEstado(RESUELTO, { estado: 'en_espera' }, JULIO))

    expect(aAbierto).toMatchObject({
      status: 409,
      code: 'INVALID_TRANSITION',
      message: 'El ticket está en atención y no admite el cambio a «Abierto».',
      details: { estado: 'en_atencion', permitidas: ['en_espera', 'resuelto'] },
    })
    expect(aCerrado).toMatchObject({ status: 409, code: 'INVALID_TRANSITION' })
    expect(alMismo).toMatchObject({ status: 409, code: 'INVALID_TRANSITION' })
    expect(desdeResuelto.details).toEqual({ estado: 'resuelto', permitidas: ['en_atencion'] })
    expect(estadoDe('tck-00144')).toBe('en_atencion')
    expect(historialRepository.findAll()).toHaveLength(66)
  })

  it('un ticket cerrado no cambia de estado', async () => {
    const error = await fallo(cambiarEstado(CERRADO, { estado: 'en_atencion' }, JULIO))

    expect(error).toMatchObject({ status: 409, code: 'INVALID_TRANSITION', details: { estado: 'cerrado', permitidas: [] } })
    expect(ticketsRepository.findById('tck-00131')).toMatchObject({ estado: 'cerrado', cerradoEn: '2026-09-28T22:20:00.000Z' })
  })

  it('solo el técnico que tiene asignado el ticket cambia su estado', async () => {
    const cambio = { estado: 'resuelto' }

    expect(await fallo(cambiarEstado(EN_ATENCION, cambio, LUCIA))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(await fallo(cambiarEstado(EN_ATENCION, cambio, CAMILA))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(await fallo(cambiarEstado(DE_SANDRA, { estado: 'en_atencion' }, JULIO))).toMatchObject({ status: 403 })
    expect(await fallo(cambiarEstado(SIN_ASIGNAR, { estado: 'en_atencion' }, JULIO))).toMatchObject({ status: 403 })
    expect(estadoDe('tck-00144')).toBe('en_atencion')
    expect(historialRepository.findAll()).toHaveLength(66)
  })

  it('exige un estado que exista', async () => {
    const desconocido = await fallo(cambiarEstado(EN_ATENCION, { estado: 'archivado' }, JULIO))
    const sinDatos = await fallo(cambiarEstado(EN_ATENCION, undefined, JULIO))

    expect(desconocido).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(desconocido.fieldErrors).toEqual({ estado: ATENCION_MESSAGES.estadoRequired })
    expect(sinDatos.fieldErrors).toEqual({ estado: ATENCION_MESSAGES.estadoRequired })
  })

  it('exige una cuenta activa y un ticket que exista', async () => {
    const cambio = { estado: 'resuelto' }

    expect(await fallo(cambiarEstado(EN_ATENCION, cambio, 'usr-999'))).toMatchObject({ status: 401 })
    expect(await fallo(cambiarEstado(EN_ATENCION, cambio, RENZO))).toMatchObject({ status: 403 })
    expect(await fallo(cambiarEstado('TCK-2026-99999', cambio, JULIO))).toMatchObject({ status: 404 })
  })

  it('no toca la bitácora', async () => {
    await cambiarEstado(EN_ATENCION, { estado: 'en_espera' }, JULIO)

    expect(bitacoraRepository.findAll()).toHaveLength(44)
  })
})
