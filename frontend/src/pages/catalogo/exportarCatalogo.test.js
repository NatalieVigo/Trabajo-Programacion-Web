import { describe, expect, it } from 'vitest'
import { catalogoACsv, nombreDelArchivo } from './exportarCatalogo.js'

const catalogo = [
  {
    tipo: 'categoria',
    nombre: 'Climatización',
    prioridadPorDefecto: 'alta',
    tiempoEsperadoHoras: 8,
    ticketsEnCurso: 1,
    activa: false,
    subcategorias: [
      {
        tipo: 'subcategoria',
        nombre: 'Aire "sin" frío, sala',
        prioridadPorDefecto: 'critica',
        tiempoEsperadoHoras: 2,
        ticketsEnCurso: 0,
        activa: true,
        disponible: false,
      },
    ],
  },
]

describe('exportarCatalogo', () => {
  it('arma un CSV con una fila por categoría y por subcategoría', () => {
    expect(catalogoACsv(catalogo).split('\r\n')).toEqual([
      'Tipo,Categoría,Subcategoría,Prioridad,Tiempo esperado (horas),Tickets en curso,Estado',
      'Categoría,Climatización,,Alta,8,1,Inactiva',
      'Subcategoría,Climatización,"Aire ""sin"" frío, sala",Crítica,2,0,Activa (categoría inactiva)',
    ])
  })

  it('nombra el archivo con la fecha de Lima', () => {
    expect(nombreDelArchivo(new Date('2026-10-06T03:00:00.000Z'))).toBe('catalogo-servicios-2026-10-05.csv')
  })
})
