import { describe, expect, it } from 'vitest'
import { ambientesRepository, sedesRepository } from '../repositories/catalogo.repository.js'
import { espiarApi, ultimaPeticion } from '../test/espiarApi.js'
import { DEMO, guardarSesion } from '../test/test-utils.jsx'
import {
  actualizarAmbiente,
  actualizarPabellon,
  actualizarSede,
  crearAmbiente,
  crearPabellon,
  crearSede,
  eliminarAmbiente,
  eliminarPabellon,
  eliminarSede,
  listarAmbientes,
  listarSedes,
} from './ubicaciones.service.js'

// las reglas de sedes, pabellones y ambientes se prueban en backend/test; aquí, las peticiones del navegador
const fallo = (promise) => promise.catch((error) => error)

describe('ubicaciones.service · sedes y pabellones', () => {
  it('lista las sedes con sus pabellones', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()

    const [monterrico] = await listarSedes()

    expect(monterrico).toMatchObject({ id: 'sed-01', nombre: 'Campus Monterrico', ambientes: 11 })
    expect(monterrico.pabellones).toHaveLength(9)
    expect(ultimaPeticion(fetch)).toEqual({ ruta: '/sedes', method: 'GET', token: 'Bearer prueba.usr-003' })
  })

  it('crea, renombra y elimina una sede con POST, PATCH y DELETE', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()

    await expect(crearSede({ nombre: 'Campus San Isidro' })).resolves.toEqual({ id: 'sed-02', nombre: 'Campus San Isidro' })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/sedes', method: 'POST', datos: { nombre: 'Campus San Isidro' } })

    await actualizarSede('sed-02', { nombre: 'Local San Isidro' })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/sedes/sed-02', method: 'PATCH', datos: { nombre: 'Local San Isidro' } })

    await eliminarSede('sed-02')
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/sedes/sed-02', method: 'DELETE' })
    expect(sedesRepository.findById('sed-02')).toBeNull()
  })

  it('crea, edita y elimina un pabellón', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()

    await expect(crearPabellon({ sedeId: 'sed-01', nombre: 'J' })).resolves.toEqual({ id: 'pab-10', sedeId: 'sed-01', nombre: 'J' })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/pabellones', method: 'POST' })

    await actualizarPabellon('pab-10', { nombre: 'J (anexo)' })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/pabellones/pab-10', method: 'PATCH' })

    await eliminarPabellon('pab-10')
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/pabellones/pab-10', method: 'DELETE' })
  })

  it('si la sede tiene pabellones llega el 409 con su explicación', async () => {
    guardarSesion(DEMO.supervisor)

    expect(await fallo(eliminarSede('sed-01'))).toMatchObject({
      status: 409,
      code: 'IN_USE',
      message: 'No se puede eliminar «Campus Monterrico»: tiene 9 pabellones.',
    })
  })
})

describe('ubicaciones.service · ambientes', () => {
  it('crea, edita y elimina un ambiente', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()
    const datos = { codigo: 'h-212', tipo: 'laboratorio', nombre: '', pabellonId: 'pab-04', piso: '2', capacidad: '30' }

    await expect(crearAmbiente(datos)).resolves.toMatchObject({ id: 'amb-12', codigo: 'H-212', pabellonNombre: 'H' })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/ambientes', method: 'POST', datos })

    await actualizarAmbiente('amb-12', { capacidad: '32' })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/ambientes/amb-12', method: 'PATCH', datos: { capacidad: '32' } })

    await eliminarAmbiente('amb-12')
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/ambientes/amb-12', method: 'DELETE' })
    expect(ambientesRepository.findById('amb-12')).toBeNull()
  })

  it('cualquier rol con sesión lee los ambientes (HU-3), pero solo el supervisor los cambia', async () => {
    guardarSesion(DEMO.usuario)
    const fetch = espiarApi()

    await expect(listarAmbientes()).resolves.toHaveLength(11)
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/ambientes', method: 'GET' })
    expect(await fallo(eliminarAmbiente('amb-11'))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(ambientesRepository.findById('amb-11')).not.toBeNull()
  })

  it('sin sesión la API responde 401', async () => {
    expect(await fallo(listarAmbientes())).toMatchObject({ status: 401 })
  })
})
