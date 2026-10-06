import { describe, expect, it } from 'vitest'
import {
  categoriasRepository,
  habilitacionesRepository,
  subcategoriasRepository,
} from '../repositories/catalogo.repository.js'
import { readTable, writeTable } from '../repositories/db.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { CATALOGO_MESSAGES } from '../utils/catalogoValidators.js'
import { actualizar, crear, eliminar, listar, obtener } from './categorias.service.js'
import { ServiceError } from './ServiceError.js'

const SUPERVISORA = 'usr-003'
const TECNICO = 'usr-002'

const nueva = {
  nombre: '  Señalética   y rotulado ',
  categoriaId: '',
  prioridadPorDefecto: 'baja',
  tiempoEsperadoHoras: '48',
  descripcion: '  Letreros dañados o ausentes en pasillos y ambientes. ',
  activa: true,
}

const fallo = (promise) => promise.catch((error) => error)

/** Simula que HU-3 ya guarda la subcategoría de los tickets: el catálogo la lee si existe. */
function marcarSubcategoria(ticketId, subcategoriaId) {
  writeTable(
    'tickets',
    readTable('tickets').map((ticket) => (ticket.id === ticketId ? { ...ticket, subcategoriaId } : ticket)),
  )
}

describe('categorias.service · listar', () => {
  it('devuelve las categorías por nombre, cada una con sus subcategorías por nombre', async () => {
    const catalogo = await listar()

    expect(catalogo.map((categoria) => categoria.nombre)).toEqual([
      'Accesos y cerraduras',
      'Audiovisuales',
      'Climatización',
      'Eléctrico',
      'Limpieza',
      'Mobiliario',
      'Redes y conectividad',
    ])
    expect(catalogo[1].subcategorias.map((subcategoria) => subcategoria.nombre)).toEqual([
      'Audio sin señal',
      'Ecran atascado',
      'Imagen distorsionada',
      'Proyector no enciende',
    ])
  })

  it('cuenta los tickets en curso de cada categoría y lo que impide eliminarla', async () => {
    const [accesos, audiovisuales] = await listar()

    expect(audiovisuales).toMatchObject({
      tipo: 'categoria',
      id: 'cat-01',
      prioridadPorDefecto: 'alta',
      tiempoEsperadoHoras: 4,
      ticketsEnCurso: 2,
      usos: { tickets: 7, subcategorias: 4, especialidades: 2 },
      eliminable: false,
    })
    expect(accesos).toMatchObject({ ticketsEnCurso: 0, usos: { tickets: 0, subcategorias: 2, especialidades: 1 } })
    expect(audiovisuales.subcategorias[3]).toEqual({
      tipo: 'subcategoria',
      id: 'sub-01',
      categoriaId: 'cat-01',
      nombre: 'Proyector no enciende',
      descripcion: 'El proyector no prende o se apaga a los pocos minutos de uso.',
      activa: true,
      prioridadPorDefecto: 'critica',
      tiempoEsperadoHoras: 2,
      ticketsEnCurso: 0,
      usos: { tickets: 0 },
      eliminable: true,
    })
  })

  it('un ticket reabierto sigue en curso', async () => {
    writeTable(
      'tickets',
      readTable('tickets').map((ticket) => (ticket.id === 'tck-00103' ? { ...ticket, estado: 'reabierto' } : ticket)),
    )

    const [, audiovisuales] = await listar()

    expect(audiovisuales.ticketsEnCurso).toBe(3)
  })

  it('cuenta los tickets de una subcategoría cuando el ticket la indica', async () => {
    marcarSubcategoria('tck-00147', 'sub-01')

    const [, audiovisuales] = await listar()
    const proyector = audiovisuales.subcategorias.find((subcategoria) => subcategoria.id === 'sub-01')

    expect(proyector).toMatchObject({ ticketsEnCurso: 1, usos: { tickets: 1 }, eliminable: false })
  })
})

