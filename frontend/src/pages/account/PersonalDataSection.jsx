import { useId, useRef } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { obtenerOpcionesCuenta } from '../../services/usuarios.service.js'
import { Alert, Button } from '../../shared/components'
import PersonalDataForm from './PersonalDataForm.jsx'

export default function PersonalDataSection({ usuario }) {
  const catalogos = useAsyncData(obtenerOpcionesCuenta)
  const tituloId = useId()
  const tituloRef = useRef(null)
  // al guardar el botón se deshabilita, así que el foco pasa al título
  const enfocarTitulo = () => tituloRef.current?.focus()

  return (
    <section className="account-section" aria-labelledby={tituloId} aria-busy={catalogos.status === 'loading'}>
      <h2 id={tituloId} ref={tituloRef} tabIndex={-1} className="account-section__title">
        Datos personales
      </h2>

      {catalogos.status === 'loading' && (
        <p role="status" className="text-muted">
          Cargando tus datos…
        </p>
      )}
      {catalogos.status === 'error' && (
        <Alert
          variant="error"
          actions={
            <Button variant="secondary" size="sm" onClick={catalogos.reload}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar tus datos personales.
        </Alert>
      )}
      {catalogos.status === 'success' && (
        <PersonalDataForm
          usuario={usuario}
          catalogos={catalogos.data}
          labelledBy={tituloId}
          onSaved={enfocarTitulo}
        />
      )}
    </section>
  )
}
