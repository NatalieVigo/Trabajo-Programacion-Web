import { describe, expect, it } from 'vitest'
import { alternarHabilitacion, avisosDeCobertura, habilitadasDe, nombreCorto, tecnicosCambiados } from './matrizTecnicos.js'

const categorias = [
  { id: 'cat-07', nombre: 'Accesos y cerraduras', activa: true, ticketsEnCurso: 0 },
  { id: 'cat-03', nombre: 'Climatización', activa: true, ticketsEnCurso: 5 },
  { id: 'cat-06', nombre: 'Limpieza', activa: true, ticketsEnCurso: 0 },
  { id: 'cat-08', nombre: 'Jardinería', activa: false, ticketsEnCurso: 0 },
]

describe('matrizTecnicos', () => {
  it('arma y compara las categorías habilitadas de cada técnico', () => {
    const guardadas = habilitadasDe([
      { id: 'usr-002', habilitadas: ['cat-07'] },
      { id: 'usr-010', habilitadas: ['cat-03'] },
    ])

    expect(guardadas).toEqual({ 'usr-002': ['cat-07'], 'usr-010': ['cat-03'] })
    expect(tecnicosCambiados(guardadas, { ...guardadas })).toEqual([])
    expect(tecnicosCambiados(guardadas, { ...guardadas, 'usr-010': ['cat-03', 'cat-06'] })).toEqual(['usr-010'])
  })

  it('marca y desmarca una categoría en el orden de las columnas', () => {
    const habilitadas = { 'usr-002': ['cat-06'] }

    const conAccesos = alternarHabilitacion(habilitadas, 'usr-002', 'cat-07', categorias)
    expect(conAccesos['usr-002']).toEqual(['cat-07', 'cat-06'])
    expect(alternarHabilitacion(conAccesos, 'usr-002', 'cat-06', categorias)['usr-002']).toEqual(['cat-07'])
    expect(habilitadas['usr-002']).toEqual(['cat-06'])
  })

  it('avisa de las categorías activas sin técnicos o con más de dos tickets en curso por técnico', () => {
    const avisos = avisosDeCobertura(categorias, {
      'usr-002': ['cat-07', 'cat-03'],
      'usr-010': ['cat-03'],
    })

    expect(avisos).toEqual([
      {
        categoriaId: 'cat-03',
        variante: 'info',
        mensaje: 'Climatización tiene 2 técnicos habilitados y 5 tickets en curso. Considera habilitar a otro técnico.',
      },
      { categoriaId: 'cat-06', variante: 'warning', mensaje: 'Ningún técnico está habilitado para atender Limpieza.' },
    ])
    expect(avisosDeCobertura(categorias, { a: ['cat-07', 'cat-03', 'cat-06'], b: ['cat-03'], c: ['cat-03'] })).toEqual([])
  })

  it('acorta el nombre de la categoría para el encabezado', () => {
    expect(nombreCorto('Redes y conectividad')).toBe('Redes')
    expect(nombreCorto('Eléctrico')).toBe('Eléctrico')
  })
})
