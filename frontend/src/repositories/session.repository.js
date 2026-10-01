export const SESSION_STORAGE_KEY = 'mesa-ayuda:sesion'

/** Web Storage del navegador o, si no está disponible (navegación privada estricta), un sustituto en memoria. */
function resolveStorage(name) {
  try {
    const storage = window[name]
    const probe = `${SESSION_STORAGE_KEY}:probe`
    storage.setItem(probe, probe)
    storage.removeItem(probe)
    return storage
  } catch {
    const memory = new Map()
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    }
  }
}

// «Recordarme en este equipo» guarda la sesión en localStorage; si no, dura lo que la pestaña (sessionStorage).
const rememberedStorage = resolveStorage('localStorage')
const tabStorage = resolveStorage('sessionStorage')

function parseSession(raw) {
  try {
    const session = JSON.parse(raw)
    const isValid = typeof session?.usuarioId === 'string' && typeof session.iniciadaEn === 'string'
    return isValid ? { usuarioId: session.usuarioId, iniciadaEn: session.iniciadaEn } : null
  } catch {
    return null
  }
}

/**
 * Sesión de este navegador: { usuarioId, iniciadaEn } bajo la clave `mesa-ayuda:sesion`. Solo guarda y lee:
 * auth.service decide cuándo una sesión es válida. En la entrega 2 guardará el token que emita la API.
 */
export const sessionRepository = {
  read() {
    return parseSession(tabStorage.getItem(SESSION_STORAGE_KEY)) ?? parseSession(rememberedStorage.getItem(SESSION_STORAGE_KEY))
  },

  save(session, { recordar = false } = {}) {
    sessionRepository.clear()
    const storage = recordar ? rememberedStorage : tabStorage
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  },

  clear() {
    rememberedStorage.removeItem(SESSION_STORAGE_KEY)
    tabStorage.removeItem(SESSION_STORAGE_KEY)
  },
}
