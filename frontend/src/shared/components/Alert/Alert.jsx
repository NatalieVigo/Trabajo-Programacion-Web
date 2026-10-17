import { cx } from '../../../utils/classNames.js'
import './Alert.css'

const ASSERTIVE_VARIANTS = new Set(['error', 'warning'])

export default function Alert({ variant = 'info', title, actions, className, children, ...rest }) {
  return (
    <div
      {...rest}
      role={ASSERTIVE_VARIANTS.has(variant) ? 'alert' : 'status'}
      className={cx('alert', `alert--${variant}`, className)}
    >
      {title && <p className="alert__title">{title}</p>}
      {children && <div className="alert__content">{children}</div>}
      {actions && <div className="alert__actions">{actions}</div>}
    </div>
  )
}
