import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bitacoraRepository, historialRepository } from '../repositories/atencion.repository.js'
import { readTable, writeTable } from '../repositories/db.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { ATENCION_MESSAGES } from '../utils/atencionValidators.js'
import { HORA_MS, MINUTO_MS } from '../utils/duracion.js'
import { agregarEntrada, cambiarEstado, cerrarTicket, obtenerAtencion, obtenerHistorial } from './atencion.service.js'
import { obtenerContadores } from './resumen.service.js'

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

/** Motivo y fecha estimada de retorno válidos para dejar un ticket en espera. */
const ESPERA = { motivo: 'Tomacorriente solicitado al almacén.', retornoEstimado: '2026-10-05' }

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

  it('un ticket en espera trae su motivo, desde cuándo espera y la fecha estimada de retorno', async () => {
    const { espera } = await obtenerAtencion(EN_ESPERA, JULIO)

    expect(espera).toEqual({
      motivo: 'Se solicitó al proveedor un filtro de línea para el amplificador.',
      retornoEstimado: '2026-10-06T04:59:59.000Z',
      desde: '2026-09-30T14:30:00.000Z',
      retornoVencido: false,
    })
    expect((await obtenerAtencion(EN_ATENCION, JULIO)).espera).toBeNull()
    expect((await obtenerAtencion(CERRADO, JULIO)).espera).toBeNull()
  })

  it('señala la espera cuya fecha estimada de retorno ya pasó', async () => {
    vi.setSystemTime('2026-10-06T05:00:00.000Z')

    expect((await obtenerAtencion(EN_ESPERA, JULIO)).espera.retornoVencido).toBe(true)
  })

  it('quien reportó el ticket también conoce el motivo de la espera', async () => {
    const { espera } = await obtenerAtencion(DE_SANDRA, CAMILA)

    expect(espera).toMatchObject({
      motivo: 'La bandeja de condensado está rota; se pidió el repuesto al proveedor.',
      retornoEstimado: '2026-10-03T04:59:59.000Z',
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
    expect(permisos).toEqual({ verInternas: false, comentar: true, notaInterna: false, transiciones: [], cerrar: false })
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
    await cambiarEstado(EN_ATENCION, { estado: 'resuelto' }, JULIO)

    expect(historialDe('tck-00144')).toHaveLength(4)
    expect(historialDe('tck-00144').at(-1)).toEqual({
      id: 'his-067',
      ticketId: 'tck-00144',
      tipo: 'estado',
      estado: 'resuelto',
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
    await cambiarEstado(codigo, { estado, ...ESPERA }, JULIO)

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
    await cambiarEstado(EN_ATENCION, { estado: 'en_espera', ...ESPERA }, JULIO)

    expect(bitacoraRepository.findAll()).toHaveLength(44)
  })
})

describe('atencion.service · cambiarEstado a en espera', () => {
  it('guarda el motivo y la fecha estimada de retorno como el fin de ese día en Lima', async () => {
    const { ticket, espera } = await cambiarEstado(
      EN_ATENCION,
      { estado: 'en_espera', motivo: '  Tomacorriente solicitado al almacén.  ', retornoEstimado: '2026-10-05' },
      JULIO,
    )

    expect(ticket.estado).toBe('en_espera')
    expect(espera).toEqual({
      motivo: 'Tomacorriente solicitado al almacén.',
      retornoEstimado: '2026-10-06T04:59:59.000Z',
      desde: AHORA,
      retornoVencido: false,
    })
    expect(historialDe('tck-00144').at(-1)).toMatchObject({
      estado: 'en_espera',
      motivo: 'Tomacorriente solicitado al almacén.',
      retornoEstimado: '2026-10-06T04:59:59.000Z',
      solucion: null,
      autorId: JULIO,
      creadoEn: AHORA,
    })
  })

  it('admite el retorno para hoy mismo', async () => {
    const { espera } = await cambiarEstado(EN_ATENCION, { estado: 'en_espera', ...ESPERA, retornoEstimado: '2026-10-01' }, JULIO)

    expect(espera.retornoEstimado).toBe('2026-10-02T04:59:59.000Z')
  })

  it('sin motivo o sin una fecha válida de hoy en adelante responde 400 y no cambia el estado', async () => {
    const vacio = await fallo(cambiarEstado(EN_ATENCION, { estado: 'en_espera' }, JULIO))
    const pasado = await fallo(cambiarEstado(EN_ATENCION, { estado: 'en_espera', ...ESPERA, retornoEstimado: '2026-09-30' }, JULIO))
    const invalida = await fallo(cambiarEstado(EN_ATENCION, { estado: 'en_espera', ...ESPERA, retornoEstimado: 'mañana' }, JULIO))
    const largo = await fallo(cambiarEstado(EN_ATENCION, { estado: 'en_espera', ...ESPERA, motivo: 'a'.repeat(241) }, JULIO))

    expect(vacio).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(vacio.fieldErrors).toEqual({
      motivo: ATENCION_MESSAGES.motivoRequired,
      retornoEstimado: ATENCION_MESSAGES.retornoRequired,
    })
    expect(pasado.fieldErrors).toEqual({ retornoEstimado: ATENCION_MESSAGES.retornoPasado })
    expect(invalida.fieldErrors).toEqual({ retornoEstimado: ATENCION_MESSAGES.retornoInvalido })
    expect(largo.fieldErrors).toEqual({ motivo: ATENCION_MESSAGES.motivoMax })
    expect(estadoDe('tck-00144')).toBe('en_atencion')
    expect(historialRepository.findAll()).toHaveLength(66)
  })

  it('en cualquier otro estado ignora el motivo y la fecha', async () => {
    const { espera } = await cambiarEstado(EN_ATENCION, { estado: 'resuelto', ...ESPERA }, JULIO)

    expect(espera).toBeNull()
    expect(historialDe('tck-00144').at(-1)).toMatchObject({ estado: 'resuelto', motivo: null, retornoEstimado: null })
  })

  it('al retomar la atención la espera termina, pero su motivo sigue en el historial', async () => {
    const { ticket, espera } = await cambiarEstado(EN_ESPERA, { estado: 'en_atencion' }, JULIO)

    expect(ticket.estado).toBe('en_atencion')
    expect(espera).toBeNull()
    expect(historialDe('tck-00143').map(({ estado, motivo }) => [estado, motivo])).toEqual([
      ['abierto', null],
      [null, null],
      ['en_atencion', null],
      ['en_espera', 'Se solicitó al proveedor un filtro de línea para el amplificador.'],
      ['en_atencion', null],
    ])
  })

  it('una nueva espera reemplaza a la anterior como la espera en curso', async () => {
    await cambiarEstado(EN_ESPERA, { estado: 'en_atencion' }, JULIO)
    vi.setSystemTime('2026-10-02T15:00:00.000Z')
    const { espera } = await cambiarEstado(EN_ESPERA, { estado: 'en_espera', motivo: 'El filtro llegó fallado.', retornoEstimado: '2026-10-09' }, JULIO)

    expect(espera).toMatchObject({ motivo: 'El filtro llegó fallado.', desde: '2026-10-02T15:00:00.000Z' })
  })
})

describe('atencion.service · tiempos y desenlace', () => {
  it('el tiempo total de un ticket en curso llega hasta ahora y se compara con el esperado de su categoría', async () => {
    const { tiempos, desenlace } = await obtenerAtencion(EN_ATENCION, JULIO)

    expect(tiempos).toEqual({
      totalMs: 42 * HORA_MS + 20 * MINUTO_MS,
      enEsperaMs: 0,
      atencionMs: 42 * HORA_MS + 20 * MINUTO_MS,
      esperadoHoras: 2,
      dentroDelPlazo: false,
    })
    expect(desenlace).toBeNull()
  })

  it('la espera, también la que sigue en curso, no cuenta para el tiempo esperado', async () => {
    const { tiempos } = await obtenerAtencion(EN_ESPERA, JULIO)

    expect(tiempos).toEqual({
      totalMs: 46 * HORA_MS + 40 * MINUTO_MS,
      enEsperaMs: 24 * HORA_MS + 30 * MINUTO_MS,
      atencionMs: 22 * HORA_MS + 10 * MINUTO_MS,
      esperadoHoras: 4,
      dentroDelPlazo: false,
    })
  })

  it('los tiempos de un ticket cerrado van del registro al cierre y ya no cambian', async () => {
    const fueraDePlazo = await obtenerAtencion('TCK-2026-00130', JULIO)
    const dentroDePlazo = await obtenerAtencion('TCK-2026-00118', JULIO)

    expect(fueraDePlazo.tiempos).toEqual({
      totalMs: 30 * HORA_MS + 12 * MINUTO_MS,
      enEsperaMs: 18 * HORA_MS + 30 * MINUTO_MS,
      atencionMs: 11 * HORA_MS + 42 * MINUTO_MS,
      esperadoHoras: 8,
      dentroDelPlazo: false,
    })
    expect(dentroDePlazo.tiempos).toMatchObject({
      totalMs: 25 * HORA_MS + 35 * MINUTO_MS,
      atencionMs: 2 * HORA_MS + 5 * MINUTO_MS,
      esperadoHoras: 4,
      dentroDelPlazo: true,
    })
  })

  it('usa el tiempo esperado de la subcategoría cuando el ticket la tiene', async () => {
    // «Proyector no enciende» (sub-01) espera 2 h; su categoría, Audiovisuales, 4 h.
    modificarTicket('tck-00118', { subcategoriaId: 'sub-01' })

    const { tiempos } = await obtenerAtencion('TCK-2026-00118', JULIO)

    expect(tiempos).toMatchObject({ esperadoHoras: 2, dentroDelPlazo: false })
  })

  it('un ticket cerrado trae su desenlace: la solución, cuándo se cerró y quién lo cerró', async () => {
    const { desenlace } = await obtenerAtencion(CERRADO, CAMILA)

    expect(desenlace).toEqual({
      solucion: 'El proveedor reemplazó el receptor inalámbrico. Se sincronizaron los dos micrófonos en una frecuencia libre.',
      cerradoEn: '2026-09-28T22:20:00.000Z',
      cerradoPor: { id: JULIO, nombres: 'Julio César', apellidos: 'Paredes Soto', rol: 'tecnico' },
    })
  })

  it('ofrece cerrar solo al técnico asignado, con el ticket en atención o resuelto', async () => {
    expect((await permisosDe(EN_ATENCION, JULIO)).cerrar).toBe(true)
    expect((await permisosDe(RESUELTO, JULIO)).cerrar).toBe(true)
    expect((await permisosDe(EN_ESPERA, JULIO)).cerrar).toBe(false)
    expect((await permisosDe(CERRADO, JULIO)).cerrar).toBe(false)
    expect((await permisosDe(DE_SANDRA, JULIO)).cerrar).toBe(false)
    expect((await permisosDe(EN_ATENCION, LUCIA)).cerrar).toBe(false)
    expect((await permisosDe(EN_ATENCION, CAMILA)).cerrar).toBe(false)
  })
})

describe('atencion.service · cerrarTicket', () => {
  const SOLUCION = 'Se reemplazó el tomacorriente del rack y se verificó el enlace del laboratorio.'

  it('cierra un ticket en atención con su solución y su fecha de cierre', async () => {
    const { ticket, desenlace, tiempos, permisos } = await cerrarTicket(EN_ATENCION, { solucion: `  ${SOLUCION}  ` }, JULIO)

    expect(ticket).toMatchObject({ codigo: EN_ATENCION, estado: 'cerrado', cerradoEn: AHORA })
    expect(desenlace).toEqual({
      solucion: SOLUCION,
      cerradoEn: AHORA,
      cerradoPor: { id: JULIO, nombres: 'Julio César', apellidos: 'Paredes Soto', rol: 'tecnico' },
    })
    expect(tiempos).toMatchObject({ totalMs: 42 * HORA_MS + 20 * MINUTO_MS, esperadoHoras: 2, dentroDelPlazo: false })
    expect(permisos).toEqual({ verInternas: true, comentar: false, notaInterna: false, transiciones: [], cerrar: false })
    expect(ticketsRepository.findById('tck-00144')).toMatchObject({ estado: 'cerrado', cerradoEn: AHORA, asignadoA: JULIO })
  })

  it('deja el cierre en el historial con la solución, su autor y su momento', async () => {
    await cerrarTicket(EN_ATENCION, { solucion: SOLUCION }, JULIO)

    expect(historialDe('tck-00144').at(-1)).toEqual({
      id: 'his-067',
      ticketId: 'tck-00144',
      tipo: 'estado',
      estado: 'cerrado',
      asignadoA: null,
      autorId: JULIO,
      motivo: null,
      retornoEstimado: null,
      solucion: SOLUCION,
      creadoEn: AHORA,
    })
  })

  it('también cierra un ticket ya resuelto, y el tiempo total deja de avanzar', async () => {
    const { ticket, tiempos } = await cerrarTicket(RESUELTO, { solucion: SOLUCION }, JULIO)
    vi.setSystemTime('2026-10-09T15:00:00.000Z')
    const despues = await obtenerAtencion(RESUELTO, JULIO)

    expect(ticket.estado).toBe('cerrado')
    expect(tiempos.totalMs).toBe(97 * HORA_MS)
    expect(despues.tiempos).toEqual(tiempos)
  })

  it('al cerrarlo, quien lo reportó tiene un ticket abierto menos y una encuesta pendiente más (HU-6)', async () => {
    const camila = { id: CAMILA, rol: 'usuario' }
    const antes = await obtenerContadores(camila)

    await cerrarTicket(EN_ATENCION, { solucion: SOLUCION }, JULIO)

    expect(antes).toMatchObject({ ticketsAbiertos: 3, encuestasPendientes: 1 })
    expect(await obtenerContadores(camila)).toMatchObject({ ticketsAbiertos: 2, encuestasPendientes: 2 })
  })

  it('no cierra un ticket en espera, en cola ni ya cerrado', async () => {
    modificarTicket('tck-00147', { asignadoA: JULIO })
    const enEspera = await fallo(cerrarTicket(EN_ESPERA, { solucion: SOLUCION }, JULIO))
    const abierto = await fallo(cerrarTicket(SIN_ASIGNAR, { solucion: SOLUCION }, JULIO))
    const cerrado = await fallo(cerrarTicket(CERRADO, { solucion: SOLUCION }, JULIO))

    expect(enEspera).toMatchObject({
      status: 409,
      code: 'INVALID_TRANSITION',
      message: 'El ticket está en espera: solo se cierra un ticket en atención o resuelto.',
      details: { estado: 'en_espera', permitidas: ['en_atencion', 'resuelto'] },
    })
    expect(abierto).toMatchObject({ status: 409, code: 'INVALID_TRANSITION' })
    expect(cerrado).toMatchObject({ status: 409, code: 'INVALID_TRANSITION' })
    expect(estadoDe('tck-00143')).toBe('en_espera')
    expect(ticketsRepository.findById('tck-00131').cerradoEn).toBe('2026-09-28T22:20:00.000Z')
    expect(historialRepository.findAll()).toHaveLength(66)
  })

  it('solo el técnico que tiene asignado el ticket lo cierra', async () => {
    const datos = { solucion: SOLUCION }

    expect(await fallo(cerrarTicket(EN_ATENCION, datos, LUCIA))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(await fallo(cerrarTicket(EN_ATENCION, datos, CAMILA))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(await fallo(cerrarTicket(DE_SANDRA, datos, JULIO))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(estadoDe('tck-00144')).toBe('en_atencion')
  })

  it('exige la descripción de la solución', async () => {
    const vacia = await fallo(cerrarTicket(EN_ATENCION, { solucion: '  ' }, JULIO))
    const corta = await fallo(cerrarTicket(EN_ATENCION, { solucion: 'Listo.' }, JULIO))
    const larga = await fallo(cerrarTicket(EN_ATENCION, { solucion: 'a'.repeat(601) }, JULIO))
    const sinDatos = await fallo(cerrarTicket(EN_ATENCION, undefined, JULIO))

    expect(vacia).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(vacia.fieldErrors).toEqual({ solucion: ATENCION_MESSAGES.solucionRequired })
    expect(corta.fieldErrors).toEqual({ solucion: ATENCION_MESSAGES.solucionMin })
    expect(larga.fieldErrors).toEqual({ solucion: ATENCION_MESSAGES.solucionMax })
    expect(sinDatos.fieldErrors).toEqual({ solucion: ATENCION_MESSAGES.solucionRequired })
    expect(ticketsRepository.findById('tck-00144')).toMatchObject({ estado: 'en_atencion', cerradoEn: null })
  })

  it('exige una cuenta activa y un ticket que exista', async () => {
    const datos = { solucion: SOLUCION }

    expect(await fallo(cerrarTicket(EN_ATENCION, datos, 'usr-999'))).toMatchObject({ status: 401 })
    expect(await fallo(cerrarTicket(EN_ATENCION, datos, RENZO))).toMatchObject({ status: 403 })
    expect(await fallo(cerrarTicket('TCK-2026-99999', datos, JULIO))).toMatchObject({ status: 404 })
  })
})

describe('atencion.service · obtenerHistorial', () => {
  const IVAN = 'usr-009'

  it('devuelve cada cambio de estado y cada asignación con su autor, su momento y su duración', async () => {
    const { ticket, eventos } = await obtenerHistorial('TCK-2026-00130', LUCIA)

    expect(ticket).toMatchObject({ codigo: 'TCK-2026-00130', estado: 'cerrado', ambiente: { codigo: 'E-304' } })
    expect(eventos.map(({ id, tipo, estado, autor, duracionMs, enCurso }) => [id, tipo, estado, autor.id, duracionMs, enCurso])).toEqual([
      ['his-037', 'estado', 'abierto', CAMILA, 68 * MINUTO_MS, false],
      ['his-038', 'asignacion', null, LUCIA, null, false],
      ['his-039', 'estado', 'en_atencion', IVAN, 5 * HORA_MS + 48 * MINUTO_MS, false],
      ['his-040', 'estado', 'en_espera', IVAN, 18 * HORA_MS + 30 * MINUTO_MS, false],
      ['his-041', 'estado', 'resuelto', IVAN, 4 * HORA_MS + 46 * MINUTO_MS, false],
      ['his-042', 'estado', 'cerrado', IVAN, 0, false],
    ])
    expect(eventos[1]).toMatchObject({
      creadoEn: '2026-08-31T14:50:00.000Z',
      autor: { id: LUCIA, rol: 'supervisor' },
      asignadoA: { id: IVAN, apellidos: 'Zegarra Pinto', rol: 'tecnico' },
    })
    expect(eventos[3]).toMatchObject({
      motivo: 'Repuesto de canaleta: el almacén lo entrega al día siguiente.',
      retornoEstimado: '2026-09-02T04:59:59.000Z',
      asignadoA: null,
    })
    expect(eventos[5].solucion).toBe(
      'Se retiró la extensión dañada y se instaló una canaleta con dos tomacorrientes fijos junto al podio.',
    )
  })

  it('resume el tiempo por etapa y los tiempos de la atención', async () => {
    const { etapas, tiempos } = await obtenerHistorial('TCK-2026-00130', LUCIA)

    expect(etapas).toEqual([
      { estado: 'abierto', ms: 68 * MINUTO_MS },
      { estado: 'en_atencion', ms: 5 * HORA_MS + 48 * MINUTO_MS },
      { estado: 'en_espera', ms: 18 * HORA_MS + 30 * MINUTO_MS },
      { estado: 'resuelto', ms: 4 * HORA_MS + 46 * MINUTO_MS },
    ])
    expect(tiempos).toMatchObject({ totalMs: 30 * HORA_MS + 12 * MINUTO_MS, esperadoHoras: 8, dentroDelPlazo: false })
  })

  it('en un ticket en curso el estado actual dura hasta ahora', async () => {
    const { eventos, etapas } = await obtenerHistorial(EN_ATENCION, JULIO)

    expect(eventos.at(-1)).toMatchObject({ estado: 'en_atencion', duracionMs: 41 * HORA_MS + 50 * MINUTO_MS, enCurso: true })
    expect(etapas).toEqual([
      { estado: 'abierto', ms: 30 * MINUTO_MS },
      { estado: 'en_atencion', ms: 41 * HORA_MS + 50 * MINUTO_MS },
    ])
  })

  it('incluye los cambios recién hechos, también el cierre con su solución', async () => {
    await cambiarEstado(EN_ATENCION, { estado: 'resuelto' }, JULIO)
    vi.setSystemTime('2026-10-01T16:00:00.000Z')
    await cerrarTicket(EN_ATENCION, { solucion: 'Se reemplazó el tomacorriente del rack.' }, JULIO)

    const { eventos } = await obtenerHistorial(EN_ATENCION, LUCIA)

    expect(eventos.slice(-2).map(({ estado, creadoEn, autor, duracionMs, solucion }) => [estado, creadoEn, autor.id, duracionMs, solucion])).toEqual([
      ['resuelto', AHORA, JULIO, HORA_MS, null],
      ['cerrado', '2026-10-01T16:00:00.000Z', JULIO, 0, 'Se reemplazó el tomacorriente del rack.'],
    ])
  })

  it('lo consultan el equipo y quien reportó el ticket, sin exponer correos', async () => {
    const paraQuienReporto = await obtenerHistorial('TCK-2026-00130', CAMILA)

    expect(paraQuienReporto.eventos).toHaveLength(6)
    expect(JSON.stringify(paraQuienReporto)).not.toContain('ulima.edu.pe')
    expect((await obtenerHistorial('TCK-2026-00130', JULIO)).eventos).toHaveLength(6)
    expect(await fallo(obtenerHistorial('TCK-2026-00130', RENZO))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('exige una cuenta activa y un ticket que exista', async () => {
    expect(await fallo(obtenerHistorial(EN_ATENCION, 'usr-999'))).toMatchObject({ status: 401 })
    expect(await fallo(obtenerHistorial(EN_ATENCION, BLOQUEADO))).toMatchObject({ status: 403 })
    expect(await fallo(obtenerHistorial('TCK-2026-99999', JULIO))).toMatchObject({ status: 404, code: 'TICKET_NOT_FOUND' })
  })
})
