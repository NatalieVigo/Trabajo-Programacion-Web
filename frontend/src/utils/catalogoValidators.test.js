import { describe, expect, it } from 'vitest'
import {
  CATALOGO_MESSAGES,
  claveDeNombre,
  normalizeCodigo,
  parseHoras,
  validateAmbiente,
  validateCapacidad,
  validateCategoria,
  validateCodigoAmbiente,
  validateDescripcion,
  validateHoras,
  validateNombreAmbiente,
  validateNombreCatalogo,
  validatePabellon,
  validatePadre,
  validatePiso,
  validatePrioridad,
  validateSede,
  validateTipoAmbiente,
} from './catalogoValidators.js'

describe('catalogoValidators · ubicaciones', () => {
  it.each([
    ['', CATALOGO_MESSAGES.codigoRequired],
    ['A 201', CATALOGO_MESSAGES.codigoFormato],
    ['A--201', CATALOGO_MESSAGES.codigoFormato],
    ['-A201', CATALOGO_MESSAGES.codigoFormato],
    ['AULA-MAGNA-E3', CATALOGO_MESSAGES.codigoLength],
    [' h-212 ', null],
    ['BIB-P2', null],
    ['AUD-CEN', null],
  ])('código %j → %s', (valor, mensaje) => {
    expect(validateCodigoAmbiente(valor)).toBe(mensaje)
  })

  it('guarda el código en mayúsculas y sin espacios alrededor', () => {
    expect(normalizeCodigo(' h-212 ')).toBe('H-212')
  })

  it('acepta solo los tipos de ambiente del catálogo', () => {
    expect(validateTipoAmbiente('')).toBe(CATALOGO_MESSAGES.tipoRequired)
    expect(validateTipoAmbiente('cafeteria')).toBe(CATALOGO_MESSAGES.tipoRequired)
    for (const tipo of ['aula', 'laboratorio', 'auditorio', 'oficina', 'biblioteca']) {
      expect(validateTipoAmbiente(tipo)).toBeNull()
    }
  })

  it('el nombre de un ambiente es opcional, pero si se escribe sigue las reglas', () => {
    expect(validateNombreAmbiente('')).toBeNull()
    expect(validateNombreAmbiente('  ')).toBeNull()
    expect(validateNombreAmbiente('A')).toBe(CATALOGO_MESSAGES.nombreLength)
    expect(validateNombreAmbiente('Laboratorio de Redes')).toBeNull()
  })

  it.each([
    ['', CATALOGO_MESSAGES.pisoRequired],
    ['-4', CATALOGO_MESSAGES.pisoRango],
    ['21', CATALOGO_MESSAGES.pisoRango],
    ['1.5', CATALOGO_MESSAGES.pisoRango],
    ['dos', CATALOGO_MESSAGES.pisoRango],
    ['-3', null],
    ['0', null],
    [20, null],
  ])('piso %j → %s', (valor, mensaje) => {
    expect(validatePiso(valor)).toBe(mensaje)
  })

  it.each([
    ['', CATALOGO_MESSAGES.capacidadRequired],
    ['0', CATALOGO_MESSAGES.capacidadRango],
    ['1001', CATALOGO_MESSAGES.capacidadRango],
    ['1', null],
    [' 420 ', null],
  ])('capacidad %j → %s', (valor, mensaje) => {
    expect(validateCapacidad(valor)).toBe(mensaje)
  })

  it('valida sedes, pabellones y ambientes con las listas que pasa el servicio', () => {
    expect(validateSede({ nombre: '' })).toEqual({ nombre: CATALOGO_MESSAGES.nombreRequired })
    expect(validateSede({ nombre: 'Campus San Isidro' })).toEqual({})

    expect(validatePabellon({ sedeId: '', nombre: ' ' })).toEqual({
      sedeId: CATALOGO_MESSAGES.sedeRequired,
      nombre: CATALOGO_MESSAGES.nombreRequired,
    })
    expect(validatePabellon({ sedeId: 'sed-01', nombre: 'J' })).toEqual({})
    expect(validatePabellon({ sedeId: 'sed-01', nombre: 'x'.repeat(31) })).toEqual({
      nombre: CATALOGO_MESSAGES.pabellonLength,
    })
    expect(validatePabellon({ sedeId: 'sed-09', nombre: 'Jardín' }, { sedes: ['sed-01'] })).toEqual({
      sedeId: CATALOGO_MESSAGES.sedeUnknown,
    })

    const ambiente = { codigo: 'H-212', tipo: 'laboratorio', nombre: '', pabellonId: 'pab-04', piso: '2', capacidad: '30' }
    expect(validateAmbiente(ambiente, { pabellones: ['pab-04'] })).toEqual({})
    expect(validateAmbiente({ ...ambiente, pabellonId: 'pab-99' }, { pabellones: ['pab-04'] })).toEqual({
      pabellonId: CATALOGO_MESSAGES.pabellonUnknown,
    })
    expect(validateAmbiente({ codigo: '', tipo: '', nombre: '', pabellonId: '', piso: '', capacidad: '' })).toEqual({
      codigo: CATALOGO_MESSAGES.codigoRequired,
      tipo: CATALOGO_MESSAGES.tipoRequired,
      pabellonId: CATALOGO_MESSAGES.pabellonRequired,
      piso: CATALOGO_MESSAGES.pisoRequired,
      capacidad: CATALOGO_MESSAGES.capacidadRequired,
    })
  })
})

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
