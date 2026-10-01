import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable, writeTable } from '../repositories/db.js'
import { invitacionesRepository } from '../repositories/invitaciones.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { verifyPassword } from '../utils/password.js'
import { aceptar, crear, listar, obtenerPorToken, rechazar, revocar } from './invitaciones.service.js'
import { ServiceError } from './ServiceError.js'

const AHORA = '2026-10-01T15:00:00.000Z'
const TECNICO = 'INV-TEC-2026-DEMO'
const SUPERVISOR = 'INV-SUP-2026-DEMO'
const VENCIDA = 'INV-TEC-2026-VENCIDA'
const USADA = 'INV-TEC-2026-USADA'
// La invitación de técnico del seed vence el 31/12/2026 a las 23:59:59, hora de Lima.
const VENCE_TECNICO = '2027-01-01T04:59:59.000Z'

const activacion = {
  telefono: '951 220 874',
  password: 'Rosa2026!',
  confirmacion: 'Rosa2026!',
  especialidades: ['cat-01', 'cat-03'],
}

const nuevaInvitacion = {
  nombres: ' Paola   Andrea ',
  apellidos: 'Quiroz Lazo',
  correo: ' PQuiroz@ULIMA.edu.pe ',
  rol: 'tecnico',
  telefono: '987 111 222',
}

const fallo = (promise) => promise.catch((error) => error)
const invitacion = (token) => invitacionesRepository.findByToken(token)

