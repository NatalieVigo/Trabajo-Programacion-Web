import { cx } from '../../../utils/classNames.js'
import { getInitials } from '../../../utils/format.js'
import './Avatar.css'

/** Iniciales sobre fondo de acento. Es decorativo salvo que reciba `label`. */
export default function Avatar({ nombres, apellidos, initials, size = 'md', tone = 'accent', label, className }) {
  const accessibility = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  return (
    <span {...accessibility} className={cx('avatar', `avatar--${size}`, `avatar--${tone}`, className)}>
      {initials ?? getInitials(nombres, apellidos)}
    </span>
  )
}
