import { useId } from 'react'
import { cx } from '../../utils/classNames.js'
import { PRIORIDADES } from '../../utils/catalogoValidators.js'
import { formatPrioridad } from '../../utils/format.js'
import '../../shared/components/FormField/FormField.css'
import './PrioridadField.css'

/**
 * Prioridad por defecto (p13): una opción entre Crítica, Alta, Media y Baja. Cada una es un radio con forma de botón,
 * así el teclado y el lector de pantalla lo usan como un grupo de radios. Recibe las props de useForm#getFieldProps:
 * `onChange` recibe el evento del radio y `onBlur`, el del radio que pierde el foco al salir del grupo.
 */
export default function PrioridadField({ name, value, onChange, onBlur, error, label = 'Prioridad por defecto' }) {
  const id = useId()
  const mensajeId = `${id}-mensaje`

  function handleBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.(event)
  }

  return (
    <fieldset
      className={cx('prioridad-field', error && 'prioridad-field--error')}
      aria-describedby={error ? mensajeId : undefined}
      onBlur={handleBlur}
    >
      <legend className="field__label prioridad-field__legend">{label}</legend>
      <div className="prioridad-field__options">
        {PRIORIDADES.map((prioridad) => (
          <label key={prioridad} className={cx('prioridad-field__option', `prioridad-field__option--${prioridad}`)}>
            <input
              type="radio"
              name={name}
              value={prioridad}
              checked={value === prioridad}
              onChange={onChange}
              aria-invalid={error ? true : undefined}
              className="prioridad-field__input"
            />
            {formatPrioridad(prioridad)}
          </label>
        ))}
      </div>
      {error && (
        <p id={mensajeId} className="field__message field__message--error">
          {error}
        </p>
      )}
    </fieldset>
  )
}
