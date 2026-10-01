import { cx } from '../../../utils/classNames.js'
import { useFieldControl } from '../FormField/FormFieldContext.js'
import { ChevronDownIcon } from '../icons.jsx'
import '../TextInput/TextInput.css'
import './SelectInput.css'

const toOption = (option) => (typeof option === 'string' ? { value: option, label: option } : option)

/** Select nativo con el estilo de los campos. `options` acepta strings u objetos { value, label }. */
export default function SelectInput({ options = [], placeholder, status: statusProp, className, children, ...props }) {
  const { controlProps, status } = useFieldControl(props, statusProp)

  return (
    <div className={cx('control', status && `control--${status}`)}>
      <select {...props} {...controlProps} className={cx('control__input', 'control__select', className)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(toOption).map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDownIcon className="control__chevron" />
    </div>
  )
}
