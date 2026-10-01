import { useEffect, useRef, useState } from 'react'
import { useCountdown } from '../../hooks/useCountdown.js'
import { solicitarRecuperacion } from '../../services/auth.service.js'
import { Button, CheckIcon, useToast } from '../../shared/components'
import { formatCountdown } from '../../utils/format.js'

const ESPERA_REENVIO_SEGUNDOS = 45

/**
 * Paso 2 de la recuperación (p09): confirma el envío del enlace. «Reenviar enlace» se habilita a los 45 segundos y
 * vuelve a contar tras cada reenvío; `onReenviado` recibe la nueva respuesta del servicio. «Usar otro correo» vuelve
 * al paso 1.
 */
export default function RecoveryLinkSent({ correo, onReenviado, onUsarOtroCorreo }) {
  const toast = useToast()
  const espera = useCountdown(ESPERA_REENVIO_SEGUNDOS)
  const [reenviando, setReenviando] = useState(false)
  const tituloRef = useRef(null)

  useEffect(() => {
    tituloRef.current?.focus()
  }, [])

  async function reenviar() {
    setReenviando(true)
    try {
      onReenviado(await solicitarRecuperacion(correo))
      toast.success(`Te enviamos un nuevo enlace a ${correo}.`)
      espera.restart()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setReenviando(false)
    }
    // El botón se deshabilitó al reenviar: el foco pasa al título en vez de perderse.
    tituloRef.current?.focus()
  }

  return (
    <div className="link-sent">
      <span className="link-sent__icon" aria-hidden="true">
        <CheckIcon size={20} />
      </span>
      <h1 ref={tituloRef} tabIndex={-1} className="link-sent__title">
        Revisa tu correo
      </h1>
      <p className="link-sent__text">Enviamos el enlace a {correo}. Vence en 30 minutos.</p>
      <div className="link-sent__actions">
        <Button
          variant="tertiary"
          className="link-sent__resend"
          onClick={reenviar}
          disabled={espera.isRunning}
          loading={reenviando}
          loadingText="Reenviando…"
        >
          {espera.isRunning
            ? `Reenviar enlace (disponible en ${formatCountdown(espera.secondsLeft)})`
            : 'Reenviar enlace'}
        </Button>
        <Button variant="tertiary" onClick={onUsarOtroCorreo} disabled={reenviando}>
          Usar otro correo
        </Button>
      </div>
    </div>
  )
}
