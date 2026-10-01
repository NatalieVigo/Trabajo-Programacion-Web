import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY } from '../repositories/session.repository.js'
import { tokensRecuperacionRepository } from '../repositories/tokensRecuperacion.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { verifyPassword } from '../utils/password.js'
import {
  cambiarPassword,
  cerrarSesion,
  haySesionGuardada,
  iniciarSesion,
  obtenerSesion,
  restablecerPassword,
  solicitarRecuperacion,
  validarTokenRecuperacion,
} from './auth.service.js'
import { ServiceError } from './ServiceError.js'

const AHORA = '2026-10-01T15:27:00.000Z' // 10:27 en Lima
const BLOQUEADO_HASTA = '2026-10-01T15:42:00.000Z' // 10:42 en Lima, 15 minutos después
const ENLACE_VENCE = '2026-10-01T15:57:00.000Z' // 30 minutos después
const CAMILA = { correo: 'camila.quispe@aloe.ulima.edu.pe', password: 'Camila2026' }
const DIEGO = { correo: 'diego.salas@aloe.ulima.edu.pe', password: 'Usuario2026' }
const INCORRECTA = { ...CAMILA, password: 'Camila2025' }
const NUEVA = 'Campus2027'

const fallo = (promise) => promise.catch((error) => error)
const camila = () => usuariosRepository.findById('usr-001')
const sesionGuardada = (storage) => JSON.parse(storage.getItem(SESSION_STORAGE_KEY))
const tieneLaContrasena = (usuario, password) => verifyPassword(password, usuario.passwordSalt, usuario.passwordHash)

/** Pide un enlace de recuperación para el correo y devuelve su token, el que muestra la bandeja simulada. */
async function pedirEnlace(correo = CAMILA.correo) {
  const { tokenDemo } = await solicitarRecuperacion(correo)
  return tokenDemo
}

