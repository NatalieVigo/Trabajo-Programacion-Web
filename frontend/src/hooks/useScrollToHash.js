import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// si el hash viene mal codificado (/#%) se usa tal cual
function sectionIdFromHash(hash) {
  const raw = hash.slice(1)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

// Sin hash, sube al inicio de la página.
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