function cambiarInvitacion(token, cambios) {
  invitacionesRepository.update(invitacion(token).id, cambios)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('invitaciones.service · obtenerPorToken', () => {
  it('devuelve la invitación con su estado efectivo y el nombre de quien invitó', async () => {
    await expect(obtenerPorToken(TECNICO)).resolves.toEqual({
      id: 'inv-001',
      token: TECNICO,
      nombres: 'Rosa Elena',
      apellidos: 'Huamán Torres',
      correo: 'rhuaman@ulima.edu.pe',
      rol: 'tecnico',
      telefono: '951220874',
      invitadoPor: 'usr-003',
      estado: 'pendiente',
      venceEn: VENCE_TECNICO,
      creadaEn: '2026-09-29T15:00:00.000Z',
      respondidaEn: null,
      estadoEfectivo: 'pendiente',
      invitadoPorNombre: 'Lucía Mendoza Ríos',
    })
  })

  it('una invitación pendiente cuyo plazo pasó está vencida, sin cambiar lo guardado', async () => {
    await expect(obtenerPorToken(VENCIDA)).resolves.toMatchObject({ estado: 'pendiente', estadoEfectivo: 'vencida' })
    expect(invitacion(VENCIDA).estado).toBe('pendiente')
  })

  it('vence justo después de venceEn', async () => {
    vi.setSystemTime(VENCE_TECNICO)
    await expect(obtenerPorToken(TECNICO)).resolves.toMatchObject({ estadoEfectivo: 'pendiente' })

    vi.setSystemTime(Date.parse(VENCE_TECNICO) + 1)
    await expect(obtenerPorToken(TECNICO)).resolves.toMatchObject({ estadoEfectivo: 'vencida' })
  })

  it('una invitación respondida conserva su estado aunque su plazo haya pasado', async () => {
    await expect(obtenerPorToken(USADA)).resolves.toMatchObject({ estado: 'aceptada', estadoEfectivo: 'aceptada' })
  })

  it.each(['INV-NO-EXISTE', 'inv-tec-2026-demo', '', undefined])(
    'responde 404 INVITATION_NOT_FOUND con el token «%s»',
    async (token) => {
      const error = await fallo(obtenerPorToken(token))

      expect(error).toBeInstanceOf(ServiceError)
      expect(error).toMatchObject({ status: 404, code: 'INVITATION_NOT_FOUND', message: 'No encontramos esta invitación.' })
    },
  )
})

describe('invitaciones.service · aceptar', () => {
  it('crea la cuenta con los datos de la invitación y la marca como aceptada', async () => {
    const usuario = await aceptar(TECNICO, activacion)

    expect(usuario).toEqual({
      id: 'usr-011',
      nombres: 'Rosa Elena',
      apellidos: 'Huamán Torres',
      correo: 'rhuaman@ulima.edu.pe',
      telefono: '951220874',
      rol: 'tecnico',
      unidad: 'Dirección de Infraestructura y Servicios',
      vinculo: null,
      especialidades: ['cat-01', 'cat-03'],
      ambienteHabitualId: null,
      estado: 'activo',
      motivoBloqueo: null,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      aceptaTerminos: true,
      invitacionId: 'inv-001',
      creadoEn: AHORA,
      actualizadoEn: AHORA,
    })
    expect(usuariosRepository.findAll()).toHaveLength(11)
    expect(invitacion(TECNICO)).toMatchObject({ estado: 'aceptada', respondidaEn: AHORA })
  })

  it('guarda la contraseña con sal y hash, nunca en texto plano', async () => {
    await aceptar(TECNICO, activacion)

    const guardado = usuariosRepository.findByCorreo('rhuaman@ulima.edu.pe')
    await expect(verifyPassword('Rosa2026!', guardado.passwordSalt, guardado.passwordHash)).resolves.toBe(true)
    expect(JSON.stringify(guardado)).not.toContain('Rosa2026!')
    expect(guardado).not.toHaveProperty('confirmacion')
  })

  it('la invitación de supervisor crea un supervisor con el teléfono corregido y sin especialidades repetidas', async () => {
    const usuario = await aceptar(SUPERVISOR, {
      ...activacion,
      telefono: ' 912 345 678 ',
      especialidades: ['cat-03', 'cat-03', 'cat-04'],
    })

    expect(usuario).toMatchObject({
      nombres: 'Martín Alonso',
      apellidos: 'Cárdenas Vela',
      rol: 'supervisor',
      telefono: '912345678',
      especialidades: ['cat-03', 'cat-04'],
      invitacionId: 'inv-002',
    })
  })

  it('vuelve a validar los datos y responde 400 con el mensaje de cada campo', async () => {
    const error = await fallo(
      aceptar(TECNICO, { telefono: '851 220 874', password: 'rosa2026', confirmacion: 'Rosa2026', especialidades: [] }),
    )

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: {
        telefono: 'Ingresa un celular de 9 dígitos que empiece con 9.',
        password: 'Mínimo 8 caracteres, con una mayúscula y un número.',
        confirmacion: 'Las contraseñas no coinciden.',
        especialidades: 'Elige entre una y tres categorías.',
      },
    })
    expect(usuariosRepository.findAll()).toHaveLength(10)
    expect(invitacion(TECNICO).estado).toBe('pendiente')
  })

  it('responde 400 si faltan los datos', async () => {
    const error = await fallo(aceptar(TECNICO))

    expect(error.status).toBe(400)
    expect(Object.keys(error.fieldErrors)).toEqual(['telefono', 'password', 'confirmacion', 'especialidades'])
  })

  it('exige de una a tres categorías activas del catálogo', async () => {
    writeTable(
      'categorias',
      readTable('categorias').map((categoria) => (categoria.id === 'cat-06' ? { ...categoria, activa: false } : categoria)),
    )
    const rango = 'Elige entre una y tres categorías.'
    const noDisponible = 'Una de las categorías elegidas ya no está disponible. Actualiza la página y elige otra.'
    const casos = [
      [['cat-01', 'cat-02', 'cat-03', 'cat-04'], rango],
      ['cat-01', rango],
      [['cat-99'], noDisponible],
      [['cat-01', 'cat-06'], noDisponible],
    ]

    for (const [especialidades, mensaje] of casos) {
      const error = await fallo(aceptar(TECNICO, { ...activacion, especialidades }))
      expect(error).toMatchObject({ status: 400, fieldErrors: { especialidades: mensaje } })
    }
    expect(usuariosRepository.findAll()).toHaveLength(10)
  })

  it('responde 410 INVITATION_EXPIRED si la invitación venció', async () => {
    const error = await fallo(aceptar(VENCIDA, activacion))

    expect(error).toMatchObject({
      status: 410,
      code: 'INVITATION_EXPIRED',
      message: 'Esta invitación venció el 12/09/2026.',
      details: { venceEn: '2026-09-12T15:00:00.000Z' },
    })

    vi.setSystemTime(Date.parse(VENCE_TECNICO) + 1)
    await expect(aceptar(TECNICO, activacion)).rejects.toMatchObject({
      status: 410,
      message: 'Esta invitación venció el 31/12/2026.',
    })
    expect(usuariosRepository.findAll()).toHaveLength(10)
  })

  it.each([
    ['aceptada', 'Esta invitación ya fue aceptada.'],
    ['rechazada', 'Esta invitación fue rechazada.'],
    ['revocada', 'Esta invitación fue revocada por el supervisor.'],
  ])('responde 409 INVITATION_NOT_PENDING si la invitación está %s', async (estado, mensaje) => {
    cambiarInvitacion(TECNICO, { estado })

    const error = await fallo(aceptar(TECNICO, activacion))

    expect(error).toMatchObject({ status: 409, code: 'INVITATION_NOT_PENDING', message: mensaje, details: { estado } })
    expect(usuariosRepository.findAll()).toHaveLength(10)
  })

  it('una invitación ya usada responde 409 aunque su plazo también haya pasado', async () => {
    await expect(aceptar(USADA, activacion)).rejects.toMatchObject({ status: 409, details: { estado: 'aceptada' } })
  })

  it('responde 409 EMAIL_TAKEN si el correo ya tiene una cuenta', async () => {
    const usuarios = readTable('usuarios')
    writeTable('usuarios', [...usuarios, { ...usuarios[4], id: 'usr-099', correo: 'rhuaman@ulima.edu.pe' }])

    const error = await fallo(aceptar(TECNICO, activacion))

    expect(error).toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      fieldErrors: { correo: 'Ya existe una cuenta con este correo.' },
    })
    expect(invitacion(TECNICO).estado).toBe('pendiente')
  })

  it('si la invitación cambia mientras se cifra la contraseña, no crea la cuenta', async () => {
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    vi.spyOn(crypto.subtle, 'digest').mockImplementation((...args) => {
      cambiarInvitacion(TECNICO, { estado: 'revocada' })
      return digest(...args)
    })

    const error = await fallo(aceptar(TECNICO, activacion))

    expect(error).toMatchObject({ status: 409, code: 'INVITATION_NOT_PENDING' })
    expect(usuariosRepository.findAll()).toHaveLength(10)
  })

  it('responde 404 si el token no existe', async () => {
    await expect(aceptar('INV-NO-EXISTE', activacion)).rejects.toMatchObject({
      status: 404,
      code: 'INVITATION_NOT_FOUND',
    })
  })
})

