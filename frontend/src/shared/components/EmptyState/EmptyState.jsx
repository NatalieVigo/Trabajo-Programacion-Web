import { cx } from '../../../utils/classNames.js'
import './EmptyState.css'

/** Estado vacío (p15, p21, p23): ícono, título, descripción y una acción opcional. */
export default function EmptyState({ icon, title, description, action, titleAs: Title = 'h2', className }) {
  return (
    <div className={cx('empty-state', className)}>
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