/** Intenta ingresar `veces` veces con esas credenciales y devuelve el último error. */
async function fallar(veces, credenciales = INCORRECTA) {
  let error
  for (let intento = 0; intento < veces; intento += 1) {
    error = await fallo(iniciarSesion(credenciales))
  }
  return error
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('auth.service · iniciarSesion', () => {
  it('con credenciales correctas devuelve el usuario sin credenciales y guarda la sesión en la pestaña', async () => {
    const { usuario } = await iniciarSesion(CAMILA)

    expect(usuario).toMatchObject({ id: 'usr-001', nombres: 'Camila Alejandra', rol: 'usuario', estado: 'activo' })
    expect(usuario).not.toHaveProperty('passwordHash')
    expect(usuario).not.toHaveProperty('passwordSalt')
    expect(sesionGuardada(sessionStorage)).toEqual({ usuarioId: 'usr-001', iniciadaEn: AHORA })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('con «Recordarme» guarda la sesión en este equipo', async () => {
    await iniciarSesion({ ...CAMILA, recordar: true })

    expect(sesionGuardada(localStorage)).toEqual({ usuarioId: 'usr-001', iniciadaEn: AHORA })
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('reconoce el correo con mayúsculas o espacios', async () => {
    const { usuario } = await iniciarSesion({ correo: ' JParedes@ULIMA.edu.pe ', password: 'Tecnico2026' })

    expect(usuario).toMatchObject({ id: 'usr-002', rol: 'tecnico' })
  })

  it('un ingreso correcto reinicia el contador de intentos fallidos', async () => {
    await fallar(3)
    expect(camila().intentosFallidos).toBe(3)

    await iniciarSesion(CAMILA)

    expect(camila()).toMatchObject({ intentosFallidos: 0, bloqueadoHasta: null })
  })

  it('con la contraseña incorrecta responde 401 con los intentos que quedan', async () => {
    const error = await fallo(iniciarSesion(INCORRECTA))

    expect(error).toBeInstanceOf(ServiceError)
    expect(error).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Correo o contraseña incorrectos. Te quedan 4 intentos antes del bloqueo temporal.',
      details: { intentosRestantes: 4 },
    })
    expect(camila().intentosFallidos).toBe(1)
    expect(haySesionGuardada()).toBe(false)
  })

  it('cada intento fallido descuenta uno y el cuarto avisa que queda el último', async () => {
    const errores = []
    for (let intento = 0; intento < 4; intento += 1) {
      errores.push(await fallar(1))
    }

    expect(errores.map((error) => error.details.intentosRestantes)).toEqual([4, 3, 2, 1])
    expect(errores[3].message).toBe('Correo o contraseña incorrectos. Te queda 1 intento antes del bloqueo temporal.')
  })

  it('el quinto intento fallido bloquea la cuenta 15 minutos: 423 con la hora de desbloqueo', async () => {
    await fallar(4)

    const error = await fallar(1)

    expect(error).toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED',
      message:
        'Cuenta bloqueada por 15 minutos tras cinco intentos fallidos. Podrás ingresar a las 10:42 o restablecer tu contraseña ahora.',
      details: { bloqueadoHasta: BLOQUEADO_HASTA },
    })
    expect(camila()).toMatchObject({ intentosFallidos: 5, bloqueadoHasta: BLOQUEADO_HASTA })
  })

  it('durante el bloqueo rechaza incluso la contraseña correcta, sin sumar intentos', async () => {
    await fallar(5)
    vi.setSystemTime('2026-10-01T15:41:59.999Z')

    await expect(iniciarSesion(CAMILA)).rejects.toMatchObject({
      status: 423,
      details: { bloqueadoHasta: BLOQUEADO_HASTA },
    })
    await expect(iniciarSesion(INCORRECTA)).rejects.toMatchObject({ status: 423 })
    expect(camila()).toMatchObject({ intentosFallidos: 5, bloqueadoHasta: BLOQUEADO_HASTA })
    expect(haySesionGuardada()).toBe(false)
  })

  it('pasados los 15 minutos permite ingresar y el contador vuelve a cero', async () => {
    await fallar(5)
    vi.setSystemTime(BLOQUEADO_HASTA)

    const { usuario } = await iniciarSesion(CAMILA)

    expect(usuario.id).toBe('usr-001')
    expect(camila()).toMatchObject({ intentosFallidos: 0, bloqueadoHasta: null })
  })

  it('pasado el bloqueo, un nuevo fallo vuelve a contar desde el primer intento', async () => {
    await fallar(5)
    vi.setSystemTime('2026-10-01T16:00:00.000Z')

    const error = await fallar(1)

    expect(error).toMatchObject({ status: 401, details: { intentosRestantes: 4 } })
    expect(camila()).toMatchObject({ intentosFallidos: 1, bloqueadoHasta: null })
  })

  it('una cuenta bloqueada por el supervisor responde 403 con el motivo', async () => {
    const error = await fallo(iniciarSesion(DIEGO))

    expect(error).toMatchObject({
      status: 403,
      code: 'ACCOUNT_BLOCKED',
      message: 'Tu cuenta está bloqueada: Reportes falsos reiterados. Comunícate con soporte.campus@ulima.edu.pe.',
      details: { motivo: 'Reportes falsos reiterados.' },
    })
    expect(haySesionGuardada()).toBe(false)
  })

  it('el bloqueo del supervisor solo se revela con la contraseña correcta', async () => {
    const error = await fallo(iniciarSesion({ ...DIEGO, password: 'Usuario2025' }))

    expect(error).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS', details: { intentosRestantes: 4 } })
  })

  it('arma el mensaje del bloqueo aunque el motivo no termine en punto o no exista', async () => {
    usuariosRepository.update('usr-004', { motivoBloqueo: 'Uso indebido del servicio' })
    await expect(iniciarSesion(DIEGO)).rejects.toMatchObject({
      message: 'Tu cuenta está bloqueada: Uso indebido del servicio. Comunícate con soporte.campus@ulima.edu.pe.',
    })

    usuariosRepository.update('usr-004', { motivoBloqueo: null })
    await expect(iniciarSesion(DIEGO)).rejects.toMatchObject({
      message: 'Tu cuenta está bloqueada. Comunícate con soporte.campus@ulima.edu.pe.',
      details: { motivo: null },
    })
  })

  it('un correo sin cuenta responde igual que una contraseña incorrecta, sin revelar que no existe', async () => {
    const deUnaCuenta = await fallo(iniciarSesion(INCORRECTA))
    const sinCuenta = await fallo(iniciarSesion({ correo: 'nadie.registrado@ulima.edu.pe', password: 'Camila2026' }))

    expect(sinCuenta).toBeInstanceOf(ServiceError)
    expect(sinCuenta).toMatchObject({
      status: deUnaCuenta.status,
      code: deUnaCuenta.code,
      message: deUnaCuenta.message,
      details: deUnaCuenta.details,
    })
    expect(usuariosRepository.findAll()).toHaveLength(10)
  })

  it('los intentos con un correo sin cuenta también se descuentan y bloquean 15 minutos', async () => {
    const sinCuenta = { correo: 'tampoco.existe@ulima.edu.pe', password: 'Clave2026' }
    const restantes = []
    for (let intento = 0; intento < 4; intento += 1) {
      restantes.push((await fallar(1, sinCuenta)).details.intentosRestantes)
    }

    expect(restantes).toEqual([4, 3, 2, 1])
    await expect(iniciarSesion(sinCuenta)).rejects.toMatchObject({
      status: 423,
      details: { bloqueadoHasta: BLOQUEADO_HASTA },
    })
    await expect(iniciarSesion({ ...sinCuenta, correo: ' Tampoco.Existe@ulima.edu.pe' })).rejects.toMatchObject({
      status: 423,
    })

    vi.setSystemTime(BLOQUEADO_HASTA)
    await expect(iniciarSesion(sinCuenta)).rejects.toMatchObject({ status: 401, details: { intentosRestantes: 4 } })
  })

  it('tras recargar la aplicación, un correo sin cuenta sigue bloqueado igual que una cuenta registrada', async () => {
    const sinCuenta = { correo: 'nadie.registrado@ulima.edu.pe', password: 'Clave2026' }
    await fallar(5)
    await fallar(5, sinCuenta)

    vi.resetModules()
    const recargado = await import('./auth.service.js')

    const deUnaCuenta = await fallo(recargado.iniciarSesion(INCORRECTA))
    const deUnCorreoSinCuenta = await fallo(recargado.iniciarSesion(sinCuenta))
    expect(deUnaCuenta).toMatchObject({ status: 423, details: { bloqueadoHasta: BLOQUEADO_HASTA } })
    expect(deUnCorreoSinCuenta).toMatchObject({
      status: deUnaCuenta.status,
      code: deUnaCuenta.code,
      message: deUnaCuenta.message,
      details: deUnaCuenta.details,
    })
  })

  it('valida los datos (400) sin contar intentos', async () => {
    const error = await fallo(iniciarSesion({ correo: '', password: '' }))

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: { correo: 'Ingresa tu correo institucional.', password: 'Ingresa una contraseña.' },
    })
    await expect(iniciarSesion({ correo: 'camila@gmail.com', password: 'Camila2026' })).rejects.toMatchObject({
      status: 400,
      fieldErrors: { correo: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).' },
    })
    await expect(iniciarSesion()).rejects.toMatchObject({ status: 400 })
    expect(camila().intentosFallidos).toBe(0)
  })
})

