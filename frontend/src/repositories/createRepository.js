import { readTable, writeTable } from './db.js'

/** `filter` puede ser un predicado o un objeto de igualdades: { rol: 'tecnico', estado: 'activo' }. */
function matches(row, filter) {
  if (!filter) return true
  if (typeof filter === 'function') return filter(row)
  return Object.entries(filter).every(([field, value]) => row[field] === value)
}

/** CRUD genérico sobre una tabla de la base simulada. Sin reglas de negocio: eso vive en los servicios. */
export function createRepository(table) {
  const findAll = (filter) => readTable(table).filter((row) => matches(row, filter))
  const findOne = (filter) => readTable(table).find((row) => matches(row, filter)) ?? null
  const findById = (id) => findOne((row) => row.id === id)

  function insert(row) {
    if (!row?.id) {
      throw new Error(`El registro de «${table}» necesita un id.`)
    }
    const rows = readTable(table)
    if (rows.some((current) => current.id === row.id)) {
      throw new Error(`Ya existe un registro con id «${row.id}» en «${table}».`)
    }
    writeTable(table, [...rows, row])
    return row
  }

  function update(id, patch) {
    const rows = readTable(table)
    const index = rows.findIndex((row) => row.id === id)
    if (index === -1) return null
    const updated = { ...rows[index], ...patch, id }
    writeTable(table, rows.with(index, updated))
    return updated
  }

  function remove(id) {
    const rows = readTable(table)
    const remaining = rows.filter((row) => row.id !== id)
    if (remaining.length === rows.length) return false
    writeTable(table, remaining)
    return true
  }

  return { findAll, findOne, findById, insert, update, remove }
}

export function createReadOnlyRepository(table) {
  const { findAll, findOne, findById } = createRepository(table)
  return { findAll, findOne, findById }
}
