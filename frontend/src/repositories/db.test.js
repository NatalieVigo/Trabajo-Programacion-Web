import { describe, expect, it } from 'vitest'
import seed from '../data/seed.json'
import { DB_STORAGE_KEY, DB_VERSION, readTable, resetDb, writeTable } from './db.js'

const storedDb = () => JSON.parse(localStorage.getItem(DB_STORAGE_KEY))

describe('db (base simulada en localStorage)', () => {
  it('siembra la base desde seed.json en la primera lectura', () => {
    localStorage.clear()

    const usuarios = readTable('usuarios')

    expect(usuarios).toEqual(seed.usuarios)
    expect(storedDb().version).toBe(DB_VERSION)
    usuarios[0].nombres = 'Modificado'
    expect(seed.usuarios[0].nombres).toBe('Camila Alejandra')
  })

  it('persiste lo que se escribe en una tabla', () => {
    writeTable('categorias', [])

    expect(readTable('categorias')).toEqual([])
    expect(storedDb().categorias).toEqual([])
    expect(readTable('ambientes')).toHaveLength(seed.ambientes.length)
  })

  it('devuelve copias: modificar el resultado no altera la base', () => {
    readTable('usuarios')[0].nombres = 'Otro nombre'

    expect(readTable('usuarios')[0].nombres).toBe('Camila Alejandra')
  })

  it('resetDb vuelve a los datos semilla', () => {
    writeTable('usuarios', [])

    resetDb()

    expect(readTable('usuarios')).toEqual(seed.usuarios)
  })

  it('vuelve a sembrar cuando la versión guardada es distinta', () => {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify({ ...seed, version: DB_VERSION + 1, usuarios: [] }))

    expect(readTable('usuarios')).toHaveLength(seed.usuarios.length)
    expect(storedDb().version).toBe(DB_VERSION)
  })

  it('vuelve a sembrar cuando lo guardado está corrupto o incompleto', () => {
    localStorage.setItem(DB_STORAGE_KEY, '{esto no es JSON')
    expect(readTable('categorias')).toEqual(seed.categorias)

    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify({ version: DB_VERSION, usuarios: [] }))
    expect(readTable('usuarios')).toEqual(seed.usuarios)
  })

  it('rechaza tablas desconocidas', () => {
    expect(() => readTable('pagos')).toThrow('Tabla desconocida')
    expect(() => writeTable('pagos', [])).toThrow('Tabla desconocida')
  })
})
