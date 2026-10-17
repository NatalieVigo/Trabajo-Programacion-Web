import { useAuth } from '../../hooks/useAuth.js'
import { useForm } from '../../hooks/useForm.js'
import { agregarEntrada } from '../../services/atencion.service.js'
import { Button, FormField, useToast } from '../../shared/components'
import { validateEntrada } from '../../utils/atencionValidators.js'
import { cx } from '../../utils/classNames.js'
import { getDisplayName } from '../../utils/format.js'
import TextArea from '../catalogo/TextArea.jsx'
import { esTicketDesactualizado } from './erroresDeAtencion.js'

const TIPOS = [
  { value: 'publico', label: 'Comentario público' },
  { value: 'interno', label: 'Nota interna' },
]

// Comentario público o nota interna (esta solo la ve el equipo).
export default function NuevaEntradaForm({ ticket, permisos, onGuardada, onDesactualizada }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const form = useForm({ initialValues: { tipo: 'publico', mensaje: '' }, validate: validateEntrada })
  const esInterna = form.values.tipo === 'interno'

  async function guardar(values) {
    try {
      const actualizada = await agregarEntrada(ticket.codigo, values, usuario.id)
      toast.success(values.tipo === 'interno' ? 'Nota interna guardada.' : 'Comentario publicado.')
      // se mantiene el tipo para la siguiente entrada
      form.resetTo({ tipo: values.tipo, mensaje: '' })
      onGuardada(actualizada)
    } catch (error) {
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
      if (esTicketDesactualizado(error)) onDesactualizada()
    }
  }

  return (
    <form
      className={cx('nueva-entrada', esInterna && 'nueva-entrada--interna')}
      onSubmit={form.handleSubmit(guardar)}
      aria-label="Nueva entrada de la bitácora"
      noValidate
    >
      <fieldset disabled={form.isSubmitting}>
        {permisos.notaInterna && (
          <fieldset className="nueva-entrada__tipos">
            <legend className="visually-hidden">Tipo de entrada</legend>
            {TIPOS.map(({ value, label }) => (
              <label key={value} className="nueva-entrada__tipo">
                <input
                  type="radio"
                  name="tipo"
                  value={value}
                  checked={form.values.tipo === value}
                  onChange={form.handleChange}
                  className="nueva-entrada__radio"
                />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        <p className="nueva-entrada__aviso" aria-live="polite">
          {esInterna
            ? 'Estás escribiendo una nota interna: solo la ve el equipo técnico y el supervisor.'
            : `Estás escribiendo un comentario público: también lo verá ${getDisplayName(ticket.solicitante)}.`}
        </p>
        {/* la etiqueta se oculta por CSS, queda para lectores de pantalla */}
        <FormField
          className="nueva-entrada__campo"
          label={esInterna ? 'Nota interna' : 'Comentario público'}
          required
          error={form.errors.mensaje}
        >
          <TextArea
            {...form.getFieldProps('mensaje')}
            placeholder={
              esInterna ? 'Diagnóstico, repuestos, coordinaciones del equipo…' : 'Cuenta el avance de la atención…'
            }
          />
        </FormField>
        <div className="form-actions">
          <Button type="submit" loading={form.isSubmitting} loadingText="Guardando…">
            {esInterna ? 'Guardar nota interna' : 'Publicar comentario'}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
