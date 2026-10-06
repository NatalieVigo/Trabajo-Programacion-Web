import { useCallback } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData.js'

/**
 * useAsyncData más `refrescar()`: vuelve a pedir los datos tras una escritura sin pasar por «cargando», para que la
 * tabla no desaparezca mientras tanto (y el foco no se pierda). Si la nueva lectura falla, recarga como siempre.
 */
export function useConsultaRefrescable(loader) {
  const consulta = useAsyncData(loader)
  const { updateData, reload } = consulta

  const refrescar = useCallback(async () => {
    try {
      const datos = await loader()
      updateData(() => datos)
    } catch {
      reload()
    }
  }, [loader, updateData, reload])

  return { ...consulta, refrescar }
}
