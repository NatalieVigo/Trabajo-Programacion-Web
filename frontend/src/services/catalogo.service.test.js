import { afterEach, describe, expect, it, vi } from 'vitest'
import { DB_STORAGE_KEY, readTable, writeTable } from '../repositories/db.js'
import { listarAmbientes, listarCategorias, listarUnidades, listarVinculos } from './catalogo.service.js'
import { ServiceError } from './ServiceError.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('catalogo.service', () => {
  it('lista las siete categorías en el orden del catálogo', async () => {
    const categorias = await listarCategorias()

    expect(categorias.map((categoria) => categoria.nombre)).toEqual([
      'Audiovisuales',
      'Redes y conectividad',
      'Climatización',
      'Eléctrico',
      'Mobiliario',
      'Limpieza',
      'Accesos y cerraduras',
    ])
  })

  it('con soloActivas excluye las categorías inactivas', async () => {
    writeTable(
      'categorias',
      readTable('categorias').map((categoria) =>
        categoria.id === 'cat-06' ? { ...categoria, activa: false } : categoria,
      ),
    )

    const activas = await listarCategorias({ soloActivas: true })
    const todas = await listarCategorias()

    expect(activas).toHaveLength(6)
    expect(activas.map((categoria) => categoria.id)).not.toContain('cat-06')
    expect(todas).toHaveLength(7)
  })

  it('devuelve copias que no alteran la base', async () => {
    const [primera] = await listarCategorias()
    primera.nombre = 'Cambiada'

    const [deNuevo] = await listarCategorias()
    expect(deNuevo.nombre).toBe('Audiovisuales')
  })

  it('lista los ambientes ordenados por código', async () => {
    const codigos = (await listarAmbientes()).map((ambiente) => ambiente.codigo)

    expect(codigos).toHaveLength(11)
    expect(codigos).toEqual([...codigos].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })))
    expect(codigos).toContain('A-201')
    expect(codigos).toContain('H-210')
  })

  it('lista las unidades y los vínculos con la universidad', async () => {
    const unidades = await listarUnidades()

    expect(unidades).toHaveLength(15)
    expect(unidades[0]).toBe('Ingeniería de Sistemas')
    expect(unidades).toContain('Dirección de Infraestructura y Servicios')
    await expect(listarVinculos()).resolves.toEqual(['Estudiante', 'Docente', 'Personal administrativo', 'Egresado'])
  })

  it('responde con un error 500 si no puede leer la base', async () => {
    localStorage.removeItem(DB_STORAGE_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio disponible', 'QuotaExceededError')
    })

    const error = await listarCategorias().catch((reason) => reason)

    expect(error).toBeInstanceOf(ServiceError)
    expect(error.status).toBe(500)
  })
})
