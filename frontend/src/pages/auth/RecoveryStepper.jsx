import { Stepper } from '../../shared/components'

const PASOS = ['Tu correo', 'Enlace enviado', 'Nueva contraseña']

/** Pasos de la recuperación de contraseña (p08): los comparten el pedido del enlace y la página del enlace. */
export default function RecoveryStepper({ current }) {
  return (
    <Stepper
      steps={PASOS}
      current={current}
      label="Pasos para recuperar tu contraseña"
      className="recovery-page__stepper"
    />
  )
}
