import seed from '../data/seed.json'

export const DB_STORAGE_KEY = 'mesa-ayuda:db'
export const DB_VERSION = seed.version

const TABLES = Object.keys(seed).filter((key) => key !== 'version')

const storage = resolveStorage()

function resolveStorage() {
  try {
    const probe = `${DB_STORAGE_KEY}:probe`
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    // Sin Web Storage (navegación privada estricta, cookies bloqueadas): los datos viven en memoria.
    const memory = new Map()
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)),
    }
  }
}

function createSeedDb() {
  return structuredClone(seed)
}

function isCurrentDb(db) {
  return db?.version === DB_VERSION && TABLES.every((table) => Array.isArray(db[table]))
}

function parseStoredDb() {
  try {
    return JSON.parse(storage.getItem(DB_STORAGE_KEY))
  } catch {
    return null
  }
}

function saveDb(db) {
  storage.setItem(DB_STORAGE_KEY, JSON.stringify(db))
  return db
}

/** Lee la base guardada; si no existe, está corrupta o es de otra versión, la vuelve a sembrar. */
function loadDb() {
  const stored = parseStoredDb()
  return isCurrentDb(stored) ? stored : saveDb(createSeedDb())
}

function assertTable(name) {
  if (!TABLES.includes(name)) {
    throw new Error(`Tabla desconocida: «${name}».`)
  }
}

/** Devuelve una copia de las filas de la tabla: modificarlas no altera la base. */
export function readTable(name) {
  assertTable(name)
  return loadDb()[name]
}

export function writeTable(name, rows) {
  assertTable(name)
  const db = loadDb()
  db[name] = rows
  saveDb(db)
}

export function resetDb() {
  saveDb(createSeedDb())
}
