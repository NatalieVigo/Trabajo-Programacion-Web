import { describe, expect, it, vi } from 'vitest'
import { categoriasRepository } from '../repositories/catalogo.repository.js'
import { espiarApi, ultimaPeticion } from '../test/espiarApi.js'
import { DEMO, guardarSesion } from '../test/test-utils.jsx'
import { actualizar, cambiarEstado, crear, eliminar, listar, listarDisponibles, obtener } from './categorias.service.js'

// las reglas del catálogo se prueban en backend/test; aquí, que el navegador le pida lo correcto a la API
const fallo = (promise) => promise.catch((error) => error)
const SUPERVISORA = 'Bearer prueba.usr-003'

describe('categorias.service · peticiones a la API', () => {
  it('listar pide el catálogo con el token de la sesión', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()

    const catalogo = await listar()

    expect(catalogo).toHaveLength(7)
    expect(catalogo[1]).toMatchObject({ id: 'cat-01', nombre: 'Audiovisuales', ticketsEnCurso: 2 })
    expect(ultimaPeticion(fetch)).toEqual({ ruta: '/categorias', method: 'GET', token: SUPERVISORA })
  })

  it('crear manda los datos y no el id del supervisor: la API lo saca del token', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()
    const datos = { nombre: 'Señalética', categoriaId: '', prioridadPorDefecto: 'baja', tiempoEsperadoHoras: '48', descripcion: '' }

    const creada = await crear(datos)

    expect(creada).toMatchObject({ tipo: 'categoria', id: 'cat-08', nombre: 'Señalética', tiempoEsperadoHoras: 48 })
    expect(ultimaPeticion(fetch)).toEqual({ ruta: '/categorias', method: 'POST', token: SUPERVISORA, datos })
    expect(categoriasRepository.findById('cat-08')).not.toBeNull()
  })

  it('obtener, actualizar y eliminar arman la ruta con el id', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()

    await expect(obtener('sub-12')).resolves.toMatchObject({ tipo: 'subcategoria', nombre: 'Luminaria apagada' })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/categorias/sub-12', method: 'GET' })

    await expect(actualizar('cat-03', { tiempoEsperadoHoras: '12' })).resolves.toMatchObject({ tiempoEsperadoHoras: 12 })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/categorias/cat-03', method: 'PATCH', datos: { tiempoEsperadoHoras: '12' } })

    await expect(eliminar('sub-10')).resolves.toEqual({ id: 'sub-10', tipo: 'subcategoria', nombre: 'Calefacción sin funcionar' })
    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/categorias/sub-10', method: 'DELETE' })
  })

  it('cambiarEstado manda activa y confirmado; sin confirmar llega el 409 con los tickets en curso', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()

    const error = await fallo(cambiarEstado('cat-01', false))
    expect(error).toMatchObject({ status: 409, code: 'OPEN_TICKETS', details: { ticketsEnCurso: 2 } })
    expect(ultimaPeticion(fetch)).toMatchObject({
      ruta: '/categorias/cat-01/estado',
      method: 'PATCH',
      datos: { activa: false, confirmado: false },
    })

    await expect(cambiarEstado('cat-01', false, { confirmado: true })).resolves.toMatchObject({ activa: false })
    expect(categoriasRepository.findById('cat-01').activa).toBe(false)
  })

  it('listarDisponibles sirve para cualquier rol con sesión, porque la usa HU-3', async () => {
    guardarSesion(DEMO.usuario)
    const fetch = espiarApi()

    await expect(listarDisponibles()).resolves.toHaveLength(7)
    expect(ultimaPeticion(fetch)).toEqual({ ruta: '/categorias/disponibles', method: 'GET', token: 'Bearer prueba.usr-001' })
  })
})

describe('categorias.service · errores de la API', () => {
  it('si no es supervisor la API responde 403', async () => {
    guardarSesion(DEMO.tecnico)
    expect(await fallo(listar())).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(await fallo(crear({ nombre: 'Otra' }))).toMatchObject({ status: 403 })
  })

  it('sin sesión la API responde 401', async () => {
    expect(await fallo(listar())).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
  })

  it('las validaciones del servidor llegan con sus mensajes por campo', async () => {
    guardarSesion(DEMO.supervisor)

    const error = await fallo(crear({ nombre: 'CLIMATIZACION', prioridadPorDefecto: 'alta', tiempoEsperadoHoras: '8' }))

    expect(error).toMatchObject({ status: 409, code: 'NAME_TAKEN', fieldErrors: { nombre: 'Ya existe una categoría con ese nombre.' } })
  })

  it('si el servidor no responde avisa que no hay conexión', async () => {
    guardarSesion(DEMO.supervisor)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    expect(await fallo(listar())).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })
})
