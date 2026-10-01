import { useState } from 'react'
import { useFieldControl } from '../FormField/FormFieldContext.js'
import TextInput from '../TextInput/TextInput.jsx'
import './PasswordInput.css'

/** Contraseña con el botón «Mostrar»/«Ocultar» dentro del campo (p04). */
export default function PasswordInput({ disabled = false, ...props }) {
  const [visible, setVisible] = useState(false)
  const { controlProps } = useFieldControl(props)

  return (
    <TextInput
      {...props}
      type={visible ? 'text' : 'password'}
      disabled={disabled}
      endAdornment={
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-controls={controlProps.id}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      }
    />
  )
}
