import { describe, expect, it } from 'vitest'
import { api, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

const ANDREA = {
  nombres: '  Andrea   Lucía ',
  apellidos: 'Ríos Vega',
  correo: 'Andrea.Rios@aloe.ulima.edu.pe',
  telefono: '987 111 222',
  password: 'Campus2026',
  confirmacion: 'Campus2026',
  unidad: 'Arquitectura',
  vinculo: 'Estudiante',
  aceptaTerminos: true,
}

const registrar = (datos) => api().post('/api/auth/registro').send(datos)

describe('GET /api/auth/registro/opciones', () => {
  it('devuelve las unidades y los vínculos del seed', async () => {
    const respuesta = await api().get('/api/auth/registro/opciones')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.unidades).toHaveLength(15)
    expect(respuesta.body.unidades[0]).toBe('Ingeniería de Sistemas')
    expect(respuesta.body.vinculos).toEqual(['Estudiante', 'Docente', 'Personal administrativo', 'Egresado'])
  })
})

describe('GET /api/auth/correo-disponible', () => {
  it('dice si el correo ya tiene cuenta', async () => {
    const libre = await api().get('/api/auth/correo-disponible').query({ correo: 'nuevo@aloe.ulima.edu.pe' })
    const ocupado = await api().get('/api/auth/correo-disponible').query({ correo: 'CAMILA.QUISPE@aloe.ulima.edu.pe' })

    expect(libre.body).toEqual({ disponible: true })
    expect(ocupado.body).toEqual({ disponible: false })
  })

  it('rechaza un correo que no es institucional', async () => {
    const respuesta = await api().get('/api/auth/correo-disponible').query({ correo: 'andrea@gmail.com' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors.correo).toMatch(/correo institucional/)
  })
})

describe('POST /api/auth/registro', () => {
  it('crea la cuenta con rol usuario, normaliza los datos y ya puede iniciar sesión', async () => {
    const respuesta = await registrar({ ...ANDREA, rol: 'supervisor' })

    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toMatchObject({
      id: 'usr-011',
      nombres: 'Andrea Lucía',
      correo: 'andrea.rios@aloe.ulima.edu.pe',
      telefono: '987111222',
      rol: 'usuario',
      estado: 'activo',
    })
    expect(respuesta.body).not.toHaveProperty('passwordHash')
    expect(await ingresar({ correo: 'andrea.rios@aloe.ulima.edu.pe', password: 'Campus2026' })).toEqual(expect.any(String))
  })

  it('no deja registrar dos veces el mismo correo', async () => {
    const respuesta = await registrar({ ...ANDREA, correo: 'camila.quispe@aloe.ulima.edu.pe' })

    expect(respuesta.status).toBe(409)
    expect(respuesta.body.code).toBe('EMAIL_TAKEN')
    expect(respuesta.body.fieldErrors).toEqual({ correo: 'Ya existe una cuenta con este correo.' })
  })

  it('repite en el servidor todas las validaciones del formulario (p06)', async () => {
    const respuesta = await registrar({
      nombres: 'A',
      apellidos: '',
      correo: 'x@gmail.com',
      telefono: '12345',
      password: 'corta',
      confirmacion: 'otra',
      unidad: 'Inventada',
      vinculo: '',
      aceptaTerminos: false,
    })

    expect(respuesta.status).toBe(400)
    expect(Object.keys(respuesta.body.fieldErrors).sort()).toEqual(
      ['aceptaTerminos', 'apellidos', 'confirmacion', 'correo', 'nombres', 'password', 'telefono', 'unidad', 'vinculo'],
    )
    expect(respuesta.body.fieldErrors.password).toBe('Mínimo 8 caracteres, con una mayúscula y un número.')
    expect(respuesta.body.fieldErrors.confirmacion).toBe('Las contraseñas no coinciden.')
  })

  it('sin cuerpo responde 400 y no 500', async () => {
    expect((await api().post('/api/auth/registro')).status).toBe(400)
  })
})
