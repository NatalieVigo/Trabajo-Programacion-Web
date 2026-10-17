import { useId, useMemo } from 'react'
import { cx } from '../../../utils/classNames.js'
import { FormFieldContext } from './FormFieldContext.js'
import './FormField.css'

// required solo lo marca como obligatorio, la validación la hace el formulario.
export default function FormField({ label, hint, error, success, required = false, id, className, children }) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const message = error || success || hint
  const status = error ? 'error' : success ? 'success' : undefined
  const messageId = message ? `${controlId}-mensaje` : undefined
  const context = useMemo(() => ({ controlId, messageId, status, required }), [controlId, messageId, status, required])

  return (
    <div className={cx('field', className)}>
      <label className="field__label" htmlFor={controlId}>
        {label}
      </label>
      <FormFieldContext value={context}>{children}</FormFieldContext>
      {message && (
        <p id={messageId} className={cx('field__message', status && `field__message--${status}`)}>
          {message}
        </p>
      )}
    </div>
  )
}
