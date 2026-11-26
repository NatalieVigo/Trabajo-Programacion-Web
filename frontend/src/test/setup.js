import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { resetDb } from '../repositories/db.js'

// jsdom no tiene scrollTo
window.scrollTo = () => {}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetDb()
})
