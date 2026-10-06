import { describe, expect, it } from 'vitest'
import { CATALOGO_SIN_FILTROS, coincideBusqueda, contarFilas, filtrarCatalogo, paginar } from './catalogoList.js'

const sub = (id, nombre, prioridad, { activa = true, disponible = activa } = {}) => ({
  tipo: 'subcategoria',
  id,
  nombre,
  prioridadPorDefecto: prioridad,
  activa,
  disponible,
})

const catalogo = [
  {
    tipo: 'categoria',
    id: 'cat-01',
    nombre: 'Audiovisuales',
    prioridadPorDefecto: 'alta',
    activa: true,
    subcategorias: [sub('sub-01', 'Proyector no enciende', 'critica'), sub('sub-03', 'Audio sin señal', 'media')],
  },
  {
    tipo: 'categoria',
    id: 'cat-03',
    nombre: 'Climatización',
    prioridadPorDefecto: 'alta',
    activa: false,
    subcategorias: [sub('sub-08', 'Aire sin frío', 'alta', { disponible: false })],
  },
]

const nombres = (categorias) => categorias.flatMap((categoria) => [categoria.nombre, ...categoria.subcategorias.map((s) => s.nombre)])

describe('catalogoList', () => {
  it('sin filtros devuelve todo el catálogo', () => {
    expect(filtrarCatalogo(catalogo, CATALOGO_SIN_FILTROS)).toEqual(catalogo)
    expect(contarFilas(catalogo)).toBe(5)
  })

  it('al buscar una subcategoría muestra también su categoría, y al buscar una categoría, todas sus subcategorías', () => {
    expect(nombres(filtrarCatalogo(catalogo, { ...CATALOGO_SIN_FILTROS, busqueda: 'proyector' }))).toEqual([
      'Audiovisuales',
      'Proyector no enciende',
    ])
    expect(nombres(filtrarCatalogo(catalogo, { ...CATALOGO_SIN_FILTROS, busqueda: 'audiovisual' }))).toEqual([
      'Audiovisuales',
      'Proyector no enciende',
      'Audio sin señal',
    ])
    expect(nombres(filtrarCatalogo(catalogo, { ...CATALOGO_SIN_FILTROS, busqueda: 'senal' }))).toEqual([
      'Audiovisuales',
      'Audio sin señal',
    ])
  })

  it('«Solo activas» deja las categorías activas y las subcategorías disponibles', () => {
    expect(nombres(filtrarCatalogo(catalogo, { ...CATALOGO_SIN_FILTROS, soloActivas: true }))).toEqual([
      'Audiovisuales',
      'Proyector no enciende',
      'Audio sin señal',
    ])
  })

  it('la prioridad se aplica a cada fila y una categoría aparece por sus subcategorías', () => {
    expect(nombres(filtrarCatalogo(catalogo, { ...CATALOGO_SIN_FILTROS, prioridad: 'critica' }))).toEqual([
      'Audiovisuales',
      'Proyector no enciende',
    ])
    expect(nombres(filtrarCatalogo(catalogo, { ...CATALOGO_SIN_FILTROS, prioridad: 'alta' }))).toEqual([
      'Audiovisuales',
      'Climatización',
      'Aire sin frío',
    ])
    expect(filtrarCatalogo(catalogo, { ...CATALOGO_SIN_FILTROS, prioridad: 'baja' })).toEqual([])
  })

  it('pagina y ajusta la página si quedó fuera de rango', () => {
    const elementos = Array.from({ length: 12 }, (_, indice) => indice + 1)

    expect(paginar(elementos, 2, 10)).toEqual({ pagina: 2, totalPaginas: 2, visibles: [11, 12], desde: 11, hasta: 12 })
    expect(paginar(elementos, 5, 10).pagina).toBe(2)
    expect(paginar([], 1, 10)).toEqual({ pagina: 1, totalPaginas: 1, visibles: [], desde: 0, hasta: 0 })
  })

  it('busca cada palabra sin distinguir tildes ni mayúsculas', () => {
    expect(coincideBusqueda(['H-105', 'Laboratorio de cómputo'], 'LAB computo')).toBe(true)
    expect(coincideBusqueda(['H-105', 'Laboratorio de cómputo'], 'lab redes')).toBe(false)
    expect(coincideBusqueda(['A-201'], '  ')).toBe(true)
  })
})
