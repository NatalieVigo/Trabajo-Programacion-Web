import { cx } from '../../../utils/classNames.js'
import './Badge.css'

// uppercase le pone el estilo de etiqueta en mayúsculas
export default function Badge({ tone = 'neutral', uppercase = false, className, children, ...rest }) {
  return (
    <span {...rest} className={cx('badge', `badge--${tone}`, uppercase && 'badge--label', className)}>
      {children}
    </span>
  )
}
