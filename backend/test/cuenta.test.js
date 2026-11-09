import { beforeEach, describe, expect, it } from 'vitest'
import { CAMILA, JULIO, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

let token
beforeEach(async () => {
  token = await ingresar(CAMILA)
})

const get = (ruta) => api().get(ruta).set(conToken(token))

describe('GET /api/cuenta (p10)', () => {
  it('devuelve los datos de la cuenta con sesión', async () => {
    const respuesta = await get('/api/cuenta')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toMatchObject({ id: 'usr-001', correo: CAMILA.correo, ambienteHabitualId: 'amb-01' })
  })

  it('las opciones traen las unidades y los ambientes', async () => {
    const respuesta = await get('/api/cuenta/opciones')

    expect(respuesta.body.unidades).toHaveLength(15)
    expect(respuesta.body.ambientes[0]).toEqual({ id: 'amb-01', codigo: 'A-201', nombre: 'Aula A-201' })
  })
})

describe('PATCH /api/cuenta (p10)', () => {
  it('guarda los datos personales e ignora correo y rol', async () => {
    const respuesta = await api()
      .patch('/api/cuenta')
      .set(conToken(token))
      .send({ telefono: '911 222 333', ambienteHabitualId: 'amb-02', correo: 'otro@ulima.edu.pe', rol: 'supervisor' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toMatchObject({
      telefono: '911222333',
      ambienteHabitualId: 'amb-02',
      correo: CAMILA.correo,
      rol: 'usuario',
    })
  })

  it('valida los campos y el ambiente', async () => {
    const respuesta = await api()
      .patch('/api/cuenta')
      .set(conToken(token))
      .send({ nombres: '', ambienteHabitualId: 'amb-99' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({
      nombres: 'Ingresa tus nombres.',
      ambienteHabitualId: 'Selecciona un ambiente de la lista.',
    })
  })
})

describe('resumen y contadores', () => {
  it('el resumen de Mi cuenta coincide con el mockup p10', async () => {
    const respuesta = await get('/api/cuenta/resumen')

    expect(respuesta.body).toEqual({
      ticketsReportados: 12,
      abiertosAhora: 3,
      encuestaPendiente: {
        ticketCodigo: 'TCK-2026-00131',
        cerradoEn: '2026-09-28T22:20:00.000Z',
        fechaLimite: '2026-10-05T22:20:00.000Z',
      },
      cuentaCreada: '2026-03-14T15:20:00.000Z',
    })
  })

  it('los contadores del usuario dan la bienvenida de p05 y el menú de p10', async () => {
    expect((await get('/api/cuenta/contadores')).body).toEqual({
      ticketsAbiertos: 3,
      ticketsReportados: 12,
      encuestasPendientes: 1,
      encuestasRespondidas: 7,
    })
  })

  it('técnico y supervisor reciben su propio contador', async () => {
    const tecnico = await api().get('/api/cuenta/contadores').set(conToken(await ingresar(JULIO)))
    const supervisor = await api().get('/api/cuenta/contadores').set(conToken(await ingresar(LUCIA)))

    expect(Object.keys(tecnico.body)).toEqual(['asignados'])
    expect(supervisor.body).toEqual({ colaSinAsignar: 2 })
  })
})

describe('PUT /api/cuenta/contrasena (p10)', () => {
  const cambiar = (datos) => api().put('/api/cuenta/contrasena').set(conToken(token)).send(datos)

  it('si la contraseña actual no coincide, el error va en el campo "actual"', async () => {
    const respuesta = await cambiar({ actual: 'Incorrecta1', nueva: 'Campus2027', confirmacion: 'Campus2027' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({ actual: 'La contraseña actual no es correcta.' })
  })

  it('la nueva debe ser distinta de la actual', async () => {
    const respuesta = await cambiar({ actual: CAMILA.password, nueva: CAMILA.password, confirmacion: CAMILA.password })

    expect(respuesta.body.fieldErrors).toEqual({ nueva: 'La nueva contraseña debe ser distinta de la actual.' })
  })

  it('cambia la contraseña', async () => {
    expect((await cambiar({ actual: CAMILA.password, nueva: 'Campus2027', confirmacion: 'Campus2027' })).status).toBe(200)

    expect(await ingresar({ ...CAMILA, password: 'Campus2027' })).toEqual(expect.any(String))

    // se devuelve la de antes para las pruebas siguientes
    await cambiar({ actual: 'Campus2027', nueva: CAMILA.password, confirmacion: CAMILA.password })
  })
})

describe('POST /api/solicitudes-acceso (p11)', () => {
  it('registra la solicitud una sola vez', async () => {
    const solicitar = () =>
      api().post('/api/solicitudes-acceso').set(conToken(token)).send({ recurso: 'la cola de atención' })

    const primera = await solicitar()
    expect(primera.status).toBe(201)
    expect(primera.body).toMatchObject({ usuarioId: 'usr-001', recurso: 'la cola de atención' })

    const segunda = await solicitar()
    expect(segunda.status).toBe(409)
    expect(segunda.body.message).toBe(
      'Ya habías solicitado acceso a la cola de atención. Infraestructura y Servicios está revisando tu solicitud.',
    )
  })

  it('pide indicar la sección', async () => {
    const respuesta = await api().post('/api/solicitudes-acceso').set(conToken(token)).send({ recurso: '  ' })

    expect(respuesta.status).toBe(400)
  })
})
