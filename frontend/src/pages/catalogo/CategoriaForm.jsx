import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useForm } from '../../hooks/useForm.js'
import { ROUTES } from '../../routes/routePaths.js'
import { actualizar, crear } from '../../services/categorias.service.js'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  FormField,
  PageHeader,
  SelectInput,
  TextInput,
  useConfirm,
  useToast,
} from '../../shared/components'
import { DESCRIPCION_MAX_LENGTH, validateCategoria } from '../../utils/catalogoValidators.js'
import { nombreDeTipo } from './catalogoFormat.js'
import PrioridadField from './PrioridadField.jsx'
import TextArea from './TextArea.jsx'
import './CategoriaForm.css'

const VALORES_NUEVOS = {
  nombre: '',
  categoriaId: '',
  prioridadPorDefecto: '',
  tiempoEsperadoHoras: '',
  descripcion: '',
  activa: true,
}

/** Valores del formulario según lo guardado: sin padre como '' y las horas como texto. */
const valoresDe = (elemento) =>
  elemento
    ? {
        nombre: elemento.nombre,
        categoriaId: elemento.categoriaId ?? '',
        prioridadPorDefecto: elemento.prioridadPorDefecto,
        tiempoEsperadoHoras: String(elemento.tiempoEsperadoHoras),
        descripcion: elemento.descripcion ?? '',
        activa: elemento.activa,
      }
    : VALORES_NUEVOS

/** Tiempos de referencia por prioridad (p13). */
const REFERENCIA_HORAS = 'Crítica 2 h · Alta 8 h · Media 24 h · Baja 72 h hábiles'

function ayudaDelPadre(elemento) {
  if (!elemento) return 'Déjalo vacío para crear una categoría de primer nivel.'
  return elemento.tipo === 'categoria'
    ? 'Una categoría principal no puede pasar a ser subcategoría.'
    : 'Puedes moverla a otra categoría.'
}

/**
 * Nueva o editar categoría (HU-2 · 2.1, mockup p13). Con una categoría padre elegida, lo nuevo es una subcategoría.
 * Si el envío falla, un aviso resume cuántos campos hay que revisar y cada error aparece junto a su campo.
 */
export default function CategoriaForm({ categorias, elemento }) {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { usuario } = useAuth()
  const asideId = useId()
  const form = useForm({ initialValues: valoresDe(elemento), validate: validateCategoria })
  const [envioIntentado, setEnvioIntentado] = useState(false)

  const tipo = elemento?.tipo ?? (form.values.categoriaId ? 'subcategoria' : 'categoria')
  const titulo = `${elemento ? 'Editar' : 'Nueva'} ${nombreDeTipo(tipo)}`
  const totalErrores = Object.keys(form.errors).length
  const opcionesPadre = categorias
    .filter((categoria) => categoria.id !== elemento?.id)
    .map(({ id, nombre, activa }) => ({ value: id, label: activa ? nombre : `${nombre} (inactiva)` }))
  useDocumentTitle(titulo)

  async function guardar(values) {
    try {
      const guardado = elemento ? await actualizar(elemento.id, values, usuario.id) : await crear(values, usuario.id)
      const accion = elemento ? 'actualizada' : 'creada'
      toast.success(`${nombreDeTipo(guardado.tipo, { mayuscula: true })} “${guardado.nombre}” ${accion} correctamente.`)
      navigate(ROUTES.supervisorCategorias)
    } catch (error) {
      // 400 y 409 (nombre repetido) traen el mensaje de cada campo: el formulario los muestra junto a ellos.
      if (error.fieldErrors) return error.fieldErrors
      toast.error(error.message)
    }
  }

  function handleSubmit(event) {
    setEnvioIntentado(true)
    return form.handleSubmit(guardar)(event)
  }

  async function cancelar() {
    if (form.isDirty) {
      const descartar = await confirm({
        title: '¿Descartar los cambios?',
        message: 'Se perderán los datos que ingresaste.',
        confirmText: 'Descartar',
        cancelText: 'Seguir editando',
        variant: 'destructive',
      })
      if (!descartar) return
    }
    navigate(ROUTES.supervisorCategorias)
  }

  return (
    <div className="categoria-form-page">
      <nav aria-label="Ruta de navegación" className="categoria-form-page__breadcrumb">
        <Link to={ROUTES.supervisorCategorias}>Categorías</Link>
        <span aria-hidden="true"> · </span>
        <span aria-current="page">{titulo}</span>
      </nav>
      <PageHeader title={titulo} />

      {envioIntentado && totalErrores > 0 && (
        <Alert variant="error" className="categoria-form-page__summary">
          No se pudo guardar: revisa {totalErrores === 1 ? 'el campo marcado' : `los ${totalErrores} campos marcados`}.
        </Alert>
      )}

      <div className="categoria-form-page__layout">
        <Card>
          <form onSubmit={handleSubmit} aria-label={titulo} noValidate>
            <fieldset disabled={form.isSubmitting}>
              <div className="form-grid">
                <FormField label="Nombre" required error={form.errors.nombre}>
                  <TextInput {...form.getFieldProps('nombre')} placeholder="Escribe el nombre" autoComplete="off" />
                </FormField>
                <FormField label="Categoría padre" hint={ayudaDelPadre(elemento)} error={form.errors.categoriaId}>
                  <SelectInput
                    {...form.getFieldProps('categoriaId')}
                    options={opcionesPadre}
                    placeholder={elemento?.tipo === 'subcategoria' ? undefined : 'Ninguna · categoría principal'}
                    disabled={elemento?.tipo === 'categoria'}
                  />
                </FormField>

                <PrioridadField {...form.getFieldProps('prioridadPorDefecto')} error={form.errors.prioridadPorDefecto} />
                <FormField
                  label="Tiempo esperado (horas)"
                  required
                  hint="Horas hábiles para atender cada ticket nuevo."
                  error={form.errors.tiempoEsperadoHoras}
                >
                  <TextInput {...form.getFieldProps('tiempoEsperadoHoras')} inputMode="numeric" autoComplete="off" />
                </FormField>

                <FormField
                  className="form-grid__full"
                  label="Descripción"
                  hint={`Se muestra al usuario al elegir la ${nombreDeTipo(tipo)}. Máximo ${DESCRIPCION_MAX_LENGTH} caracteres.`}
                  error={form.errors.descripcion}
                >
                  <TextArea {...form.getFieldProps('descripcion')} />
                </FormField>

                <Checkbox
                  {...form.getFieldProps('activa')}
                  className="form-grid__full"
                  label={`${nombreDeTipo(tipo, { mayuscula: true })} activa · disponible al registrar tickets`}
                />

                <div className="form-actions form-grid__full">
                  <Button type="submit" loading={form.isSubmitting} loadingText="Guardando…">
                    Guardar {nombreDeTipo(tipo)}
                  </Button>
                  <Button variant="secondary" onClick={cancelar}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </fieldset>
          </form>
        </Card>

        <Card as="aside" className="categoria-form-page__aside" aria-labelledby={asideId}>
          <h2 id={asideId} className="categoria-form-page__aside-title">
            Efecto del tiempo esperado
          </h2>
          <p className="categoria-form-page__aside-text">
            El tiempo esperado define cuándo un ticket aparece como fuera de plazo en la cola y en el tablero. Cambiarlo
            no altera los tickets ya abiertos.
          </p>
          <p className="text-label text-muted">Referencia actual</p>
          <p className="categoria-form-page__aside-text">{REFERENCIA_HORAS}</p>
        </Card>
      </div>
    </div>
  )
}