describe('categorias.service · obtener', () => {
  it('devuelve la categoría o la subcategoría con su tipo', async () => {
    await expect(obtener('cat-03')).resolves.toMatchObject({ tipo: 'categoria', nombre: 'Climatización' })
    await expect(obtener('sub-12')).resolves.toMatchObject({
      tipo: 'subcategoria',
      nombre: 'Luminaria apagada',
      categoriaId: 'cat-04',
    })
  })

  it('falla con 404 si no existe', async () => {
    const error = await fallo(obtener('cat-99'))

    expect(error).toBeInstanceOf(ServiceError)
    expect(error).toMatchObject({ status: 404, code: 'CATEGORY_NOT_FOUND' })
  })
})

describe('categorias.service · crear', () => {
  it('crea una categoría principal con los datos normalizados', async () => {
    const creada = await crear(nueva, SUPERVISORA)

    expect(creada).toEqual({
      tipo: 'categoria',
      id: 'cat-08',
      nombre: 'Señalética y rotulado',
      descripcion: 'Letreros dañados o ausentes en pasillos y ambientes.',
      activa: true,
      prioridadPorDefecto: 'baja',
      tiempoEsperadoHoras: 48,
      ticketsEnCurso: 0,
      usos: { tickets: 0, subcategorias: 0, especialidades: 0 },
      eliminable: true,
    })
    expect(categoriasRepository.findById('cat-08')).toEqual({
      id: 'cat-08',
      nombre: 'Señalética y rotulado',
      descripcion: 'Letreros dañados o ausentes en pasillos y ambientes.',
      activa: true,
      prioridadPorDefecto: 'baja',
      tiempoEsperadoHoras: 48,
    })
  })

  it('con una categoría padre crea una subcategoría de ella', async () => {
    const creada = await crear(
      { ...nueva, nombre: 'Cable HDMI dañado', categoriaId: 'cat-01', prioridadPorDefecto: 'alta', tiempoEsperadoHoras: 4 },
      SUPERVISORA,
    )

    expect(creada).toMatchObject({ tipo: 'subcategoria', id: 'sub-21', categoriaId: 'cat-01', tiempoEsperadoHoras: 4 })
    expect(subcategoriasRepository.findById('sub-21')).toMatchObject({ categoriaId: 'cat-01', nombre: 'Cable HDMI dañado' })
  })

  it('queda activa si no se indica lo contrario', async () => {
    const datos = { ...nueva }
    delete datos.activa

    await expect(crear(datos, SUPERVISORA)).resolves.toMatchObject({ activa: true })
    await expect(crear({ ...nueva, nombre: 'Jardinería', activa: false }, SUPERVISORA)).resolves.toMatchObject({
      activa: false,
    })
  })

  it('vuelve a validar los datos como lo haría el servidor', async () => {
    const error = await fallo(
      crear(
        {
          nombre: ' ',
          categoriaId: 'cat-99',
          prioridadPorDefecto: 'urgente',
          tiempoEsperadoHoras: '0',
          descripcion: 'x'.repeat(241),
          activa: 'sí',
        },
        SUPERVISORA,
      ),
    )

    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(error.fieldErrors).toEqual({
      nombre: CATALOGO_MESSAGES.nombreRequired,
      categoriaId: CATALOGO_MESSAGES.padreUnknown,
      prioridadPorDefecto: CATALOGO_MESSAGES.prioridadRequired,
      tiempoEsperadoHoras: CATALOGO_MESSAGES.horasPositivo,
      descripcion: CATALOGO_MESSAGES.descripcionMax,
      activa: 'Indica si está activa.',
    })
    expect(readTable('categorias')).toHaveLength(7)
    expect(readTable('subcategorias')).toHaveLength(20)
  })

  it('no repite el nombre de una categoría, sin distinguir mayúsculas ni tildes', async () => {
    const error = await fallo(crear({ ...nueva, nombre: 'CLIMATIZACION' }, SUPERVISORA))

    expect(error).toMatchObject({ status: 409, code: 'NAME_TAKEN', fieldErrors: { nombre: CATALOGO_MESSAGES.categoriaTaken } })
    expect(readTable('categorias')).toHaveLength(7)
  })

  it('no repite el nombre de una subcategoría dentro de su categoría, pero sí en otra', async () => {
    const error = await fallo(crear({ ...nueva, nombre: 'proyector NO enciende', categoriaId: 'cat-01' }, SUPERVISORA))

    expect(error).toMatchObject({ status: 409, code: 'NAME_TAKEN', fieldErrors: { nombre: CATALOGO_MESSAGES.subcategoriaTaken } })
    await expect(crear({ ...nueva, nombre: 'Proyector no enciende', categoriaId: 'cat-04' }, SUPERVISORA)).resolves.toMatchObject({
      categoriaId: 'cat-04',
    })
  })

  it('solo un supervisor activo puede crear', async () => {
    expect(await fallo(crear(nueva, TECNICO))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(await fallo(crear(nueva, 'usr-999'))).toMatchObject({ status: 403, code: 'FORBIDDEN' })

    usuariosRepository.update(SUPERVISORA, { estado: 'bloqueado', motivoBloqueo: 'Prueba.' })
    expect(await fallo(crear(nueva, SUPERVISORA))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(readTable('categorias')).toHaveLength(7)
  })
})

describe('categorias.service · actualizar', () => {
  it('cambia solo los campos enviados', async () => {
    const actualizada = await actualizar(
      'cat-03',
      { tiempoEsperadoHoras: '12', descripcion: ' Aire acondicionado y ventilación. ' },
      SUPERVISORA,
    )

    expect(actualizada).toMatchObject({
      tipo: 'categoria',
      nombre: 'Climatización',
      prioridadPorDefecto: 'alta',
      activa: true,
      tiempoEsperadoHoras: 12,
      descripcion: 'Aire acondicionado y ventilación.',
    })
    expect(categoriasRepository.findById('cat-03').tiempoEsperadoHoras).toBe(12)
  })

  it('una categoría puede conservar su nombre con otras mayúsculas, pero no tomar el de otra', async () => {
    await expect(actualizar('cat-03', { nombre: 'CLIMATIZACIÓN' }, SUPERVISORA)).resolves.toMatchObject({
      nombre: 'CLIMATIZACIÓN',
    })

    const error = await fallo(actualizar('cat-03', { nombre: 'audiovisuales' }, SUPERVISORA))
    expect(error).toMatchObject({ status: 409, code: 'NAME_TAKEN' })
  })

  it('una categoría principal no puede pasar a ser subcategoría', async () => {
    const error = await fallo(actualizar('cat-03', { categoriaId: 'cat-01' }, SUPERVISORA))

    expect(error).toMatchObject({ status: 400, fieldErrors: { categoriaId: CATALOGO_MESSAGES.padreNoPermitido } })
    expect(categoriasRepository.findById('cat-03')).not.toBeNull()
  })

  it('mueve una subcategoría a otra categoría, pero no la deja sin categoría', async () => {
    await expect(actualizar('sub-12', { categoriaId: 'cat-05' }, SUPERVISORA)).resolves.toMatchObject({
      tipo: 'subcategoria',
      categoriaId: 'cat-05',
    })

    const error = await fallo(actualizar('sub-12', { categoriaId: '' }, SUPERVISORA))
    expect(error).toMatchObject({ status: 400, fieldErrors: { categoriaId: CATALOGO_MESSAGES.padreRequired } })
    expect(subcategoriasRepository.findById('sub-12').categoriaId).toBe('cat-05')
  })

  it('al moverla, no repite un nombre de su nueva categoría', async () => {
    const error = await fallo(actualizar('sub-14', { categoriaId: 'cat-01', nombre: 'Audio sin señal' }, SUPERVISORA))

    expect(error).toMatchObject({ status: 409, fieldErrors: { nombre: CATALOGO_MESSAGES.subcategoriaTaken } })
    expect(subcategoriasRepository.findById('sub-14')).toMatchObject({ categoriaId: 'cat-05', nombre: 'Silla rota' })
  })

  it('falla con 404 si no existe y con 403 si no es un supervisor', async () => {
    expect(await fallo(actualizar('sub-99', { nombre: 'Otra' }, SUPERVISORA))).toMatchObject({ status: 404 })
    expect(await fallo(actualizar('cat-03', { nombre: 'Otra' }, TECNICO))).toMatchObject({ status: 403 })
    expect(categoriasRepository.findById('cat-03').nombre).toBe('Climatización')
  })
})

describe('categorias.service · eliminar', () => {
  it('elimina una subcategoría sin tickets', async () => {
    await expect(eliminar('sub-10', SUPERVISORA)).resolves.toEqual({
      id: 'sub-10',
      tipo: 'subcategoria',
      nombre: 'Calefacción sin funcionar',
    })
    expect(subcategoriasRepository.findById('sub-10')).toBeNull()
  })

  it('no elimina una categoría que se usa y explica por qué', async () => {
    const error = await fallo(eliminar('cat-01', SUPERVISORA))

    expect(error).toMatchObject({
      status: 409,
      code: 'IN_USE',
      message:
        'No se puede eliminar «Audiovisuales»: tiene 7 tickets registrados, 4 subcategorías y 2 técnicos que la ' +
        'declararon como especialidad. Puedes desactivarla en su lugar.',
      details: { usos: { tickets: 7, subcategorias: 4, especialidades: 2 } },
    })
    expect(categoriasRepository.findById('cat-01')).not.toBeNull()
  })

  it('una categoría se puede eliminar cuando ya no tiene subcategorías', async () => {
    const error = await fallo(eliminar('cat-06', SUPERVISORA))
    expect(error.message).toBe('No se puede eliminar «Limpieza»: tiene 2 subcategorías. Puedes desactivarla en su lugar.')

    await eliminar('sub-17', SUPERVISORA)
    await eliminar('sub-18', SUPERVISORA)

    await expect(eliminar('cat-06', SUPERVISORA)).resolves.toEqual({ id: 'cat-06', tipo: 'categoria', nombre: 'Limpieza' })
    expect(categoriasRepository.findById('cat-06')).toBeNull()
  })

  it('elimina con ella las habilitaciones de la categoría', async () => {
    const { id } = await crear(nueva, SUPERVISORA)
    habilitacionesRepository.insert({ id: 'hab-011', tecnicoId: TECNICO, categoriaId: id })

    await eliminar(id, SUPERVISORA)

    expect(habilitacionesRepository.findAll({ categoriaId: id })).toEqual([])
    expect(readTable('habilitaciones')).toHaveLength(10)
  })

  it('no elimina una subcategoría con tickets', async () => {
    marcarSubcategoria('tck-00147', 'sub-01')

    const error = await fallo(eliminar('sub-01', SUPERVISORA))

    expect(error).toMatchObject({
      status: 409,
      code: 'IN_USE',
      message: 'No se puede eliminar «Proyector no enciende»: tiene 1 ticket registrado. Puedes desactivarla en su lugar.',
    })
    expect(subcategoriasRepository.findById('sub-01')).not.toBeNull()
  })

  it('falla con 404 si no existe y con 403 si no es un supervisor', async () => {
    expect(await fallo(eliminar('cat-99', SUPERVISORA))).toMatchObject({ status: 404, code: 'CATEGORY_NOT_FOUND' })
    expect(await fallo(eliminar('sub-10', TECNICO))).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(subcategoriasRepository.findById('sub-10')).not.toBeNull()
  })
})
