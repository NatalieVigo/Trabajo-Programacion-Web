import { useContext } from 'react'
import { ConfirmContext } from './ConfirmContext.js'

// uso: const ok = await confirm({ title, message, variant: 'destructive' })
export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>.')
  }
  return confirm
}
