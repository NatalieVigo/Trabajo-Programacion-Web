import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Id de la sección a partir del hash; un hash mal codificado (/#%) se usa tal cual en lugar de romper la página. */
function sectionIdFromHash(hash) {
  const raw = hash.slice(1)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Al navegar lleva la vista a la sección del hash (/#categorias) o, si no hay hash, al inicio. */
export function useScrollToHash() {
  const { hash, key } = useLocation()

  useEffect(() => {
    const target = hash ? document.getElementById(sectionIdFromHash(hash)) : null
    if (!target) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      return
    }
    target.scrollIntoView?.({ block: 'start' })
    target.focus({ preventScroll: true })
  }, [hash, key])
}
