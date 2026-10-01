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

/** Enfoca el primer control habilitado del formulario, en el orden del DOM, que tenga error. */
function focusFirstInvalid(form, errors) {
  const field = Array.from(form.elements).find((element) => element.name && errors[element.name] && !element.disabled)
  field?.focus()
}

/**
 * Mientras se envía, el formulario deshabilita sus controles y el navegador puede soltar el foco (queda en <body>).
 * Si nadie lo tomó después, vuelve al botón que envió el formulario para que el teclado siga donde estaba.
 */
function restoreLostFocus(submitter) {
  const { activeElement } = document
  if (activeElement && activeElement !== document.body) return
  if (submitter?.isConnected) submitter.focus()
}

/**
 * Estado de un formulario controlado (SPEC §7). `validate(values)` devuelve { campo: mensaje } solo con los campos
 * inválidos. Un campo se valida al salir de él y, desde entonces, en cada cambio; al enviar se valida todo y se
 * enfoca el primer campo inválido. `errors` reúne lo que se debe mostrar junto a cada campo.
 */
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

  /** Cambia el valor de un campo. Sirve también para controles sin eventos nativos, como ChipToggleGroup. */
  function setFieldValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    // El error que devolvió el servicio ya no aplica al valor nuevo.
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

  /** Props de un control: name, value (o checked si el valor es booleano), onChange y onBlur. */
  function getFieldProps(name) {
    const value = values[name]
    const valueProps = typeof value === 'boolean' ? { checked: value } : { value }
    return { name, ...valueProps, onChange: handleChange, onBlur: handleBlur }
  }

  /**
   * Devuelve el manejador de onSubmit. Solo llama a `onValid(values)` si no hay errores; mientras espera,
   * `isSubmitting` es true. Si `onValid` devuelve errores por campo (los `fieldErrors` de un servicio),
   * se muestran junto a cada campo y se enfoca el primero; si no, el foco que se perdió vuelve al botón de envío.
   */
  function handleSubmit(onValid) {
    return async (event) => {
      event.preventDefault()
      if (submittingRef.current) return
      const form = event.currentTarget
      const submitter = event.nativeEvent?.submitter ?? form.querySelector('[type="submit"]')
      const clientErrors = validate(values)
      // Los mensajes se pintan antes de mover el foco para que el lector de pantalla anuncie el del campo.
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
          // Solo valen los errores del último envío: los de un envío anterior ya no describen la respuesta actual.
          setServerErrors(hasErrors(fieldErrors) ? fieldErrors : {})
        })
      }
      if (hasErrors(fieldErrors)) focusFirstInvalid(form, fieldErrors)
      else restoreLostFocus(submitter)
    }
  }

  /** Toma `nextValues` como los nuevos valores iniciales (por ejemplo, lo recién guardado) y limpia el estado. */
  function resetTo(nextValues) {
    setInitial(nextValues)
    setValues(nextValues)
    setTouched({})
    setServerErrors({})
  }

  /** Vuelve a los valores iniciales. */
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
