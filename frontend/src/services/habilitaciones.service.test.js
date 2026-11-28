import { describe, expect, it } from 'vitest'
import { habilitacionesRepository } from '../repositories/catalogo.repository.js'
import { espiarApi, ultimaPeticion } from '../test/espiarApi.js'
import { DEMO, guardarSesion } from '../test/test-utils.jsx'
import { guardarMatriz, obtenerMatriz } from './habilitaciones.service.js'

// las reglas de la matriz se prueban en backend/test; aquí, las peticiones del navegador
const fallo = (promise) => promise.catch((error) => error)

describe('habilitaciones.service', () => {
  it('obtenerMatriz pide las categorías y los técnicos activos', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()

    const { categorias, tecnicos } = await obtenerMatriz()

    expect(categorias).toHaveLength(7)
    expect(tecnicos.map(({ id }) => id)).toEqual(['usr-009', 'usr-002', 'usr-008', 'usr-010'])
    expect(ultimaPeticion(fetch)).toEqual({ ruta: '/habilitaciones', method: 'GET', token: 'Bearer prueba.usr-003' })
  })

  it('guardarMatriz manda con PUT solo los técnicos que cambiaron y devuelve la matriz nueva', async () => {
    guardarSesion(DEMO.supervisor)
    const fetch = espiarApi()
    const cambios = { 'usr-002': ['cat-01', 'cat-06'] }

    const matriz = await guardarMatriz(cambios)

    expect(ultimaPeticion(fetch)).toMatchObject({ ruta: '/habilitaciones', method: 'PUT', datos: cambios })
    expect(matriz.tecnicos.find(({ id }) => id === 'usr-002').habilitadas).toEqual(['cat-01', 'cat-06'])
    expect(habilitacionesRepository.findAll({ tecnicoId: 'usr-002' })).toHaveLength(2)
  })

  it('un técnico no puede ver ni guardar la matriz', async () => {
    guardarSesion(DEMO.tecnico)

    expect(await fallo(obtenerMatriz())).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(await fallo(guardarMatriz({ 'usr-002': [] }))).toMatchObject({ status: 403 })
    expect(habilitacionesRepository.findAll({ tecnicoId: 'usr-002' })).toHaveLength(3)
  })
})
