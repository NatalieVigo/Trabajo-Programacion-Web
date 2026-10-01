import { useCallback, useRef, useState } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'
import { ConfirmContext } from './ConfirmContext.js'

/** Expone `confirm(options)`, que abre un único ConfirmDialog y resuelve true (confirmar) o false. */
export default function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((nextOptions) => {
    resolveRef.current?.(false)
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setOptions(nextOptions)
    })
  }, [])

  const settle = useCallback((result) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setOptions(null)
  }, [])

  return (
    <ConfirmContext value={confirm}>
      {children}
      <ConfirmDialog
        {...options}
        open={options !== null}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext>
  )
}
