import { describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY, sessionRepository } from './session.repository.js'

const sesion = { usuarioId: 'usr-001', iniciadaEn: '2026-10-01T15:00:00.000Z' }

describe('sessionRepository', () => {
  it('sin «recordar» guarda la sesión solo en la pestaña (sessionStorage)', () => {
    sessionRepository.save(sesion)

    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY))).toEqual(sesion)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionRepository.read()).toEqual(sesion)
  })

  it('con «recordar» la guarda en este equipo (localStorage) y reemplaza la de la pestaña', () => {
    sessionRepository.save({ ...sesion, usuarioId: 'usr-002' })

    sessionRepository.save(sesion, { recordar: true })

    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY))).toEqual(sesion)
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionRepository.read()).toEqual(sesion)
  })

  it('clear borra la sesión de ambos almacenamientos', () => {
    sessionRepository.save(sesion, { recordar: true })
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sesion))

    sessionRepository.clear()

    expect(sessionRepository.read()).toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it.each([['{esto no es JSON'], ['null'], [JSON.stringify({ usuarioId: 42 })], [JSON.stringify({ usuarioId: 'usr-001' })]])(
    'ignora una sesión guardada inválida: %s',
    (guardado) => {
      localStorage.setItem(SESSION_STORAGE_KEY, guardado)

      expect(sessionRepository.read()).toBeNull()
    },
  )

  it('solo devuelve los campos de la sesión', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...sesion, rol: 'supervisor' }))

    expect(sessionRepository.read()).toEqual(sesion)
  })
})
