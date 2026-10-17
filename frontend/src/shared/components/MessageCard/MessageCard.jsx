import { useEffect, useRef } from 'react'
import { cx } from '../../../utils/classNames.js'
import Card from '../Card/Card.jsx'
import './MessageCard.css'

// focusTitle enfoca el título para que el lector lo anuncie al cambiar el contenido
export default function MessageCard({
  code,
  badge,
  title,
  titleAs: Title = 'h1',
  description,
  actions,
  focusTitle = false,
  centered = false,
  className,
}) {
  const titleRef = useRef(null)

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus()
  }, [focusTitle])

  return (
    <Card className={cx('message-card', centered && 'message-card--centered', className)}>
      {code && <p className="message-card__code">{code}</p>}
      {badge}
      <Title ref={titleRef} tabIndex={focusTitle ? -1 : undefined} className="message-card__title">
        {title}
      </Title>
      {description && <p className="message-card__description">{description}</p>}
      {actions && <div className="message-card__actions">{actions}</div>}
    </Card>
  )
}
