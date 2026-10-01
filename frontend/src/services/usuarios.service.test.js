import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable, writeTable } from '../repositories/db.js'
import { invitacionesRepository } from '../repositories/invitaciones.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { verifyPassword } from '../utils/password.js'
import { ServiceError } from './ServiceError.js'
import {
  actualizarPerfil,
  correoDisponible,
  obtenerPorId,
  obtenerResumenCuenta,
  registrar,
  sanitizeUsuario,
} from './usuarios.service.js'

const datosValidos = {
  nombres: 'Valeria Sofía',
  apellidos: 'Rojas Paredes',
  correo: 'valeria.rojas@aloe.ulima.edu.pe',
  telefono: '912345678',
  password: 'Campus2026',
  confirmacion: 'Campus2026',
  unidad: 'Arquitectura',
  vinculo: 'Estudiante',
  aceptaTerminos: true,
}

describe('usuarios.service · registrar', () => {
  it('crea la cuenta con rol usuario y devuelve el usuario sin credenciales', async () => {
    const usuario = await registrar(datosValidos)

    expect(usuario).toEqual({
      id: 'usr-011',
      nombres: 'Valeria Sofía',
      apellidos: 'Rojas Paredes',
      correo: 'valeria.rojas@aloe.ulima.edu.pe',
      telefono: '912345678',
      rol: 'usuario',
      unidad: 'Arquitectura',
      vinculo: 'Estudiante',
      especialidades: [],
      ambienteHabitualId: null,
      estado: 'activo',
      motivoBloqueo: null,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      aceptaTerminos: true,
      invitacionId: null,
      creadoEn: expect.any(String),
      actualizadoEn: expect.any(String),
    })
    expect(new Date(usuario.creadoEn).toISOString()).toBe(usuario.creadoEn)
    expect(usuario.actualizadoEn).toBe(usuario.creadoEn)
    expect(usuariosRepository.findAll()).toHaveLength(11)
  })

  it('guarda el hash con sal, nunca la contraseña en texto plano', async () => {
    await registrar(datosValidos)

    const guardado = usuariosRepository.findById('usr-011')
    expect(guardado.passwordSalt).toMatch(/^[0-9a-f]{32}$/)
    expect(guardado.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    await expect(verifyPassword('Campus2026', guardado.passwordSalt, guardado.passwordHash)).resolves.toBe(true)
    expect(JSON.stringify(guardado)).not.toContain('Campus2026')
    expect(guardado).not.toHaveProperty('password')
    expect(guardado).not.toHaveProperty('confirmacion')
  })

  it('normaliza el correo a minúsculas, el teléfono a 9 dígitos y los espacios de los nombres', async () => {
    const usuario = await registrar({
      ...datosValidos,
      nombres: '  Valeria   Sofía ',
      apellidos: 'Rojas  Paredes ',
      correo: '  Valeria.Rojas@ALOE.Ulima.edu.pe ',
      telefono: ' 912 345 678 ',
    })

    expect(usuario).toMatchObject({
      nombres: 'Valeria Sofía',
      apellidos: 'Rojas Paredes',
      correo: 'valeria.rojas@aloe.ulima.edu.pe',
      telefono: '912345678',
    })
    expect(usuariosRepository.findById(usuario.id)).toMatchObject({
      correo: 'valeria.rojas@aloe.ulima.edu.pe',
      telefono: '912345678',
    })
  })

  it('responde 409 EMAIL_TAKEN si el correo ya tiene cuenta, sin importar mayúsculas', async () => {
    const error = await registrar({ ...datosValidos, correo: 'Camila.Quispe@ALOE.ulima.edu.pe' }).catch(
      (reason) => reason,
    )

    expect(error).toBeInstanceOf(ServiceError)
    expect(error).toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      message: 'Ya existe una cuenta con este correo.',
      fieldErrors: { correo: 'Ya existe una cuenta con este correo.' },
    })
    expect(usuariosRepository.findAll()).toHaveLength(10)
  })

  it('vuelve a validar los datos y responde 400 con el mensaje de cada campo', async () => {
    const invalidos = { ...datosValidos, nombres: 'Val3ria', telefono: '812345678', confirmacion: 'Campus2025' }

    const error = await registrar(invalidos).catch((reason) => reason)

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: {
        nombres: 'Usa solo letras y espacios.',
        telefono: 'Ingresa un celular de 9 dígitos que empiece con 9.',
        confirmacion: 'Las contraseñas no coinciden.',
      },
    })
    expect(usuariosRepository.findAll()).toHaveLength(10)
  })

  it('responde 400 si faltan datos o no se aceptaron los términos', async () => {
    const error = await registrar({}).catch((reason) => reason)

    expect(error.status).toBe(400)
    expect(Object.keys(error.fieldErrors)).toEqual([
      'nombres',
      'apellidos',
      'correo',
      'telefono',
      'password',
      'confirmacion',
      'unidad',
      'vinculo',
      'aceptaTerminos',
    ])
    await expect(registrar(null)).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('exige una unidad y un vínculo del catálogo', async () => {
    const error = await registrar({ ...datosValidos, unidad: 'Medicina', vinculo: 'Visitante' }).catch(
      (reason) => reason,
    )

    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({
      unidad: 'Selecciona tu unidad o carrera.',
      vinculo: 'Selecciona tu vínculo con la universidad.',
    })
  })
})

