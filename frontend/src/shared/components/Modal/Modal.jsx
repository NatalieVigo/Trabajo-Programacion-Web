import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../../utils/classNames.js'
import { CloseIcon } from '../icons.jsx'
import './Modal.css'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const getFocusable = (container) => [...container.querySelectorAll(FOCUSABLE_SELECTOR)]

/**
 * Diálogo modal accesible: se monta en un portal, enfoca el primer control (o `initialFocusRef`),
 * mantiene el foco dentro, se cierra con Esc o con clic en el fondo y devuelve el foco al cerrar.
 */
export default function Modal({ open, ...props }) {
  if (!open) return null
  return createPortal(<ModalDialog {...props} />, document.body)
}

function ModalDialog({
  title,
  description,
  children,
  footer,
  onClose,
  role = 'dialog',
  size = 'md',
  initialFocusRef,
  showCloseButton = true,
  closeOnOverlayClick = true,
}) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const initialTarget = initialFocusRef?.current ?? getFocusable(dialog)[0] ?? dialog
    initialTarget.focus()
    return () => previouslyFocused?.focus?.()
  }, [initialFocusRef])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = getFocusable(dialogRef.current)
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first) {
      event.preventDefault()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    if (closeOnOverlayClick) onClose()
  }

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx('modal', `modal--${size}`)}
        onKeyDown={handleKeyDown}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          {showCloseButton && (
            <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
              <CloseIcon />
            </button>
          )}
        </div>
        {description && (
          <p id={descriptionId} className="modal__description">
            {description}
          </p>
        )}
        {children && <div className="modal__body">{children}</div>}
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
