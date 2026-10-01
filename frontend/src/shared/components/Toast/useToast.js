import { useContext } from 'react'
import { ToastContext } from './ToastContext.js'

/** Notifica el resultado de una operación: toast.success(msg), toast.error(msg), toast.warning(msg), toast.info(msg). */
export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>.')
  }
  return toast
}
