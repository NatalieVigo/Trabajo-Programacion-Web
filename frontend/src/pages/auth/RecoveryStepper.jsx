import { Stepper } from '../../shared/components'

const PASOS = ['Tu correo', 'Enlace enviado', 'Nueva contraseña']

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