describe('auth.service · obtenerSesion, cerrarSesion y haySesionGuardada', () => {
  it('sin una sesión guardada no hay nada que restaurar', async () => {
    expect(haySesionGuardada()).toBe(false)
    await expect(obtenerSesion()).resolves.toBeNull()
  })

  it('restaura la sesión guardada con los datos actuales del usuario y sin credenciales', async () => {
    await iniciarSesion({ ...CAMILA, recordar: true })
    usuariosRepository.update('usr-001', { telefono: '912345678' })

    expect(haySesionGuardada()).toBe(true)
    const sesion = await obtenerSesion()

    expect(sesion.usuario).toMatchObject({ id: 'usr-001', telefono: '912345678' })
    expect(sesion.usuario).not.toHaveProperty('passwordHash')
    expect(sesion.usuario).not.toHaveProperty('passwordSalt')
  })

  it('el bloqueo temporal por intentos no cierra una sesión ya iniciada', async () => {
    await iniciarSesion(CAMILA)
    usuariosRepository.update('usr-001', { intentosFallidos: 5, bloqueadoHasta: BLOQUEADO_HASTA })

    await expect(obtenerSesion()).resolves.toMatchObject({ usuario: { id: 'usr-001' } })
  })

  it('descarta la sesión de una cuenta que el supervisor bloqueó', async () => {
    await iniciarSesion(CAMILA)
    usuariosRepository.update('usr-001', { estado: 'bloqueado', motivoBloqueo: 'Reportes falsos reiterados.' })

    await expect(obtenerSesion()).resolves.toBeNull()
    expect(haySesionGuardada()).toBe(false)
  })

  it('descarta la sesión de una cuenta que ya no existe', async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ usuarioId: 'usr-999', iniciadaEn: AHORA }))

    await expect(obtenerSesion()).resolves.toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('ignora una sesión guardada dañada', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{dañada')

    expect(haySesionGuardada()).toBe(false)
    await expect(obtenerSesion()).resolves.toBeNull()
  })

  it('cerrarSesion borra la sesión de este equipo y de la pestaña', async () => {
    await iniciarSesion({ ...CAMILA, recordar: true })

    await cerrarSesion()

    expect(haySesionGuardada()).toBe(false)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    await expect(obtenerSesion()).resolves.toBeNull()
  })
})

