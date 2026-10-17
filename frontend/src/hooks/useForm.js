import { useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { hasErrors } from '../utils/validators.js'

const touchAll = (values) => Object.fromEntries(Object.keys(values).map((name) => [name, true]))

function omit(object, key) {
  if (!(key in object)) return object
  const rest = { ...object }
  delete rest[key]
  return rest
}

function focusFirstInvalid(form, errors) {
  const field = Array.from(form.elements).find((element) => element.name && errors[element.name] && !element.disabled)
  field?.focus()
}

// Al deshabilitar los controles el foco se va al body. Si nadie lo tomó, vuelve al botón.
function restoreLostFocus(submitter) {
  const { activeElement } = document
  if (activeElement && activeElement !== document.body) return
  if (submitter?.isConnected) submitter.focus()
}

// Cada campo se valida al salir de él y después en cada cambio. Al enviar se valida todo.
export function useForm({ initialValues, validate }) {
  const [initial, setInitial] = useState(initialValues)
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const validationErrors = useMemo(() => validate(values), [validate, values])
  const errors = useMemo(() => {
    const visible = { ...serverErrors }
    for (const [name, message] of Object.entries(validationErrors)) {
      if (touched[name]) visible[name] = message
    }
    return visible
  }, [serverErrors, validationErrors, touched])
  const isDirty = Object.keys(initial).some((name) => !Object.is(values[name], initial[name]))

  // sirve también para controles sin eventos nativos, como ChipToggleGroup
  function setFieldValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    // el error del servidor ya no aplica al valor nuevo
    setServerErrors((current) => omit(current, name))
  }

  function handleChange(event) {
    const { name, type, value, checked } = event.target
    setFieldValue(name, type === 'checkbox' ? checked : value)
  }

  function handleBlur(event) {
    const { name } = event.target
    setTouched((current) => (current[name] ? current : { ...current, [name]: true }))
  }

  function getFieldProps(name) {
    const value = values[name]
    const valueProps = typeof value === 'boolean' ? { checked: value } : { value }
    return { name, ...valueProps, onChange: handleChange, onBlur: handleBlur }
  }

  // onValid puede devolver errores por campo del servidor, y se enfoca el primero
  function handleSubmit(onValid) {
    return async (event) => {
      event.preventDefault()
      if (submittingRef.current) return
      const form = event.currentTarget
      const submitter = event.nativeEvent?.submitter ?? form.querySelector('[type="submit"]')
      const clientErrors = validate(values)
      // se pintan los mensajes antes de mover el foco, para el lector de pantalla
      flushSync(() => setTouched(touchAll(values)))
      if (hasErrors(clientErrors)) {
        focusFirstInvalid(form, clientErrors)
        return
      }

      submittingRef.current = true
      setIsSubmitting(true)
      let fieldErrors = null
      try {
        fieldErrors = await onValid(values)
      } finally {
        submittingRef.current = false
        flushSync(() => {
          setIsSubmitting(false)
          setServerErrors(hasErrors(fieldErrors) ? fieldErrors : {})
        })
      }
      if (hasErrors(fieldErrors)) focusFirstInvalid(form, fieldErrors)
      else restoreLostFocus(submitter)
    }
  }

  // por ejemplo, después de guardar
  function resetTo(nextValues) {
    setInitial(nextValues)
    setValues(nextValues)
    setTouched({})
    setServerErrors({})
  }

  function reset() {
    resetTo(initial)
  }

  return {
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    setFieldValue,
    handleChange,
    handleBlur,
    getFieldProps,
    handleSubmit,
    reset,
    resetTo,
  }
}
