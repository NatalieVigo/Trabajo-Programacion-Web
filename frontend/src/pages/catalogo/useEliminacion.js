import { useState } from 'react'
import { useConfirm, useToast } from '../../shared/components'

/**
 * Eliminación con confirmación, común al catálogo: pregunta, llama al servicio, vuelve a leer los datos con
 * `refrescar` y notifica el resultado. Si el servicio responde que el elemento ya no existe (404) o que se usa (409),
 * muestra su mensaje y también vuelve a leer, porque los datos cambiaron en otro lado. `eliminandoId` indica qué fila
 * espera la respuesta. `eliminar` devuelve true si se eliminó.
 */
export function useEliminacion(refrescar) {
  const confirm = useConfirm()
  const toast = useToast()
  const [eliminandoId, setEliminandoId] = useState(null)

  async function eliminar({ id, titulo, mensaje, confirmText, eliminarEnServicio, exito }) {
    const confirmado = await confirm({ title: titulo, message: mensaje, confirmText, variant: 'destructive' })
    if (!confirmado) return false

    setEliminandoId(id)
    try {
      await eliminarEnServicio()
      await refrescar()
      toast.success(exito)
      return true
    } catch (error) {
      toast.error(error.message)
      if (error.status === 404 || error.status === 409) await refrescar()
      return false
    } finally {
      setEliminandoId(null)
    }
  }

  return { eliminandoId, eliminar }
}
