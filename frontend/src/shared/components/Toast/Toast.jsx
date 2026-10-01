import { useEffect, useState } from 'react'
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from '../icons.jsx'

const VARIANTS = {
  success: { label: 'Éxito', Icon: CheckIcon },
  error: { label: 'Error', Icon: AlertIcon },
  warning: { label: 'Advertencia', Icon: AlertIcon },
  info: { label: 'Información', Icon: InfoIcon },
}

/** Notificación (p35). Se cierra sola a los 5 s; el temporizador se pausa con el puntero o el foco encima. */
export default function Toast({ id, type, message, duration, onDismiss }) {
  const [paused, setPaused] = useState(false)
  const { label, Icon } = VARIANTS[type] ?? VARIANTS.info

  useEffect(() => {
    if (paused || !duration) return undefined
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, paused, onDismiss])

  return (
    <div
      className={`toast toast--${type}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="toast__icon" />
      <p className="toast__message">
        <span className="visually-hidden">{label}: </span>
        {message}
      </p>
      <button type="button" className="toast__close" onClick={() => onDismiss(id)} aria-label="Cerrar notificación">
        <CloseIcon />
      </button>
    </div>
  )
}
