import { describe, expect, it, vi } from 'vitest'
import { CAMILA, DIEGO, JULIO, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

const login = (credenciales) => api().post('/api/auth/login').send(credenciales)

describe('POST /api/auth/login', () => {
  it('con credenciales correctas devuelve el token y la cuenta sin el hash', async () => {
    const respuesta = await login(CAMILA)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.token).toEqual(expect.any(String))
    expect(respuesta.body.usuario).toMatchObject({ id: 'usr-001', nombres: 'Camila Alejandra', rol: 'usuario' })
    expect(respuesta.body.usuario).not.toHaveProperty('passwordHash')
    expect(respuesta.body.usuario).not.toHaveProperty('intentosFallidos')
  })

  it('ignora mayúsculas y espacios en el correo', async () => {
    const respuesta = await login({ ...CAMILA, correo: '  Camila.Quispe@aloe.ulima.edu.pe ' })

    expect(respuesta.status).toBe(200)
  })

  it('"Recordarme" alarga la sesión a 30 días', async () => {
    const corta = await login(CAMILA)
    const recordada = await login({ ...CAMILA, recordar: true })

    expect(corta.body.venceEn).toBe('2026-10-01T23:27:00.000Z')
    expect(recordada.body.venceEn).toBe('2026-10-31T15:27:00.000Z')
  })

  it('valida los campos antes de buscar la cuenta', async () => {
    const respuesta = await login({ correo: 'camila@gmail.com', password: '' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.code).toBe('VALIDATION_ERROR')
    expect(respuesta.body.fieldErrors).toEqual({
      correo: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
      password: 'Ingresa una contraseña.',
    })
  })

  it('con contraseña incorrecta avisa cuántos intentos quedan (p05)', async () => {
    const respuesta = await login({ ...LUCIA, password: 'Incorrecta1' })

    expect(respuesta.status).toBe(401)
    expect(respuesta.body.message).toBe('Correo o contraseña incorrectos. Te quedan 4 intentos antes del bloqueo temporal.')
    expect(respuesta.body.details).toEqual({ intentosRestantes: 4 })
  })

  it('al quinto fallo bloquea 15 minutos, y después vuelve a dejar entrar (p05)', async () => {
    const incorrecta = { ...JULIO, password: 'Incorrecta1' }
    for (let intento = 0; intento < 4; intento += 1) await login(incorrecta)

    const quinto = await login(incorrecta)
    expect(quinto.status).toBe(423)
    expect(quinto.body.code).toBe('ACCOUNT_LOCKED')
    expect(quinto.body.message).toBe(
      'Cuenta bloqueada por 15 minutos tras cinco intentos fallidos. Podrás ingresar a las 10:42 o restablecer tu contraseña ahora.',
    )
    expect((await login(JULIO)).status).toBe(423)

    vi.setSystemTime('2026-10-01T15:43:00.000Z')
    expect((await login(JULIO)).status).toBe(200)
  })

  it('un correo sin cuenta recibe la misma respuesta que una contraseña incorrecta', async () => {
    const respuesta = await login({ correo: 'nadie@ulima.edu.pe', password: 'Cualquiera1' })

    expect(respuesta.status).toBe(401)
    expect(respuesta.body.details).toEqual({ intentosRestantes: 4 })
  })

  it('la cuenta bloqueada por el supervisor solo se avisa con la contraseña correcta', async () => {
    expect((await login({ ...DIEGO, password: 'Incorrecta1' })).status).toBe(401)

    const respuesta = await login(DIEGO)
    expect(respuesta.status).toBe(403)
    expect(respuesta.body.message).toBe(
      'Tu cuenta está bloqueada: Reportes falsos reiterados. Comunícate con soporte.campus@ulima.edu.pe.',
    )
  })
})

describe('sesión y protección de rutas', () => {
  it('sin token o con un token falso responde 401', async () => {
    expect((await api().get('/api/cuenta')).status).toBe(401)

    const respuesta = await api().get('/api/cuenta').set(conToken('token-falso'))
    expect(respuesta.status).toBe(401)
    expect(respuesta.body.code).toBe('UNAUTHENTICATED')
  })

  it('después de cerrar sesión el token ya no sirve', async () => {
    const token = await ingresar(CAMILA)
    expect((await api().get('/api/cuenta').set(conToken(token))).status).toBe(200)

    expect((await api().post('/api/auth/logout').set(conToken(token))).status).toBe(204)
    expect((await api().get('/api/cuenta').set(conToken(token))).status).toBe(401)
  })

  it('la sesión vence a las 8 horas', async () => {
    const token = await ingresar(CAMILA)

    vi.setSystemTime('2026-10-01T23:28:00.000Z')
    expect((await api().get('/api/cuenta').set(conToken(token))).status).toBe(401)
  })

  it('una ruta de supervisor responde 403 a otro rol (p11)', async () => {
    const token = await ingresar(CAMILA)

    const respuesta = await api().post('/api/invitaciones').set(conToken(token)).send({})
    expect(respuesta.status).toBe(403)
    expect(respuesta.body.code).toBe('FORBIDDEN')
  })

  it('una ruta que no existe responde 404 en JSON', async () => {
    const respuesta = await api().get('/api/no-existe')

    expect(respuesta.status).toBe(404)
    expect(respuesta.body.code).toBe('NOT_FOUND')
  })

  it('un cuerpo que no es JSON responde 400', async () => {
    const respuesta = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{roto')

    expect(respuesta.status).toBe(400)
  })
})
