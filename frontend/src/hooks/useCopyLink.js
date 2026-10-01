import { useCallback } from 'react'
import { useToast } from '../shared/components'

const AVISO_MANUAL_MS = 15000

/**
 * Devuelve `copiar(enlace)`: lo copia al portapapeles y lo notifica. Si el navegador no lo permite (sin HTTPS o sin
 * permiso), la notificación muestra el enlace, durante más tiempo que de costumbre, para copiarlo a mano.
 */
export function useCopyLink() {
  const toast = useToast()

  return useCallback(
    async (enlace) => {
      try {
        await navigator.clipboard.writeText(enlace)
        toast.success('Enlace copiado al portapapeles.')
      } catch {
        toast.info(`No pudimos copiar el enlace. Cópialo manualmente: ${enlace}`, { duration: AVISO_MANUAL_MS })
      }
    },
    [toast],
  )
}
