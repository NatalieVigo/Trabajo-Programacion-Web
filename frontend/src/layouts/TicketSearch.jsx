import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon } from '../shared/components'
import './TicketSearch.css'

/** Buscador de la cabecera (p10): con Enter lleva a la lista de tickets del rol con ?codigo=. */
export default function TicketSearch({ ticketsPath }) {
  const navigate = useNavigate()
  const inputId = useId()
  const [codigo, setCodigo] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const buscado = codigo.trim().toUpperCase()
    if (!buscado) return
    navigate({ pathname: ticketsPath, search: `?${new URLSearchParams({ codigo: buscado })}` })
    setCodigo('')
  }

  return (
    <form role="search" className="ticket-search" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        Buscar ticket por código
      </label>
      <SearchIcon className="ticket-search__icon" />
      <input
        id={inputId}
        type="text"
        className="ticket-search__input"
        value={codigo}
        onChange={(event) => setCodigo(event.target.value)}
        placeholder="Buscar por código de ticket · TCK-2026-…"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
      />
    </form>
  )
}