describe('invitaciones.service · rechazar', () => {
  it('marca la invitación como rechazada y registra cuándo', async () => {
    const rechazada = await rechazar(TECNICO)

    expect(rechazada).toMatchObject({
      id: 'inv-001',
      estado: 'rechazada',
      estadoEfectivo: 'rechazada',
      respondidaEn: AHORA,
      invitadoPorNombre: 'Lucía Mendoza Ríos',
    })
    expect(invitacion(TECNICO)).toMatchObject({ estado: 'rechazada', respondidaEn: AHORA })
    await expect(aceptar(TECNICO, activacion)).rejects.toMatchObject({ status: 409 })
  })

  it('no rechaza una invitación vencida (410) ni una ya respondida (409)', async () => {
    await expect(rechazar(VENCIDA)).rejects.toMatchObject({ status: 410, code: 'INVITATION_EXPIRED' })
    await expect(rechazar(USADA)).rejects.toMatchObject({ status: 409, code: 'INVITATION_NOT_PENDING' })
    expect(invitacion(VENCIDA).estado).toBe('pendiente')
    expect(invitacion(USADA).estado).toBe('aceptada')
  })

  it('responde 404 si el token no existe', async () => {
    await expect(rechazar('INV-NO-EXISTE')).rejects.toMatchObject({ status: 404, code: 'INVITATION_NOT_FOUND' })
  })
})

