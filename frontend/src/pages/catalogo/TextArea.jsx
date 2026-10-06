import { useFieldControl } from '../../shared/components/FormField/FormFieldContext.js'
import { cx } from '../../utils/classNames.js'
import '../../shared/components/TextInput/TextInput.css'
import './TextArea.css'

/** Texto de varias líneas con el estilo de los campos. Dentro de un FormField hereda su id, mensaje y estado. */
export default function TextArea({ status: statusProp, rows = 3, className, ...props }) {
  const { controlProps, status } = useFieldControl(props, statusProp)

  return (
    <div className={cx('control', status && `control--${status}`)}>
      <textarea {...props} {...controlProps} rows={rows} className={cx('control__input', 'control__textarea', className)} />
    </div>
  )
}
