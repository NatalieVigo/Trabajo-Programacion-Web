import { cx } from '../../../utils/classNames.js'
import './EmptyState.css'

/**
 * Estado vacío (p15, p21, p23): ícono, título, descripción y una acción opcional. `compact` lo reduce para
 * tarjetas angostas, como las de una columna lateral.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  titleAs: Title = 'h2',
  compact = false,
  className,
}) {
  return (
    <div className={cx('empty-state', compact && 'empty-state--compact', className)}>
      {icon && (
        <div className="empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <Title className="empty-state__title">{title}</Title>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}
