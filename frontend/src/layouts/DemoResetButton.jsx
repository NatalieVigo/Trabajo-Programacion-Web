import { useEffect, useState } from 'react'
import { restablecerDatosDemo } from '../services/demo.service.js'
import { useConfirm, useToast } from '../shared/components'
import './DemoResetButton.css'

const RELOAD_DELAY_MS = 1200

/** Herramienta de desarrollo: vuelve a cargar los datos semilla y recarga la página. */
export default function DemoResetButton() {
  const confirm = useConfirm()
  const toast = useToast()
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (status !== 'done') return undefined
    const timer = setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
    return () => clearTimeout(timer)
  }, [status])

  async function handleClick() {
    const confirmed = await confirm({
      title: '¿Restablecer los datos de demostración?',
      message:
        'Se perderán los cambios hechos en este navegador (cuentas, invitaciones y datos editados) y se cargarán otra vez los datos semilla.',
      confirmText: 'Restablecer datos',
      variant: 'destructive',
    })
    if (!confirmed) return

    setStatus('resetting')
    try {
      await restablecerDatosDemo()
      toast.success('Datos de demostración restablecidos. La página se recargará.')
      setStatus('done')
    } catch {
      toast.error('No pudimos restablecer los datos de demostración. Inténtalo otra vez.')
      setStatus('idle')
    }
  }

  return (
    <button type="button" className="demo-reset" onClick={handleClick} disabled={status !== 'idle'}>
      {status === 'idle' ? 'Restablecer datos de demostración' : 'Restableciendo…'}
    </button>
  )
}
