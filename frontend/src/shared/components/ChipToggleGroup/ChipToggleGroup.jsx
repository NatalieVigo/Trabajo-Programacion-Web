import { useId } from 'react'
import { cx } from '../../../utils/classNames.js'
import '../FormField/FormField.css'
import './ChipToggleGroup.css'

// Cada chip lleva name para que el formulario pueda enfocar el grupo si hay error.
export default function ChipToggleGroup({
  label,
  options = [],
  value = [],
  onChange,
  onBlur,
  name,
  max,
  maxMessage = `Puedes elegir hasta ${max}. Quita una opción para elegir otra.`,
  hint,
  error,
  disabled = false,
  className,
}) {
  const id = useId()
  const messageId = `${id}-mensaje`
  const limitReached = max !== undefined && value.length >= max
  const message = error || (limitReached ? maxMessage : hint)

  function toggle(optionValue) {
    if (value.includes(optionValue)) {
      onChange(value.filter((selected) => selected !== optionValue))
    } else if (!limitReached) {
      onChange([...value, optionValue])
    }
  }

  function handleBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.(event)
  }

  return (
    <fieldset
      className={cx('chip-group', error && 'chip-group--error', className)}
      aria-describedby={message ? messageId : undefined}
      disabled={disabled}
      onBlur={handleBlur}
    >
      <legend className="field__label chip-group__legend">{label}</legend>
      <div className="chip-group__options">
        {options.map((option) => {
          const selected = value.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              name={name}
              className="chip"
              aria-pressed={selected}
              aria-disabled={(limitReached && !selected) || undefined}
              onClick={() => toggle(option.value)}
            >
              {option.label}
              {selected && (
                <span className="chip__check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
      {/* siempre está, así el lector anuncia cuando se llega al máximo */}
      <p id={messageId} className={cx('chip-group__message', error && 'chip-group__message--error')} aria-live="polite">
        {message}
      </p>
    </fieldset>
  )
}