describe('auth.service · solicitarRecuperacion', () => {
  it('con una cuenta crea un enlace aleatorio que vence en 30 minutos', async () => {
    const respuesta = await solicitarRecuperacion(' Camila.Quispe@ALOE.ulima.edu.pe ')

    expect(respuesta).toEqual({
      enviado: true,
      correo: CAMILA.correo,
      tokenDemo: expect.stringMatching(/^REC-[0-9A-F]{32}$/),
    })
    expect(tokensRecuperacionRepository.findAll()).toEqual([
      {
        id: 'rec-001',
        token: respuesta.tokenDemo,
        usuarioId: 'usr-001',
        creadoEn: AHORA,
        venceEn: ENLACE_VENCE,
        usadoEn: null,
      },
    ])
  })

  it('con un correo sin cuenta responde igual, pero sin token ni enlace', async () => {
    const respuesta = await solicitarRecuperacion('nadie.registrado@ulima.edu.pe')

    expect(respuesta).toEqual({ enviado: true, correo: 'nadie.registrado@ulima.edu.pe' })
    expect(tokensRecuperacionRepository.findAll()).toEqual([])
  })

  it('valida el correo institucional (400)', async () => {
    await expect(solicitarRecuperacion('camila@gmail.com')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: { correo: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).' },
    })
    await expect(solicitarRecuperacion()).rejects.toMatchObject({
      status: 400,
      fieldErrors: { correo: 'Ingresa tu correo institucional.' },
    })
    expect(tokensRecuperacionRepository.findAll()).toEqual([])
  })

  it('un pedido nuevo anula el enlace anterior que no se usó', async () => {
    const anterior = await pedirEnlace()
    const nuevo = await pedirEnlace()

    expect(nuevo).not.toBe(anterior)
    await expect(validarTokenRecuperacion(anterior)).rejects.toMatchObject({
      status: 404,
      code: 'RESET_TOKEN_NOT_FOUND',
    })
    await expect(validarTokenRecuperacion(nuevo)).resolves.toEqual({ correo: CAMILA.correo })
    expect(tokensRecuperacionRepository.findAll().map((enlace) => enlace.id)).toEqual(['rec-002'])
  })

  it('no anula los enlaces de otras cuentas', async () => {
    const deCamila = await pedirEnlace()
    await pedirEnlace('jparedes@ulima.edu.pe')

    await expect(validarTokenRecuperacion(deCamila)).resolves.toEqual({ correo: CAMILA.correo })
  })
})

