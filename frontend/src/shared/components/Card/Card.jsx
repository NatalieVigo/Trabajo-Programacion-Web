import { cx } from '../../../utils/classNames.js'
import './Card.css'

/** Superficie blanca con borde. `as` cambia el elemento (section, article…) y `title` agrega una cabecera. */
export default function Card({ as: Component = 'div', title, titleAs: Title = 'h2', actions, className, children, ...rest }) {
  return (
    <Component {...rest} className={cx('card', className)}>
      {(title || actions) && (
        <div className="card__header">
          {title && <Title className="card__title">{title}</Title>}
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      {children}
    </Component>
  )
}
