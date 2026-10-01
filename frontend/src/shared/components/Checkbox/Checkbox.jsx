import { useId } from 'react'
import { cx } from '../../../utils/classNames.js'
import '../FormField/FormField.css'
import './Checkbox.css'

/** Casilla con etiqueta y error. `required` la anuncia como obligatoria (aria-required), como FormField. */
export default function Checkbox({ label, error, required = false, id, className, ...props }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className={cx('checkbox', className)}>
      <div className="checkbox__row">
        <input
          {...props}
          id={inputId}
          type="checkbox"
          className="checkbox__input"
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
        />
        <label className="checkbox__label" htmlFor={inputId}>
          {label}
        </label>
      </div>
      {error && (
        <p id={errorId} className="field__message field__message--error">
          {error}
        </p>
      )}
    </div>
  )
}
