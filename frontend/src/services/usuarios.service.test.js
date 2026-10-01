import { describe, expect, it } from 'vitest'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { verifyPassword } from '../utils/password.js'
import { ServiceError } from './ServiceError.js'
import { correoDisponible, obtenerPorId, registrar, sanitizeUsuario } from './usuarios.service.js'

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