describe('usuarios.service · correoDisponible', () => {
  it('indica si el correo institucional está libre', async () => {
    await expect(correoDisponible('valeria.rojas@aloe.ulima.edu.pe')).resolves.toEqual({ disponible: true })
    await expect(correoDisponible(' LMendoza@ulima.edu.pe ')).resolves.toEqual({ disponible: false })
  })

  it('responde 400 si el correo no es institucional', async () => {
    const error = await correoDisponible('valeria@gmail.com').catch((reason) => reason)

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: { correo: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).' },
    })
  })
})

describe('usuarios.service · obtenerPorId', () => {
  it('devuelve el usuario sin hash ni sal', async () => {
    const camila = await obtenerPorId('usr-001')

    expect(camila).toMatchObject({ id: 'usr-001', nombres: 'Camila Alejandra', rol: 'usuario' })
    expect(camila).not.toHaveProperty('passwordHash')
    expect(camila).not.toHaveProperty('passwordSalt')
  })

  it('responde 404 USER_NOT_FOUND si no existe', async () => {
    const error = await obtenerPorId('usr-999').catch((reason) => reason)

    expect(error).toMatchObject({ status: 404, code: 'USER_NOT_FOUND' })
  })
})

describe('usuarios.service · actualizarPerfil', () => {
  const cambiosValidos = {
    nombres: 'Camila Sofía',
    apellidos: 'Quispe Rojas',
    telefono: '912 345 678',
    unidad: 'Arquitectura',
    ambienteHabitualId: 'amb-05',
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('guarda los datos personales normalizados y devuelve la cuenta sin credenciales', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime('2026-10-01T15:00:00.000Z')

    const usuario = await actualizarPerfil('usr-001', { ...cambiosValidos, nombres: '  Camila   Sofía ' })

    expect(usuario).toMatchObject({
      id: 'usr-001',
      nombres: 'Camila Sofía',
      apellidos: 'Quispe Rojas',
      telefono: '912345678',
      unidad: 'Arquitectura',
      ambienteHabitualId: 'amb-05',
      creadoEn: '2026-03-14T15:20:00.000Z',
      actualizadoEn: '2026-10-01T15:00:00.000Z',
    })
    expect(usuario).not.toHaveProperty('passwordHash')
    expect(usuario).not.toHaveProperty('passwordSalt')
    expect(usuariosRepository.findById('usr-001')).toMatchObject({
      nombres: 'Camila Sofía',
      telefono: '912345678',
      actualizadoEn: '2026-10-01T15:00:00.000Z',
    })
  })

  it('ignora los campos que no son editables: correo, rol, estado, contraseña…', async () => {
    const antes = usuariosRepository.findById('usr-001')

    const usuario = await actualizarPerfil('usr-001', {
      ...cambiosValidos,
      id: 'usr-999',
      correo: 'otra.cuenta@ulima.edu.pe',
      rol: 'supervisor',
      estado: 'bloqueado',
      vinculo: 'Docente',
      especialidades: ['cat-01'],
      password: 'Nueva2026',
      passwordHash: 'f'.repeat(64),
      passwordSalt: '0'.repeat(32),
    })

    const guardado = usuariosRepository.findById('usr-001')
    expect(usuario).toMatchObject({ id: 'usr-001', correo: 'camila.quispe@aloe.ulima.edu.pe', rol: 'usuario' })
    expect(guardado).toMatchObject({
      correo: antes.correo,
      rol: 'usuario',
      estado: 'activo',
      vinculo: 'Estudiante',
      especialidades: [],
      passwordHash: antes.passwordHash,
      passwordSalt: antes.passwordSalt,
    })
    expect(guardado).not.toHaveProperty('password')
    expect(usuariosRepository.findById('usr-999')).toBeNull()
  })

  it('los datos que no se envían conservan su valor; un ambiente null quita el ambiente habitual', async () => {
    const usuario = await actualizarPerfil('usr-001', { telefono: '912345678', ambienteHabitualId: null })

    expect(usuario).toMatchObject({
      nombres: 'Camila Alejandra',
      apellidos: 'Quispe Ramos',
      unidad: 'Ingeniería de Sistemas',
      telefono: '912345678',
      ambienteHabitualId: null,
    })
  })

  it('vuelve a validar y responde 400 con el mensaje de cada campo, sin guardar nada', async () => {
    const invalidos = { ...cambiosValidos, nombres: '', telefono: '812 345 678' }

    const error = await actualizarPerfil('usr-001', invalidos).catch((reason) => reason)

    expect(error).toBeInstanceOf(ServiceError)
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: {
        nombres: 'Ingresa tus nombres.',
        telefono: 'Ingresa un celular de 9 dígitos que empiece con 9.',
      },
    })
    expect(usuariosRepository.findById('usr-001')).toMatchObject({ apellidos: 'Quispe Ramos', telefono: '987654321' })
  })

  it('exige una unidad del catálogo y un ambiente que exista', async () => {
    const error = await actualizarPerfil('usr-001', { unidad: 'Medicina', ambienteHabitualId: 'amb-99' }).catch(
      (reason) => reason,
    )

    expect(error).toMatchObject({
      status: 400,
      fieldErrors: {
        unidad: 'Selecciona tu unidad o carrera.',
        ambienteHabitualId: 'Selecciona un ambiente de la lista.',
      },
    })
    expect(usuariosRepository.findById('usr-001').ambienteHabitualId).toBe('amb-01')
  })

  it('responde 404 USER_NOT_FOUND si la cuenta no existe', async () => {
    await expect(actualizarPerfil('usr-999', cambiosValidos)).rejects.toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    })
  })
})

