import { describe, expect, it } from 'vitest'
import { habilitacionesRepository } from '../repositories/catalogo.repository.js'
import { readTable } from '../repositories/db.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { guardarMatriz, obtenerMatriz } from './habilitaciones.service.js'

const SUPERVISORA = 'usr-003'
const JULIO = 'usr-002'
const SANDRA = 'usr-010'

const fallo = (promise) => promise.catch((error) => error)
const habilitadasDe = (tecnicoId) =>
  habilitacionesRepository
    .findAll({ tecnicoId })
    .map(({ categoriaId }) => categoriaId)
    .sort()

describe('habilitaciones.service · obtenerMatriz', () => {
  it('devuelve las categorías por nombre con sus tickets en curso', async () => {
    const { categorias } = await obtenerMatriz()

    expect(categorias.map(({ nombre }) => nombre)).toEqual([
      'Accesos y cerraduras',
      'Audiovisuales',
      'Climatización',
      'Eléctrico',
      'Limpieza',
      'Mobiliario',
      'Redes y conectividad',
    ])
    expect(categorias[1]).toEqual({ id: 'cat-01', nombre: 'Audiovisuales', activa: true, ticketsEnCurso: 2 })
  })

  it('devuelve los técnicos activos con su especialidad declarada, su carga y sus habilitaciones', async () => {
    const { tecnicos } = await obtenerMatriz()

    expect(tecnicos.map(({ id }) => id)).toEqual(['usr-009', JULIO, 'usr-008', SANDRA])
    expect(tecnicos[1]).toEqual({
      id: JULIO,
      nombres: 'Julio César',
      apellidos: 'Paredes Soto',
      especialidades: ['cat-01', 'cat-02'],
      carga: 2,
      habilitadas: ['cat-07', 'cat-01', 'cat-02'],
    })
    expect(tecnicos[0]).toMatchObject({ especialidades: ['cat-07', 'cat-04'], carga: 0, habilitadas: ['cat-07', 'cat-04', 'cat-05'] })
    expect(tecnicos[3]).toMatchObject({ carga: 1 })
  })

  it('no incluye a los técnicos bloqueados ni a los supervisores', async () => {
    usuariosRepository.update('usr-008', { estado: 'bloqueado', motivoBloqueo: 'Prueba.' })

    const { tecnicos } = await obtenerMatriz()

    expect(tecnicos.map(({ id }) => id)).toEqual(['usr-009', JULIO, SANDRA])
  })
})

describe('habilitaciones.service · guardarMatriz', () => {
  it('deja a cada técnico enviado con las categorías indicadas y no toca a los demás', async () => {
    const matriz = await guardarMatriz({ [JULIO]: ['cat-01', 'cat-06'], [SANDRA]: [] }, SUPERVISORA)

    expect(habilitadasDe(JULIO)).toEqual(['cat-01', 'cat-06'])
    expect(habilitadasDe(SANDRA)).toEqual([])
    expect(habilitadasDe('usr-009')).toEqual(['cat-04', 'cat-05', 'cat-07'])
    expect(matriz.tecnicos.find(({ id }) => id === JULIO).habilitadas).toEqual(['cat-01', 'cat-06'])
    expect(readTable('habilitaciones').filter(({ tecnicoId }) => tecnicoId === JULIO)).toHaveLength(2)
  })

  it('no duplica una habilitación que ya existe', async () => {
    await guardarMatriz({ [JULIO]: ['cat-01', 'cat-01', 'cat-02', 'cat-07'] }, SUPERVISORA)

    expect(habilitacionesRepository.findAll({ tecnicoId: JULIO })).toHaveLength(3)
    expect(readTable('habilitaciones')).toHaveLength(10)
  })

  it('rechaza técnicos que no están activos y categorías que no existen, sin guardar nada', async () => {
    const usuario = await fallo(guardarMatriz({ 'usr-001': ['cat-01'] }, SUPERVISORA))
    expect(usuario).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })

    const categoria = await fallo(guardarMatriz({ [JULIO]: ['cat-01'], [SANDRA]: ['cat-99'] }, SUPERVISORA))
    expect(categoria).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(habilitadasDe(JULIO)).toEqual(['cat-01', 'cat-02', 'cat-07'])
  })

  it('solo un supervisor activo puede guardar la matriz', async () => {
    expect(await fallo(guardarMatriz({ [JULIO]: [] }, JULIO))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(habilitadasDe(JULIO)).toHaveLength(3)
  })
})
