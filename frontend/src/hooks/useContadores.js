import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { obtenerContadores } from '../services/resumen.service.js'

// Se piden en cada navegación. Si falla, se quedan los últimos valores.
export function useContadores(usuario) {
  const { pathname } = useLocation()
  const [contadores, setContadores] = useState(null)

  useEffect(() => {
    let activo = true
    const actualizar = () => obtenerContadores(usuario).then(
      (resultado) => {
        if (activo) setContadores(resultado)
      },
      () => {},
    )
    actualizar()
    window.addEventListener('mesa-ayuda:datos-actualizados', actualizar)
    return () => {
      activo = false
      window.removeEventListener('mesa-ayuda:datos-actualizados', actualizar)
    }
  }, [usuario, pathname])

  return contadores
}