describe('invitaciones.service · listar', () => {
  it('devuelve las invitaciones de la más reciente a la más antigua, con su estado efectivo', async () => {
    const invitaciones = await listar()

    expect(invitaciones.map(({ token, estadoEfectivo }) => [token, estadoEfectivo])).toEqual([
      [SUPERVISOR, 'pendiente'],
      [TECNICO, 'pendiente'],
      [VENCIDA, 'vencida'],
      [USADA, 'aceptada'],
    ])
    invitaciones.forEach((item) => expect(item.invitadoPorNombre).toBe('Lucía Mendoza Ríos'))
  })

  it('filtra por estado efectivo: las pendientes vencidas solo aparecen como vencidas', async () => {
    const tokens = async (estado) => (await listar({ estado })).map((item) => item.token)

    await expect(tokens('pendiente')).resolves.toEqual([SUPERVISOR, TECNICO])
    await expect(tokens('vencida')).resolves.toEqual([VENCIDA])
    await expect(tokens('aceptada')).resolves.toEqual([USADA])
    await expect(tokens('rechazada')).resolves.toEqual([])
  })

  it('responde 400 si el estado no existe', async () => {
    await expect(listar({ estado: 'archivada' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: { estado: 'Elige un estado de invitación válido.' },
    })
  })
})

describe('invitaciones.service · crear', () => {
  it('crea una invitación pendiente por 7 días, con un token aleatorio y los datos normalizados', async () => {
    const creada = await crear(nuevaInvitacion, 'usr-003')

    expect(creada).toEqual({
      id: 'inv-005',
      token: expect.stringMatching(/^INV-[0-9A-F]{24}$/),
      nombres: 'Paola Andrea',
      apellidos: 'Quiroz Lazo',
      correo: 'pquiroz@ulima.edu.pe',
      rol: 'tecnico',
      telefono: '987111222',
      invitadoPor: 'usr-003',
      estado: 'pendiente',
      venceEn: '2026-10-08T15:00:00.000Z',
      creadaEn: AHORA,
      respondidaEn: null,
      estadoEfectivo: 'pendiente',
      invitadoPorNombre: 'Lucía Mendoza Ríos',
    })
    expect(invitacionesRepository.findById('inv-005')).toMatchObject({ token: creada.token, estado: 'pendiente' })
  })

  it('genera un token distinto para cada invitación', async () => {
    const primera = await crear(nuevaInvitacion, 'usr-003')
    const segunda = await crear({ ...nuevaInvitacion, correo: 'otro.tecnico@ulima.edu.pe' }, 'usr-003')

    expect(segunda.token).not.toBe(primera.token)
  })

  it('el enlace creado permite activar la cuenta hasta que vence a los 7 días', async () => {
    const { token } = await crear({ ...nuevaInvitacion, rol: 'supervisor' }, 'usr-003')
    vi.setSystemTime('2026-10-08T15:00:00.001Z')
    await expect(obtenerPorToken(token)).resolves.toMatchObject({ estadoEfectivo: 'vencida' })

    vi.setSystemTime('2026-10-08T15:00:00.000Z')
    await expect(aceptar(token, activacion)).resolves.toMatchObject({
      rol: 'supervisor',
      correo: 'pquiroz@ulima.edu.pe',
      nombres: 'Paola Andrea',
    })
  })

  it('vuelve a validar los datos y responde 400 con el mensaje de cada campo', async () => {
    const error = await fallo(crear({ rol: 'usuario' }, 'usr-003'))

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: {
        nombres: 'Ingresa tus nombres.',
        apellidos: 'Ingresa tus apellidos.',
        correo: 'Ingresa tu correo institucional.',
        rol: 'Selecciona el rol: técnico o supervisor.',
        telefono: 'Ingresa un número de contacto.',
      },
    })
    expect(readTable('invitaciones')).toHaveLength(4)
  })

  it('responde 409 EMAIL_TAKEN si el correo ya tiene una cuenta', async () => {
    const error = await fallo(crear({ ...nuevaInvitacion, correo: 'JParedes@ulima.edu.pe' }, 'usr-003'))

    expect(error).toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      fieldErrors: { correo: 'Ya existe una cuenta con este correo.' },
    })
  })

  it('responde 409 INVITATION_PENDING si el correo ya tiene una invitación vigente', async () => {
    const error = await fallo(crear({ ...nuevaInvitacion, correo: 'RHuaman@ulima.edu.pe' }, 'usr-003'))

    expect(error).toMatchObject({
      status: 409,
      code: 'INVITATION_PENDING',
      fieldErrors: { correo: 'Ya hay una invitación pendiente para este correo.' },
    })
    expect(readTable('invitaciones')).toHaveLength(4)
  })

  it('permite volver a invitar un correo cuya invitación venció o fue rechazada', async () => {
    await rechazar(TECNICO)

    await expect(crear({ ...nuevaInvitacion, correo: 'hloayza@ulima.edu.pe' }, 'usr-003')).resolves.toMatchObject({
      id: 'inv-005',
    })
    await expect(crear({ ...nuevaInvitacion, correo: 'rhuaman@ulima.edu.pe' }, 'usr-003')).resolves.toMatchObject({
      id: 'inv-006',
    })
  })

  it.each([
    ['un técnico', 'usr-002'],
    ['un usuario que no existe', 'usr-999'],
    ['nadie', undefined],
  ])('responde 403 FORBIDDEN si quien invita es %s', async (_, invitadoPorId) => {
    const error = await fallo(crear(nuevaInvitacion, invitadoPorId))

    expect(error).toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Solo un supervisor puede enviar invitaciones.',
    })
    expect(readTable('invitaciones')).toHaveLength(4)
  })

  it('responde 403 si el supervisor está bloqueado', async () => {
    usuariosRepository.update('usr-003', { estado: 'bloqueado', motivoBloqueo: 'Prueba.' })

    await expect(crear(nuevaInvitacion, 'usr-003')).rejects.toMatchObject({ status: 403 })
  })
})

describe('invitaciones.service · revocar', () => {
  it('anula una invitación pendiente: el enlace deja de servir', async () => {
    const revocada = await revocar('inv-001')

    expect(revocada).toMatchObject({ id: 'inv-001', estado: 'revocada', estadoEfectivo: 'revocada', respondidaEn: null })
    expect(invitacion(TECNICO).estado).toBe('revocada')
    await expect(aceptar(TECNICO, activacion)).rejects.toMatchObject({ status: 409, details: { estado: 'revocada' } })
  })

  it('no revoca una invitación ya respondida (409) ni una vencida (410)', async () => {
    await expect(revocar('inv-004')).rejects.toMatchObject({ status: 409, code: 'INVITATION_NOT_PENDING' })
    await expect(revocar('inv-003')).rejects.toMatchObject({ status: 410, code: 'INVITATION_EXPIRED' })
  })

  it('responde 404 si la invitación no existe', async () => {
    await expect(revocar('inv-999')).rejects.toMatchObject({ status: 404, code: 'INVITATION_NOT_FOUND' })
  })
})
