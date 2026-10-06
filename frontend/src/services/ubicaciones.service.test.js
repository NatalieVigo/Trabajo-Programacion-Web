import { describe, expect, it } from 'vitest'
import { ambientesRepository, pabellonesRepository, sedesRepository } from '../repositories/catalogo.repository.js'
import { readTable } from '../repositories/db.js'
import { CATALOGO_MESSAGES } from '../utils/catalogoValidators.js'
import {
  actualizarAmbiente,
  actualizarPabellon,
  actualizarSede,
  crearAmbiente,
  crearPabellon,
  crearSede,
  eliminarAmbiente,
  eliminarPabellon,
  eliminarSede,
  listarAmbientes,
  listarSedes,
} from './ubicaciones.service.js'

const SUPERVISORA = 'usr-003'
const TECNICO = 'usr-002'

const laboratorio = { codigo: ' h-212 ', tipo: 'laboratorio', nombre: '', pabellonId: 'pab-04', piso: '2', capacidad: '30' }

const fallo = (promise) => promise.catch((error) => error)

describe('ubicaciones.service · sedes y pabellones', () => {
  it('lista las sedes con sus pabellones por nombre y cuántos ambientes tiene cada uno', async () => {
    const [monterrico] = await listarSedes()

    expect(monterrico).toMatchObject({ id: 'sed-01', nombre: 'Campus Monterrico', ambientes: 11, eliminable: false })
    expect(monterrico.pabellones.map((pabellon) => pabellon.nombre)).toEqual([
      'A',
      'Biblioteca',
      'C',
      'Central',
      'E',
      'H',
      'L',
      'N',
      'Q',
    ])
    expect(monterrico.pabellones[0]).toEqual({ id: 'pab-01', sedeId: 'sed-01', nombre: 'A', ambientes: 2, eliminable: false })
  })

  it('crea, renombra y elimina una sede sin pabellones', async () => {
    await expect(crearSede({ nombre: '  Campus   San Isidro ' }, SUPERVISORA)).resolves.toEqual({
      id: 'sed-02',
      nombre: 'Campus San Isidro',
    })
    await expect(actualizarSede('sed-02', { nombre: 'Local San Isidro' }, SUPERVISORA)).resolves.toEqual({
      id: 'sed-02',
      nombre: 'Local San Isidro',
    })
    await expect(eliminarSede('sed-02', SUPERVISORA)).resolves.toMatchObject({ id: 'sed-02' })
    expect(sedesRepository.findById('sed-02')).toBeNull()
  })

  it('no repite el nombre de una sede y no elimina una sede con pabellones', async () => {
    const repetida = await fallo(crearSede({ nombre: 'campus monterrico' }, SUPERVISORA))
    expect(repetida).toMatchObject({ status: 409, code: 'NAME_TAKEN', fieldErrors: { nombre: CATALOGO_MESSAGES.sedeTaken } })

    const enUso = await fallo(eliminarSede('sed-01', SUPERVISORA))
    expect(enUso).toMatchObject({
      status: 409,
      code: 'IN_USE',
      message: 'No se puede eliminar «Campus Monterrico»: tiene 9 pabellones.',
      details: { usos: { pabellones: 9 } },
    })
    expect(readTable('sedes')).toHaveLength(1)
  })

  it('crea un pabellón en una sede, sin repetir su nombre dentro de ella', async () => {
    const { id: sedeId } = await crearSede({ nombre: 'Campus San Isidro' }, SUPERVISORA)

    await expect(crearPabellon({ sedeId: 'sed-01', nombre: 'J' }, SUPERVISORA)).resolves.toEqual({
      id: 'pab-10',
      sedeId: 'sed-01',
      nombre: 'J',
    })
    const repetido = await fallo(crearPabellon({ sedeId: 'sed-01', nombre: 'h' }, SUPERVISORA))
    expect(repetido).toMatchObject({ status: 409, fieldErrors: { nombre: CATALOGO_MESSAGES.pabellonTaken } })
    await expect(crearPabellon({ sedeId, nombre: 'H' }, SUPERVISORA)).resolves.toMatchObject({ sedeId, nombre: 'H' })
  })

  it('valida la sede del pabellón como lo haría el servidor', async () => {
    const error = await fallo(crearPabellon({ sedeId: 'sed-99', nombre: '' }, SUPERVISORA))

    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(error.fieldErrors).toEqual({
      sedeId: CATALOGO_MESSAGES.sedeUnknown,
      nombre: CATALOGO_MESSAGES.nombreRequired,
    })
  })

  it('edita un pabellón y solo elimina los que no tienen ambientes', async () => {
    await expect(actualizarPabellon('pab-02', { nombre: 'C (administrativo)' }, SUPERVISORA)).resolves.toMatchObject({
      nombre: 'C (administrativo)',
      sedeId: 'sed-01',
    })

    const enUso = await fallo(eliminarPabellon('pab-04', SUPERVISORA))
    expect(enUso).toMatchObject({
      status: 409,
      code: 'IN_USE',
      message: 'No se puede eliminar el pabellón «H»: tiene 2 ambientes.',
    })

    const { id } = await crearPabellon({ sedeId: 'sed-01', nombre: 'J' }, SUPERVISORA)
    await expect(eliminarPabellon(id, SUPERVISORA)).resolves.toMatchObject({ nombre: 'J' })
    expect(pabellonesRepository.findById(id)).toBeNull()
  })

  it('falla con 404 si no existe y con 403 si no es un supervisor', async () => {
    expect(await fallo(actualizarSede('sed-99', { nombre: 'X y Z' }, SUPERVISORA))).toMatchObject({
      status: 404,
      code: 'SEDE_NOT_FOUND',
    })
    expect(await fallo(eliminarPabellon('pab-99', SUPERVISORA))).toMatchObject({ status: 404, code: 'PABELLON_NOT_FOUND' })
    expect(await fallo(crearSede({ nombre: 'Campus San Isidro' }, TECNICO))).toMatchObject({ status: 403 })
    expect(await fallo(crearPabellon({ sedeId: 'sed-01', nombre: 'J' }, TECNICO))).toMatchObject({ status: 403 })
    expect(readTable('pabellones')).toHaveLength(9)
  })
})

