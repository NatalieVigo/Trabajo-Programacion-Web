import { createContext, useContext } from 'react'

export const FormFieldContext = createContext(null)

// lo que el control hereda de su FormField; las props propias ganan
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