describe('auth.service · validarTokenRecuperacion', () => {
  it('un enlace vigente devuelve el correo de su cuenta', async () => {
    const token = await pedirEnlace()

    await expect(validarTokenRecuperacion(token)).resolves.toEqual({ correo: CAMILA.correo })
  })

  it('un token que no existe responde 404', async () => {
    const error = await fallo(validarTokenRecuperacion('REC-NO-EXISTE'))

    expect(error).toBeInstanceOf(ServiceError)
    expect(error).toMatchObject({
      status: 404,
      code: 'RESET_TOKEN_NOT_FOUND',
      message: 'Este enlace para restablecer la contraseña no es válido.',
    })
    await expect(validarTokenRecuperacion()).rejects.toMatchObject({ status: 404 })
  })

  it('el enlace vence a los 30 minutos (410)', async () => {
    const token = await pedirEnlace()

    vi.setSystemTime('2026-10-01T15:56:59.999Z')
    await expect(validarTokenRecuperacion(token)).resolves.toEqual({ correo: CAMILA.correo })

    vi.setSystemTime(ENLACE_VENCE)
    await expect(validarTokenRecuperacion(token)).rejects.toMatchObject({
      status: 410,
      code: 'RESET_TOKEN_EXPIRED',
      message: 'Este enlace venció: es válido por 30 minutos.',
    })
    await expect(restablecerPassword(token, NUEVA, NUEVA)).rejects.toMatchObject({
      status: 410,
      code: 'RESET_TOKEN_EXPIRED',
    })
    await expect(tieneLaContrasena(camila(), CAMILA.password)).resolves.toBe(true)
  })
})

describe('auth.service · restablecerPassword', () => {
  it('guarda la nueva contraseña con una sal nueva, gasta el enlace y devuelve el correo', async () => {
    const token = await pedirEnlace()
    const salAnterior = camila().passwordSalt
    vi.setSystemTime('2026-10-01T15:40:00.000Z')

    await expect(restablecerPassword(token, NUEVA, NUEVA)).resolves.toEqual({ correo: CAMILA.correo })

    const cuenta = camila()
    expect(cuenta.passwordSalt).toMatch(/^[0-9a-f]{32}$/)
    expect(cuenta.passwordSalt).not.toBe(salAnterior)
    expect(JSON.stringify(cuenta)).not.toContain(NUEVA)
    await expect(tieneLaContrasena(cuenta, NUEVA)).resolves.toBe(true)
    expect(cuenta.actualizadoEn).toBe('2026-10-01T15:40:00.000Z')
    expect(tokensRecuperacionRepository.findByToken(token).usadoEn).toBe('2026-10-01T15:40:00.000Z')
  })

  it('el enlace sirve una sola vez: el segundo intento responde 410', async () => {
    const token = await pedirEnlace()
    await restablecerPassword(token, NUEVA, NUEVA)

    await expect(restablecerPassword(token, 'Otra2027', 'Otra2027')).rejects.toMatchObject({
      status: 410,
      code: 'RESET_TOKEN_USED',
      message: 'Este enlace ya se usó: cada enlace sirve una sola vez.',
    })
    await expect(validarTokenRecuperacion(token)).rejects.toMatchObject({ status: 410, code: 'RESET_TOKEN_USED' })
    await expect(tieneLaContrasena(camila(), NUEVA)).resolves.toBe(true)
  })

  it('con un token que no existe responde 404 sin cambiar nada', async () => {
    await expect(restablecerPassword('REC-NO-EXISTE', NUEVA, NUEVA)).rejects.toMatchObject({
      status: 404,
      code: 'RESET_TOKEN_NOT_FOUND',
    })
    await expect(tieneLaContrasena(camila(), CAMILA.password)).resolves.toBe(true)
  })

  it('vuelve a validar la contraseña nueva (400) sin gastar el enlace', async () => {
    const token = await pedirEnlace()

    await expect(restablecerPassword(token, 'campus', 'Campus2027')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: {
        password: 'Mínimo 8 caracteres, con una mayúscula y un número.',
        confirmacion: 'Las contraseñas no coinciden.',
      },
    })
    expect(tokensRecuperacionRepository.findByToken(token).usadoEn).toBeNull()
    await expect(tieneLaContrasena(camila(), CAMILA.password)).resolves.toBe(true)
  })

  it('desbloquea la cuenta bloqueada por intentos: entra con la nueva contraseña y ya no con la anterior', async () => {
    await fallar(5)
    expect(camila().bloqueadoHasta).toBe(BLOQUEADO_HASTA)
    const token = await pedirEnlace()

    await restablecerPassword(token, NUEVA, NUEVA)

    expect(camila()).toMatchObject({ intentosFallidos: 0, bloqueadoHasta: null })
    await expect(iniciarSesion({ ...CAMILA, password: NUEVA })).resolves.toMatchObject({ usuario: { id: 'usr-001' } })
    await expect(iniciarSesion(CAMILA)).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' })
  })

  it('no quita el bloqueo que aplicó un supervisor', async () => {
    const token = await pedirEnlace(DIEGO.correo)

    await restablecerPassword(token, NUEVA, NUEVA)

    expect(usuariosRepository.findById('usr-004')).toMatchObject({
      estado: 'bloqueado',
      motivoBloqueo: 'Reportes falsos reiterados.',
    })
    await expect(iniciarSesion({ ...DIEGO, password: NUEVA })).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_BLOCKED',
    })
  })
})

