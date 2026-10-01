import { cx } from '../../../utils/classNames.js'
import './PageHeader.css'

/** Título de pantalla (28/32) con subtítulo y acciones opcionales a la derecha. */
export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cx('page-header', className)}>
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}
