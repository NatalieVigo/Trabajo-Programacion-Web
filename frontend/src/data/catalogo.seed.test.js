import { describe, expect, it } from 'vitest'
import {
  ambientesRepository,
  categoriasRepository,
  habilitacionesRepository,
  pabellonesRepository,
  sedesRepository,
  subcategoriasRepository,
} from '../repositories/catalogo.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { claveDeNombre, validateCategoria } from '../utils/catalogoValidators.js'

const TIPOS_AMBIENTE = ['aula', 'laboratorio', 'auditorio', 'oficina', 'biblioteca']

const unicos = (valores) => new Set(valores).size === valores.length

// Valida que las tablas del catálogo (HU-2) del seed cumplan sus reglas y se refieran a datos que existen.
describe('datos semilla · catálogo de servicios', () => {
  it('las categorías y subcategorías cumplen las reglas del formulario', () => {
    const categorias = categoriasRepository.findAll()
    const ids = categorias.map((categoria) => categoria.id)

    expect(unicos(categorias.map((categoria) => claveDeNombre(categoria.nombre)))).toBe(true)
    for (const categoria of categorias) {
      expect(validateCategoria({ ...categoria, categoriaId: '' })).toEqual({})
      expect(typeof categoria.activa).toBe('boolean')
    }
    for (const subcategoria of subcategoriasRepository.findAll()) {
      expect(validateCategoria(subcategoria, { categorias: ids })).toEqual({})
      expect(typeof subcategoria.activa).toBe('boolean')
    }
  })

  it('cada categoría tiene subcategorías sin nombres repetidos y una de ellas está inactiva', () => {
    const subcategorias = subcategoriasRepository.findAll()

    expect(subcategorias).toHaveLength(20)
    for (const categoria of categoriasRepository.findAll()) {
      const propias = subcategorias.filter((subcategoria) => subcategoria.categoriaId === categoria.id)
      expect(propias.length).toBeGreaterThanOrEqual(2)
      expect(unicos(propias.map((subcategoria) => claveDeNombre(subcategoria.nombre)))).toBe(true)
    }
    expect(subcategorias.filter((subcategoria) => !subcategoria.activa).map((subcategoria) => subcategoria.nombre)).toEqual([
      'Calefacción sin funcionar',
    ])
  })

  it('cada ambiente pertenece a un pabellón de una sede, con piso, capacidad y tipo válidos', () => {
    const sedes = sedesRepository.findAll()
    const pabellones = pabellonesRepository.findAll()
    const ambientes = ambientesRepository.findAll()

    expect(sedes.map((sede) => sede.nombre)).toEqual(['Campus Monterrico'])
    expect(pabellones).toHaveLength(9)
    pabellones.forEach((pabellon) => expect(sedesRepository.findById(pabellon.sedeId)).not.toBeNull())
    expect(unicos(ambientes.map((ambiente) => ambiente.codigo))).toBe(true)
    for (const ambiente of ambientes) {
      expect(pabellonesRepository.findById(ambiente.pabellonId)).not.toBeNull()
      expect(TIPOS_AMBIENTE).toContain(ambiente.tipo)
      expect(Number.isInteger(ambiente.piso) && ambiente.piso >= -3 && ambiente.piso <= 20).toBe(true)
      expect(Number.isInteger(ambiente.capacidad) && ambiente.capacidad >= 1 && ambiente.capacidad <= 1000).toBe(true)
      expect(ambiente).not.toHaveProperty('pabellon')
      expect(ambiente).not.toHaveProperty('sede')
    }
    expect(ambientesRepository.findOne({ codigo: 'A-201' })).toMatchObject({ pabellonId: 'pab-01', piso: 2, capacidad: 68 })
  })

  it('las habilitaciones son de técnicos activos e incluyen la especialidad que cada uno declaró', () => {
    const habilitaciones = habilitacionesRepository.findAll()

    expect(unicos(habilitaciones.map(({ tecnicoId, categoriaId }) => `${tecnicoId}|${categoriaId}`))).toBe(true)
    for (const { tecnicoId, categoriaId } of habilitaciones) {
      expect(usuariosRepository.findById(tecnicoId)).toMatchObject({ rol: 'tecnico', estado: 'activo' })
      expect(categoriasRepository.findById(categoriaId)).not.toBeNull()
    }
    for (const tecnico of usuariosRepository.findAll({ rol: 'tecnico' })) {
      const habilitadas = habilitaciones.filter(({ tecnicoId }) => tecnicoId === tecnico.id).map(({ categoriaId }) => categoriaId)
      expect(habilitadas).toEqual(expect.arrayContaining(tecnico.especialidades))
    }
    expect(habilitacionesRepository.findAll({ tecnicoId: 'usr-002' }).map(({ categoriaId }) => categoriaId)).toEqual([
      'cat-01',
      'cat-02',
      'cat-07',
    ])
  })
})
