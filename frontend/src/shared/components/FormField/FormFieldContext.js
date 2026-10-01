import { createContext, useContext } from 'react'

export const FormFieldContext = createContext(null)

/**
 * Props de accesibilidad que un control hereda del FormField que lo envuelve
 * (id, aria-describedby, aria-invalid, aria-required) y su estado visual. Las props explícitas tienen prioridad.
 */
export function useFieldControl(props, statusOverride) {
  const field = useContext(FormFieldContext)
  const status = statusOverride ?? field?.status
  return {
    status,
    controlProps: {
      id: props.id ?? field?.controlId,
      'aria-describedby': props['aria-describedby'] ?? field?.messageId,
      'aria-invalid': props['aria-invalid'] ?? (status === 'error' || undefined),
      'aria-required': props['aria-required'] ?? (field?.required || undefined),
    },
  }
}
