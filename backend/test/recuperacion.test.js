import { describe, expect, it, vi } from 'vitest'
import { CAMILA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

const NUEVA = 'Campus2027'

async function pedirEnlace(correo = CAMILA.correo) {
  const respuesta = await api().post('/api/auth/recuperar-contrasena').send({ correo })
  return respuesta.body.tokenDemo
}

const restablecer = (token, password = NUEVA, confirmacion = password) =>
  api().post(`/api/auth/restablecer-contrasena/${token}`).send({ password, confirmacion })

describe('POST /api/auth/recuperar-contrasena (p08)', () => {
  it('responde lo mismo exista o no la cuenta; el enlace solo existe si hay cuenta', async () => {
    const conCuenta = await api().post('/api/auth/recuperar-contrasena').send({ correo: CAMILA.correo })
    const sinCuenta = await api().post('/api/auth/recuperar-contrasena').send({ correo: 'nadie@ulima.edu.pe' })

    expect(conCuenta.status).toBe(200)
    expect(conCuenta.body).toMatchObject({ enviado: true, correo: CAMILA.correo })
    expect(conCuenta.body.tokenDemo).toMatch(/^REC-[0-9A-F]{32}$/)
    expect(sinCuenta.status).toBe(200)
    expect(sinCuenta.body).toEqual({ enviado: true, correo: 'nadie@ulima.edu.pe' })
  })

  it('valida el correo', async () => {
    const respuesta = await api().post('/api/auth/recuperar-contrasena').send({ correo: '' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({ correo: 'Ingresa tu correo institucional.' })
  })
})

describe('restablecer la contraseña (p09)', () => {
  it('valida el enlace, cambia la contraseña y el enlace ya no se puede reusar', async () => {
    const token = await pedirEnlace()

    const enlace = await api().get(`/api/auth/restablecer-contrasena/${token}`)
    expect(enlace.body).toEqual({ correo: CAMILA.correo })

    expect((await restablecer(token)).status).toBe(200)
    expect((await api().post('/api/auth/login').send(CAMILA)).status).toBe(401)
    expect(await ingresar({ ...CAMILA, password: NUEVA })).toEqual(expect.any(String))

    const reuso = await restablecer(token)
    expect(reuso.status).toBe(410)
    expect(reuso.body.code).toBe('RESET_TOKEN_USED')
  })

  it('solo vale el último enlace pedido', async () => {
    const primero = await pedirEnlace()
    await pedirEnlace()

    expect((await api().get(`/api/auth/restablecer-contrasena/${primero}`)).status).toBe(404)
  })

  it('el enlace vence a los 30 minutos', async () => {
    const token = await pedirEnlace()

    vi.setSystemTime('2026-10-01T15:57:00.000Z')
    const respuesta = await api().get(`/api/auth/restablecer-contrasena/${token}`)
    expect(respuesta.status).toBe(410)
    expect(respuesta.body.message).toBe('Este enlace venció: es válido por 30 minutos.')
  })

  it('valida la nueva contraseña y su confirmación', async () => {
    const token = await pedirEnlace()

    const respuesta = await restablecer(token, 'Campus2028', 'Otra2028')
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({ confirmacion: 'Las contraseñas no coinciden.' })
  })

  it('cierra las sesiones abiertas de la cuenta', async () => {
    const credenciales = { correo: 'renzo.salazar@aloe.ulima.edu.pe', password: 'Demo2026' }
    const sesion = await ingresar(credenciales)

    await restablecer(await pedirEnlace(credenciales.correo))
    expect((await api().get('/api/cuenta').set(conToken(sesion))).status).toBe(401)
  })
})
