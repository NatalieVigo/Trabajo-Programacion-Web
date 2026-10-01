import { useContext } from 'react'
import { ConfirmContext } from './ConfirmContext.js'

/**
 * Pide confirmación antes de una acción:
 * `const ok = await confirm({ title, message, confirmText, cancelText, variant: 'destructive' })`.
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>.')
  }
  return confirm
}
