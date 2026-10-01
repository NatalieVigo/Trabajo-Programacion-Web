import { useRef } from 'react'
import Button from '../Button/Button.jsx'
import Modal from '../Modal/Modal.jsx'

/** Confirmación (p23). «Cancelar» recibe el foco inicial; una acción destructiva usa el botón rojo. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null)

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      role="alertdialog"
      size="sm"
      initialFocusRef={cancelRef}
      showCloseButton={false}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'primary'} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    />
  )
}
