import { useId, useMemo } from 'react'
import { cx } from '../../../utils/classNames.js'
import { FormFieldContext } from './FormFieldContext.js'
import './FormField.css'

/**
 * Etiqueta + control + mensaje. El mensaje prioriza error > éxito > ayuda y queda enlazado al control
 * con aria-describedby; el control recibe el id, aria-invalid y aria-required a través de contexto.
 * `required` solo anuncia el campo como obligatorio: la validación la hace el formulario, no el navegador.
 */
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