describe('auth.service · cambiarPassword', () => {
  const cambio = { actual: CAMILA.password, nueva: NUEVA, confirmacion: NUEVA }

  it('con la contraseña actual correcta guarda la nueva y devuelve el usuario sin credenciales', async () => {
    const usuario = await cambiarPassword('usr-001', cambio)

    expect(usuario).toMatchObject({ id: 'usr-001', correo: CAMILA.correo, actualizadoEn: AHORA })
    expect(usuario).not.toHaveProperty('passwordHash')
    expect(usuario).not.toHaveProperty('passwordSalt')
    await expect(iniciarSesion({ ...CAMILA, password: NUEVA })).resolves.toMatchObject({ usuario: { id: 'usr-001' } })
    await expect(iniciarSesion(CAMILA)).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' })
  })

  it('si la contraseña actual no es la correcta responde 400 en ese campo', async () => {
    const error = await fallo(cambiarPassword('usr-001', { ...cambio, actual: 'Camila2025' }))

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: { actual: 'La contraseña actual no es correcta.' },
    })
    await expect(tieneLaContrasena(camila(), CAMILA.password)).resolves.toBe(true)
  })

  it('la nueva contraseña debe ser distinta de la actual (400)', async () => {
    const igual = { actual: CAMILA.password, nueva: CAMILA.password, confirmacion: CAMILA.password }

    await expect(cambiarPassword('usr-001', igual)).rejects.toMatchObject({
      status: 400,
      fieldErrors: { nueva: 'La nueva contraseña debe ser distinta de la actual.' },
    })
  })

  it('vuelve a validar la nueva contraseña y su confirmación (400)', async () => {
    const debil = { ...cambio, nueva: 'campus', confirmacion: 'campus' }

    await expect(cambiarPassword('usr-001', { ...cambio, confirmacion: 'Campus2028' })).rejects.toMatchObject({
      status: 400,
      fieldErrors: { confirmacion: 'Las contraseñas no coinciden.' },
    })
    await expect(cambiarPassword('usr-001', debil)).rejects.toMatchObject({
      status: 400,
      fieldErrors: { nueva: 'Mínimo 8 caracteres, con una mayúscula y un número.' },
    })
    await expect(cambiarPassword('usr-001')).rejects.toMatchObject({
      status: 400,
      fieldErrors: {
        actual: 'Ingresa tu contraseña actual.',
        nueva: 'Ingresa una contraseña.',
        confirmacion: 'Confirma tu contraseña.',
      },
    })
    await expect(tieneLaContrasena(camila(), CAMILA.password)).resolves.toBe(true)
  })

  it('una cuenta que no existe o que está bloqueada responde 401', async () => {
    const deDiego = { actual: DIEGO.password, nueva: NUEVA, confirmacion: NUEVA }

    await expect(cambiarPassword('usr-999', cambio)).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
    await expect(cambiarPassword('usr-004', deDiego)).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
  })
})
