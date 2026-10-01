import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { ROUTES } from '../routes/routePaths.js'
import { useToast } from '../shared/components'

/** «Cerrar sesión» del menú lateral: termina la sesión, lo notifica y vuelve a la landing. */
export default function LogoutButton({ className }) {
  const { cerrarSesion } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [saliendo, setSaliendo] = useState(false)

  async function handleClick() {
    setSaliendo(true)
    try {
      await cerrarSesion(() => navigate(ROUTES.home, { replace: true }))
    } catch (error) {
      setSaliendo(false)
      toast.error(error.message)
      return
    }
    toast.success('Cerraste sesión correctamente.')
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={saliendo}>
      {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  )
}
