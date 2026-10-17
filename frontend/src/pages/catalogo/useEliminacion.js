import { useState } from 'react'
import { useConfirm, useToast } from '../../shared/components'

// Confirma, elimina y recarga. Si ya no existe o está en uso, también recarga.
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
