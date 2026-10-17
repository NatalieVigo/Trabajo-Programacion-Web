import { useCallback } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData.js'

// refrescar() no pasa por "cargando", así la tabla no desaparece ni se pierde el foco
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
