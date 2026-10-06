import { useRef } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useForm } from '../../hooks/useForm.js'
import { actualizarAmbiente, crearAmbiente } from '../../services/ubicaciones.service.js'
import { FormField, SelectInput, TextInput, useToast } from '../../shared/components'
import { validateAmbiente } from '../../utils/catalogoValidators.js'
import { OPCIONES_TIPO_AMBIENTE } from './catalogoFormat.js'
import FormularioModal from './FormularioModal.jsx'

const VALORES_NUEVOS = { codigo: '', tipo: '', nombre: '', pabellonId: '', piso: '', capacidad: '' }

/** Valores del formulario según el ambiente guardado: piso y capacidad como texto. */
const valoresDe = (ambiente) =>
  ambiente
    ? {
        codigo: ambiente.codigo,
        tipo: ambiente.tipo,
        nombre: ambiente.nombre,
        pabellonId: ambiente.pabellonId,
        piso: String(ambiente.piso),
        capacidad: String(ambiente.capacidad),
      }
    : VALORES_NUEVOS

/** Cada pabellón con su sede: «A · Campus Monterrico». */
const opcionesDePabellon = (sedes) =>
  sedes.flatMap((sede) => sede.pabellones.map((pabellon) => ({ value: pabellon.id, label: `${pabellon.nombre} · ${sede.nombre}` })))

/**
 * Nuevo o editar ambiente (HU-2 · 2.2, modal de p15): código, tipo, nombre opcional, pabellón, piso y capacidad.
 * `onGuardado` recibe el ambiente guardado. Se monta al abrirse, así cada vez empieza con sus valores.
 */
export default function AmbienteModal({ ambiente, sedes, onClose, onGuardado }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const codigoRef = useRef(null)
  const form = useForm({ initialValues: valoresDe(ambiente), validate: validateAmbiente })

  async function guardar(values) {
    try {
      const guardado = ambiente
        ? await actualizarAmbiente(ambiente.id, values, usuario.id)
        : await crearAmbiente(values, usuario.id)
      toast.success(`Ambiente “${guardado.codigo}” ${ambiente ? 'actualizado' : 'creado'} correctamente.`)
      onGuardado(guardado)
    } catch (error) {
      // 400 y 409 (código repetido) traen el mensaje de cada campo.
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
    }
  }

  return (
    <FormularioModal
      titulo={ambiente ? `Editar ambiente ${ambiente.codigo}` : 'Nuevo ambiente'}
      form={form}
      onGuardar={guardar}
      onClose={onClose}
      textoGuardar="Guardar ambiente"
      initialFocusRef={codigoRef}
    >
      <div className="form-grid">
        <FormField label="Código" required hint="Como aparece en la puerta: A-201, BIB-P2." error={form.errors.codigo}>
          <TextInput
            ref={codigoRef}
            {...form.getFieldProps('codigo')}
            mono
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </FormField>
        <FormField label="Tipo" required error={form.errors.tipo}>
          <SelectInput {...form.getFieldProps('tipo')} options={OPCIONES_TIPO_AMBIENTE} placeholder="Selecciona el tipo" />
        </FormField>
        <FormField
          className="form-grid__full"
          label="Nombre"
          hint="Opcional. Si lo dejas vacío, se usa el tipo y el código: «Laboratorio H-212»."
          error={form.errors.nombre}
        >
          <TextInput {...form.getFieldProps('nombre')} autoComplete="off" />
        </FormField>
        <FormField label="Pabellón" required error={form.errors.pabellonId}>
          <SelectInput
            {...form.getFieldProps('pabellonId')}
            options={opcionesDePabellon(sedes)}
            placeholder="Selecciona el pabellón"
          />
        </FormField>
        <FormField label="Piso" required hint="Usa números negativos para los sótanos." error={form.errors.piso}>
          <TextInput {...form.getFieldProps('piso')} inputMode="numeric" autoComplete="off" />
        </FormField>
        <FormField label="Capacidad" required hint="Personas que caben en el ambiente." error={form.errors.capacidad}>
          <TextInput {...form.getFieldProps('capacidad')} inputMode="numeric" autoComplete="off" />
        </FormField>
      </div>
    </FormularioModal>
  )
}