describe('usuarios.service · obtenerResumenCuenta', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime('2026-10-01T15:00:00.000Z')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function cerrarTicket(id, cerradoEn) {
    writeTable(
      'tickets',
      readTable('tickets').map((ticket) => (ticket.id === id ? { ...ticket, estado: 'cerrado', cerradoEn } : ticket)),
    )
  }

  it('usuario: tickets reportados, abiertos ahora, fecha de creación y su encuesta pendiente (Camila)', async () => {
    await expect(obtenerResumenCuenta('usr-001')).resolves.toEqual({
      ticketsReportados: 12,
      abiertosAhora: 3,
      cuentaCreada: '2026-03-14T15:20:00.000Z',
      encuestaPendiente: {
        ticketCodigo: 'TCK-2026-00131',
        cerradoEn: '2026-09-28T22:20:00.000Z',
        fechaLimite: '2026-10-05T22:20:00.000Z',
      },
    })
  })

  it('usuario: con varias encuestas pendientes muestra la que vence primero', async () => {
    cerrarTicket('tck-00141', '2026-09-27T18:00:00.000Z')

    const { encuestaPendiente } = await obtenerResumenCuenta('usr-001')

    expect(encuestaPendiente).toEqual({
      ticketCodigo: 'TCK-2026-00141',
      cerradoEn: '2026-09-27T18:00:00.000Z',
      fechaLimite: '2026-10-04T18:00:00.000Z',
    })
  })

  it('usuario: sin encuesta pendiente si ya la respondió o si venció su plazo', async () => {
    vi.setSystemTime('2026-10-05T22:20:00.001Z')
    await expect(obtenerResumenCuenta('usr-001')).resolves.toMatchObject({ encuestaPendiente: null })

    vi.setSystemTime('2026-10-01T15:00:00.000Z')
    writeTable('encuestas', [
      ...readTable('encuestas'),
      { id: 'enc-008', ticketId: 'tck-00131', usuarioId: 'usr-001', puntaje: 4, respondidaEn: '2026-09-30T15:00:00.000Z' },
    ])
    await expect(obtenerResumenCuenta('usr-001')).resolves.toMatchObject({ encuestaPendiente: null })
  })

  it('técnico: tickets asignados y los que están en atención (Julio)', async () => {
    await expect(obtenerResumenCuenta('usr-002')).resolves.toEqual({
      ticketsAsignados: 8,
      enAtencion: 1,
      cuentaCreada: '2026-03-02T14:15:00.000Z',
    })
  })

  it('supervisor: invitaciones que envió y siguen vigentes (Lucía)', async () => {
    await expect(obtenerResumenCuenta('usr-003')).resolves.toEqual({
      invitacionesPendientes: 2,
      cuentaCreada: '2026-01-12T13:30:00.000Z',
    })

    invitacionesRepository.update('inv-002', { invitadoPor: 'usr-099' })
    await expect(obtenerResumenCuenta('usr-003')).resolves.toMatchObject({ invitacionesPendientes: 1 })

    vi.setSystemTime('2027-01-02T00:00:00.000Z')
    await expect(obtenerResumenCuenta('usr-003')).resolves.toMatchObject({ invitacionesPendientes: 0 })
  })

  it('responde 404 USER_NOT_FOUND si la cuenta no existe', async () => {
    await expect(obtenerResumenCuenta('usr-999')).rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' })
  })
})

describe('sanitizeUsuario', () => {
  it('quita las credenciales sin modificar el original', () => {
    const usuario = usuariosRepository.findById('usr-002')

    const publico = sanitizeUsuario(usuario)

    expect(publico).not.toHaveProperty('passwordHash')
    expect(publico).not.toHaveProperty('passwordSalt')
    expect(publico).toMatchObject({ id: 'usr-002', correo: 'jparedes@ulima.edu.pe', especialidades: ['cat-01', 'cat-02'] })
    expect(usuario.passwordHash).toMatch(/^[0-9a-f]{64}$/)
  })
})
