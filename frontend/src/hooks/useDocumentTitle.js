import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = `${title} · Mesa de Ayuda`
  }, [title])
}
