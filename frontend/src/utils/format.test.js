import { describe, expect, it } from 'vitest'
import {
  formatCountdown,
  formatDate,
  formatDateTime,
  formatPrioridad,
  formatRol,
  formatTelefono,
  formatTime,
  getDisplayName,
  getFirstName,
  getFullName,
  getInitials,
  pluralize,
} from './format.js'

describe('format', () => {
  it('formatea fechas y horas en hora de Lima', () => {
    const registro = '2026-09-30T13:12:00.000Z'

    expect(formatDate(registro)).toBe('30/09/2026')
    expect(formatTime(registro)).toBe('08:12')
    expect(formatDateTime(registro)).toBe('30/09/2026 08:12')
    expect(formatDate('2026-03-01T03:00:00.000Z')).toBe('28/02/2026')
  })

  it('devuelve un texto vacío para fechas ausentes o inválidas', () => {
    expect(formatDate(null)).toBe('')
    expect(formatTime('')).toBe('')
    expect(formatDateTime('no es fecha')).toBe('')
  })

  it('muestra una cuenta regresiva en minutos y segundos', () => {
    expect(formatCountdown(45)).toBe('0:45')
    expect(formatCountdown(5)).toBe('0:05')
    expect(formatCountdown(90)).toBe('1:30')
    expect(formatCountdown(0)).toBe('0:00')
  })

  it('agrupa el celular de 9 dígitos de tres en tres', () => {
    expect(formatTelefono('987654321')).toBe('987 654 321')
    expect(formatTelefono('987 654 321')).toBe('987 654 321')
    expect(formatTelefono('12345')).toBe('12345')
    expect(formatTelefono(null)).toBe('')
  })

  it('arma nombres e iniciales como en la cabecera', () => {
    const camila = { nombres: 'Camila Alejandra', apellidos: 'Quispe Ramos' }

    expect(getFirstName(camila.nombres)).toBe('Camila')
    expect(getInitials(camila.nombres, camila.apellidos)).toBe('CQ')
    expect(getInitials('lucía', 'mendoza ríos')).toBe('LM')
    expect(getFullName(camila)).toBe('Camila Alejandra Quispe Ramos')
    expect(getDisplayName(camila)).toBe('Camila Quispe Ramos')
  })

  it('usa el singular solo para una unidad', () => {
    expect(pluralize(1, 'ticket abierto', 'tickets abiertos')).toBe('1 ticket abierto')
    expect(pluralize(3, 'ticket abierto', 'tickets abiertos')).toBe('3 tickets abiertos')
    expect(pluralize(0, 'encuesta pendiente', 'encuestas pendientes')).toBe('0 encuestas pendientes')
  })

  it('traduce prioridades y roles a sus etiquetas', () => {
    expect(formatPrioridad('critica')).toBe('Crítica')
    expect(formatPrioridad('baja')).toBe('Baja')
    expect(formatRol('tecnico')).toBe('Técnico')
    expect(formatRol('desconocido')).toBe('desconocido')
  })
})
