import { describe, expect, it } from 'vitest'
import { CAMILA, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

const ACTIVACION = { telefono: '951 220 874', password: 'Tecnica2026', confirmacion: 'Tecnica2026', especialidades: ['cat-01', 'cat-03'] }

describe('GET /api/invitaciones/:token (p07)', () => {
  it('devuelve los datos precargados y quién invitó', async () => {
    const respuesta = await api().get('/api/invitaciones/INV-TEC-2026-DEMO')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toMatchObject({
      nombres: 'Rosa Elena',
      correo: 'rhuaman@ulima.edu.pe',
      rol: 'tecnico',
      invitadoPorNombre: 'Lucía Mendoza Ríos',
      estadoEfectivo: 'pendiente',
    })
  })

  it('marca como vencida la invitación pasada de fecha', async () => {
    const respuesta = await api().get('/api/invitaciones/INV-TEC-2026-VENCIDA')

    expect(respuesta.body).toMatchObject({ estado: 'pendiente', estadoEfectivo: 'vencida' })
  })

  it('un token que no existe responde 404', async () => {
    expect((await api().get('/api/invitaciones/INV-NO-EXISTE')).status).toBe(404)
  })

  it('las opciones traen las categorías activas para elegir la especialidad', async () => {
    const respuesta = await api().get('/api/invitaciones/INV-TEC-2026-DEMO/opciones')

    expect(respuesta.body.categorias).toHaveLength(7)
    expect(respuesta.body.categorias[0]).toEqual({ id: 'cat-01', nombre: 'Audiovisuales' })
  })
})

describe('POST /api/invitaciones/:token/aceptar (p07)', () => {
  it('valida teléfono, contraseña y de una a tres especialidades', async () => {
    const respuesta = await api()
      .post('/api/invitaciones/INV-TEC-2026-DEMO/aceptar')
      .send({ ...ACTIVACION, especialidades: ['cat-01', 'cat-02', 'cat-03', 'cat-04'] })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({ especialidades: 'Elige entre una y tres categorías.' })
  })

  it('crea la cuenta con los datos de la invitación y ya no se puede volver a usar', async () => {
    const respuesta = await api().post('/api/invitaciones/INV-TEC-2026-DEMO/aceptar').send(ACTIVACION)

    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toMatchObject({
      nombres: 'Rosa Elena',
      correo: 'rhuaman@ulima.edu.pe',
      rol: 'tecnico',
      unidad: 'Dirección de Infraestructura y Servicios',
      especialidades: ['cat-01', 'cat-03'],
    })
    expect(await ingresar({ correo: 'rhuaman@ulima.edu.pe', password: 'Tecnica2026' })).toEqual(expect.any(String))

    const otraVez = await api().post('/api/invitaciones/INV-TEC-2026-DEMO/aceptar').send(ACTIVACION)
    expect(otraVez.status).toBe(409)
    expect(otraVez.body.message).toBe('Esta invitación ya fue aceptada.')
  })

  it('una invitación vencida responde 410', async () => {
    const respuesta = await api().post('/api/invitaciones/INV-TEC-2026-VENCIDA/aceptar').send(ACTIVACION)

    expect(respuesta.status).toBe(410)
    expect(respuesta.body.message).toBe('Esta invitación venció el 12/09/2026.')
  })
})

describe('POST /api/invitaciones/:token/rechazar (p07)', () => {
  it('deja la invitación como rechazada', async () => {
    const respuesta = await api().post('/api/invitaciones/INV-SUP-2026-DEMO/rechazar')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.estado).toBe('rechazada')
    expect((await api().post('/api/invitaciones/INV-SUP-2026-DEMO/rechazar')).status).toBe(409)
  })
})

describe('POST /api/invitaciones (supervisor)', () => {
  const NUEVA = { nombres: 'Pedro', apellidos: 'Gómez Lara', correo: 'pgomez@ulima.edu.pe', rol: 'tecnico', telefono: '912345678' }

  it('el supervisor crea una invitación que vence en 7 días', async () => {
    const token = await ingresar(LUCIA)

    const respuesta = await api().post('/api/invitaciones').set(conToken(token)).send(NUEVA)
    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toMatchObject({
      id: 'inv-005',
      estado: 'pendiente',
      invitadoPor: 'usr-003',
      venceEn: '2026-10-08T15:27:00.000Z',
    })
    expect(respuesta.body.token).toMatch(/^INV-[0-9A-F]{24}$/)

    const repetida = await api().post('/api/invitaciones').set(conToken(token)).send(NUEVA)
    expect(repetida.status).toBe(409)
    expect(repetida.body.code).toBe('INVITATION_PENDING')
  })

  it('sin sesión responde 401 y con otro rol 403', async () => {
    expect((await api().post('/api/invitaciones').send(NUEVA)).status).toBe(401)

    const token = await ingresar(CAMILA)
    expect((await api().post('/api/invitaciones').set(conToken(token)).send(NUEVA)).status).toBe(403)
  })
})
