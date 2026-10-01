import { cx } from '../../../utils/classNames.js'
import './Badge.css'

/**
 * Etiqueta/pill (p02, p07). Tonos: neutral, primary, info, success, warning, danger, accent.
 * `uppercase` aplica el estilo ETIQUETA, como «INVITACIÓN VÁLIDA HASTA EL …».
 */
export default function Badge({ tone = 'neutral', uppercase = false, className, children, ...rest }) {
  return (
    <span {...rest} className={cx('badge', `badge--${tone}`, uppercase && 'badge--label', className)}>
      {children}
    </span>
  )
}
