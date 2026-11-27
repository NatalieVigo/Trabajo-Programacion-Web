import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'
import { resetDb } from '../repositories/db.js'
import { fetchSimulado } from './apiSimulada/index.js'

// jsdom no tiene scrollTo
window.scrollTo = () => {}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetDb()
  // en las pruebas no hay servidor: las llamadas a la API las responde el simulador
  vi.stubGlobal('fetch', fetchSimulado)
})
