import { cx } from '../../../utils/classNames.js'
import { useFieldControl } from '../FormField/FormFieldContext.js'
import { CheckIcon } from '../icons.jsx'
import './TextInput.css'

/** Campo de texto de 40 px. En estado de éxito muestra un check; `endAdornment` reserva espacio a la derecha. */
export default function TextInput({ status: statusProp, mono = false, endAdornment, className, ...props }) {
  const { controlProps, status } = useFieldControl(props, statusProp)
  const showCheck = !endAdornment && status === 'success'
  const adornment = endAdornment ?? (showCheck ? <CheckIcon className="control__check" /> : null)

  return (
    <div
      className={cx(
        'control',
        status && `control--${status}`,
        endAdornment && 'control--adorned',
        showCheck && 'control--checked',
      )}
    >
      <input
        type="text"
        {...props}
        {...controlProps}
        className={cx('control__input', mono && 'control__input--mono', className)}
      />
      {adornment && <span className="control__adornment">{adornment}</span>}
    </div>
  )
}
