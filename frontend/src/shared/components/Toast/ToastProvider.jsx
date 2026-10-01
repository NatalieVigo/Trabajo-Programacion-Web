import { useCallback, useMemo, useRef, useState } from 'react'
import Toast from './Toast.jsx'
import { ToastContext } from './ToastContext.js'
import './Toast.css'

const DEFAULT_DURATION_MS = 5000
const MAX_VISIBLE = 4

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const lastId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((type, message, { duration = DEFAULT_DURATION_MS } = {}) => {
    lastId.current += 1
    const id = lastId.current
    setToasts((current) => [...current, { id, type, message, duration }].slice(-MAX_VISIBLE))
    return id
  }, [])

  const toast = useMemo(
    () => ({
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      warning: (message, options) => show('warning', message, options),
      info: (message, options) => show('info', message, options),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext value={toast}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="false" aria-label="Notificaciones">
        {toasts.map((item) => (
          <Toast key={item.id} {...item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  )
}