describe('ubicaciones.service · ambientes', () => {
  it('lista los ambientes por código con su ubicación, tickets en curso y lo que impide eliminarlos', async () => {
    const ambientes = await listarAmbientes()

    expect(ambientes.map((ambiente) => ambiente.codigo)).toEqual([
      'A-201',
      'A-305',
      'AUD-CEN',
      'BIB-P2',
      'C-102',
      'E-304',
      'H-105',
      'H-210',
      'L-108',
      'N-402',
      'Q-101',
    ])
    expect(ambientes[0]).toEqual({
      id: 'amb-01',
      codigo: 'A-201',
      nombre: 'Aula A-201',
      tipo: 'aula',
      pabellonId: 'pab-01',
      piso: 2,
      capacidad: 68,
      pabellonNombre: 'A',
      sedeId: 'sed-01',
      sedeNombre: 'Campus Monterrico',
      ticketsEnCurso: 1,
      usos: { tickets: 3, usuarios: 1 },
      eliminable: false,
    })
    expect(ambientes.find((ambiente) => ambiente.codigo === 'C-102')).toMatchObject({
      usos: { tickets: 0, usuarios: 0 },
      eliminable: true,
    })
  })

  it('crea un ambiente con el código en mayúsculas y, sin nombre, lo arma con el tipo y el código', async () => {
    const creado = await crearAmbiente(laboratorio, SUPERVISORA)

    expect(creado).toMatchObject({
      id: 'amb-12',
      codigo: 'H-212',
      nombre: 'Laboratorio H-212',
      piso: 2,
      capacidad: 30,
      pabellonNombre: 'H',
      sedeNombre: 'Campus Monterrico',
      eliminable: true,
    })
    expect(ambientesRepository.findById('amb-12')).toEqual({
      id: 'amb-12',
      codigo: 'H-212',
      nombre: 'Laboratorio H-212',
      tipo: 'laboratorio',
      pabellonId: 'pab-04',
      piso: 2,
      capacidad: 30,
    })
    await expect(
      crearAmbiente({ ...laboratorio, codigo: 'H-213', nombre: '  Laboratorio   de Redes 2 ' }, SUPERVISORA),
    ).resolves.toMatchObject({ nombre: 'Laboratorio de Redes 2' })
  })

  it('no repite el código de un ambiente', async () => {
    const error = await fallo(crearAmbiente({ ...laboratorio, codigo: 'a-201' }, SUPERVISORA))

    expect(error).toMatchObject({ status: 409, code: 'CODE_TAKEN', fieldErrors: { codigo: CATALOGO_MESSAGES.codigoTaken } })
    expect(readTable('ambientes')).toHaveLength(11)
  })

  it('vuelve a validar los datos del ambiente como lo haría el servidor', async () => {
    const error = await fallo(
      crearAmbiente({ codigo: 'H 212', tipo: 'cafeteria', pabellonId: 'pab-99', piso: '30', capacidad: '0' }, SUPERVISORA),
    )

    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(error.fieldErrors).toEqual({
      codigo: CATALOGO_MESSAGES.codigoFormato,
      tipo: CATALOGO_MESSAGES.tipoRequired,
      pabellonId: CATALOGO_MESSAGES.pabellonUnknown,
      piso: CATALOGO_MESSAGES.pisoRango,
      capacidad: CATALOGO_MESSAGES.capacidadRango,
    })
  })

  it('edita solo los campos enviados y conserva su código si no cambia', async () => {
    await expect(actualizarAmbiente('amb-01', { capacidad: '70', piso: 2 }, SUPERVISORA)).resolves.toMatchObject({
      codigo: 'A-201',
      nombre: 'Aula A-201',
      capacidad: 70,
    })

    const error = await fallo(actualizarAmbiente('amb-01', { codigo: 'A-305' }, SUPERVISORA))
    expect(error).toMatchObject({ status: 409, code: 'CODE_TAKEN' })
    expect(ambientesRepository.findById('amb-01').codigo).toBe('A-201')
  })

  it('solo elimina los ambientes sin tickets ni usuarios que lo tengan como habitual', async () => {
    const enUso = await fallo(eliminarAmbiente('amb-01', SUPERVISORA))
    expect(enUso).toMatchObject({
      status: 409,
      code: 'IN_USE',
      message: 'No se puede eliminar «A-201»: tiene 3 tickets registrados y 1 usuario que lo tiene como ambiente habitual.',
      details: { usos: { tickets: 3, usuarios: 1 } },
    })

    await expect(eliminarAmbiente('amb-11', SUPERVISORA)).resolves.toMatchObject({ codigo: 'C-102' })
    expect(ambientesRepository.findById('amb-11')).toBeNull()
  })

  it('falla con 404 si no existe y con 403 si no es un supervisor', async () => {
    expect(await fallo(actualizarAmbiente('amb-99', { capacidad: '10' }, SUPERVISORA))).toMatchObject({
      status: 404,
      code: 'AMBIENTE_NOT_FOUND',
    })
    expect(await fallo(crearAmbiente(laboratorio, TECNICO))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(await fallo(eliminarAmbiente('amb-11', TECNICO))).toMatchObject({ status: 403 })
    expect(readTable('ambientes')).toHaveLength(11)
  })
})
