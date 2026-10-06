import { describe, expect, it } from 'vitest'
import {
  CATALOGO_MESSAGES,
  claveDeNombre,
  parseHoras,
  validateCategoria,
  validateDescripcion,
  validateHoras,
  validateNombreCatalogo,
  validatePadre,
  validatePrioridad,
} from './catalogoValidators.js'

describe('catalogoValidators', () => {
  it('exige un nombre de 2 a 60 caracteres, sin contar espacios repetidos', () => {
    expect(validateNombreCatalogo('')).toBe(CATALOGO_MESSAGES.nombreRequired)
    expect(validateNombreCatalogo('   ')).toBe(CATALOGO_MESSAGES.nombreRequired)
    expect(validateNombreCatalogo(' A ')).toBe(CATALOGO_MESSAGES.nombreLength)
    expect(validateNombreCatalogo('x'.repeat(61))).toBe(CATALOGO_MESSAGES.nombreLength)
    expect(validateNombreCatalogo('  Redes   y conectividad ')).toBeNull()
    expect(validateNombreCatalogo('x'.repeat(60))).toBeNull()
  })

  it.each([
    ['', CATALOGO_MESSAGES.horasRequired],
    ['  ', CATALOGO_MESSAGES.horasRequired],
    ['0', CATALOGO_MESSAGES.horasPositivo],
    ['-3', CATALOGO_MESSAGES.horasPositivo],
    ['ocho', CATALOGO_MESSAGES.horasPositivo],
    ['2.5', CATALOGO_MESSAGES.horasEntero],
    ['721', CATALOGO_MESSAGES.horasMax],
    ['8', null],
    [' 720 ', null],
    [24, null],
  ])('tiempo esperado %j → %s', (valor, mensaje) => {
    expect(validateHoras(valor)).toBe(mensaje)
  })

  it('convierte el tiempo esperado del campo en número', () => {
    expect(parseHoras(' 48 ')).toBe(48)
    expect(parseHoras(8)).toBe(8)
  })

  it('acepta solo las cuatro prioridades', () => {
    expect(validatePrioridad('')).toBe(CATALOGO_MESSAGES.prioridadRequired)
    expect(validatePrioridad('urgente')).toBe(CATALOGO_MESSAGES.prioridadRequired)
    for (const prioridad of ['critica', 'alta', 'media', 'baja']) expect(validatePrioridad(prioridad)).toBeNull()
  })

  it('admite una descripción vacía o de hasta 240 caracteres', () => {
    expect(validateDescripcion(undefined)).toBeNull()
    expect(validateDescripcion('')).toBeNull()
    expect(validateDescripcion(` ${'x'.repeat(240)} `)).toBeNull()
    expect(validateDescripcion('x'.repeat(241))).toBe(CATALOGO_MESSAGES.descripcionMax)
  })

  it('la categoría padre es opcional y, con la lista, debe existir', () => {
    expect(validatePadre('')).toBeNull()
    expect(validatePadre(null, ['cat-01'])).toBeNull()
    expect(validatePadre('cat-99')).toBeNull()
    expect(validatePadre('cat-01', ['cat-01'])).toBeNull()
    expect(validatePadre('cat-99', ['cat-01'])).toBe(CATALOGO_MESSAGES.padreUnknown)
  })

  it('valida el formulario y devuelve solo los campos con error, como en el mockup p13', () => {
    const subcategoriaSinNombre = {
      nombre: '',
      categoriaId: 'cat-01',
      prioridadPorDefecto: 'critica',
      tiempoEsperadoHoras: '0',
      descripcion: 'Falla del extensor HDMI que impide proyectar aunque el equipo encienda.',
    }

    expect(validateCategoria(subcategoriaSinNombre, { categorias: ['cat-01'] })).toEqual({
      nombre: CATALOGO_MESSAGES.nombreRequired,
      tiempoEsperadoHoras: CATALOGO_MESSAGES.horasPositivo,
    })
    expect(validateCategoria({ ...subcategoriaSinNombre, nombre: 'Extensor HDMI', tiempoEsperadoHoras: '2' })).toEqual({})
  })

  it('compara nombres sin distinguir mayúsculas, tildes ni espacios repetidos', () => {
    expect(claveDeNombre('  Climatización ')).toBe(claveDeNombre('CLIMATIZACION'))
    expect(claveDeNombre('Redes  y conectividad')).toBe('redes y conectividad')
    expect(claveDeNombre('Señal')).not.toBe(claveDeNombre('Senal tenue'))
  })
})
