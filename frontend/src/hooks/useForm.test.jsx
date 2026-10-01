import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox, FormField, TextInput } from '../shared/components'
import { soltarFoco } from '../test/focus.js'
import { useForm } from './useForm.js'

const INITIAL_VALUES = { nombre: '', correo: '', acepta: false }

function validate(values) {
  const errors = {}
  if (!values.nombre) errors.nombre = 'Ingresa tu nombre.'
  if (!values.correo.includes('@')) errors.correo = 'Ingresa un correo válido.'
  if (!values.acepta) errors.acepta = 'Debes aceptar.'
  return errors
}

function DemoForm({ onValid }) {
  const form = useForm({ initialValues: INITIAL_VALUES, validate })

  return (
    <form onSubmit={form.handleSubmit(onValid)} noValidate>
      <FormField label="Nombre" error={form.errors.nombre}>
        <TextInput {...form.getFieldProps('nombre')} />
      </FormField>
      <FormField label="Correo" error={form.errors.correo}>
        <TextInput {...form.getFieldProps('correo')} />
      </FormField>
      <Checkbox {...form.getFieldProps('acepta')} label="Acepto" error={form.errors.acepta} />
      <p>{form.isDirty ? 'Con cambios' : 'Sin cambios'}</p>
      <button type="button" onClick={() => form.setFieldValue('nombre', 'Lucía')}>
        Usar «Lucía»
      </button>
      <button type="button" onClick={form.reset}>
        Restablecer
      </button>
      <button type="button" onClick={() => form.resetTo(form.values)}>
        Fijar como iniciales
      </button>
      <button type="submit" disabled={form.isSubmitting}>
        Enviar
      </button>
    </form>
  )
}

function setup(onValid = vi.fn()) {
  const user = userEvent.setup({ delay: null })
  render(<DemoForm onValid={onValid} />)
  return { user, onValid }
}

const campo = (name) => screen.getByLabelText(name)

async function completar(user) {
  await user.type(campo('Nombre'), 'Ana')
  await user.type(campo('Correo'), 'ana@ulima.edu.pe')
  await user.click(screen.getByRole('checkbox', { name: 'Acepto' }))
}

describe('useForm', () => {
  it('valida un campo al salir de él y lo revalida en cada cambio', async () => {
    const { user } = setup()

    await user.click(campo('Nombre'))
    expect(campo('Nombre')).not.toHaveAttribute('aria-invalid')
    await user.tab()

    expect(campo('Nombre')).toHaveAccessibleDescription('Ingresa tu nombre.')
    expect(campo('Correo')).not.toHaveAttribute('aria-invalid')

    await user.type(campo('Nombre'), 'Ana')
    expect(campo('Nombre')).not.toHaveAttribute('aria-invalid')
    await user.clear(campo('Nombre'))
    expect(campo('Nombre')).toHaveAttribute('aria-invalid', 'true')
  })

  it('al enviar valida todo, enfoca el primer campo inválido y no llama a onValid', async () => {
    const { user, onValid } = setup()

    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(campo('Nombre')).toHaveFocus()
    expect(campo('Nombre')).toHaveAccessibleDescription('Ingresa tu nombre.')
    expect(campo('Correo')).toHaveAccessibleDescription('Ingresa un correo válido.')
    expect(screen.getByRole('checkbox', { name: 'Acepto' })).toHaveAccessibleDescription('Debes aceptar.')

    await user.type(campo('Nombre'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(campo('Correo')).toHaveFocus()
    expect(onValid).not.toHaveBeenCalled()
  })

  it('llama a onValid con los valores cuando todo es válido', async () => {
    const { user, onValid } = setup()

    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(onValid).toHaveBeenCalledExactlyOnceWith({ nombre: 'Ana', correo: 'ana@ulima.edu.pe', acepta: true })
  })

  it('mientras onValid espera marca el envío en curso e ignora otro envío', async () => {
    let terminar
    const onValid = vi.fn(
      () =>
        new Promise((resolve) => {
          terminar = resolve
        }),
    )
    const { user } = setup(onValid)
    await completar(user)
    const enviar = screen.getByRole('button', { name: 'Enviar' })

    await user.click(enviar)
    expect(enviar).toBeDisabled()
    fireEvent.submit(enviar.form)
    expect(onValid).toHaveBeenCalledOnce()

    await act(async () => terminar())
    expect(enviar).toBeEnabled()
  })

  it('si el foco se perdió mientras se enviaba, lo devuelve al botón de envío', async () => {
    let terminar
    const onValid = vi.fn(
      () =>
        new Promise((resolve) => {
          terminar = resolve
        }),
    )
    const { user } = setup(onValid)
    await completar(user)
    const enviar = screen.getByRole('button', { name: 'Enviar' })

    await user.click(enviar)
    soltarFoco()
    expect(document.body).toHaveFocus()

    await act(async () => terminar())
    expect(enviar).toHaveFocus()
  })

  it('no mueve el foco si quedó en otro control mientras se enviaba', async () => {
    let terminar
    const onValid = vi.fn(
      () =>
        new Promise((resolve) => {
          terminar = resolve
        }),
    )
    const { user } = setup(onValid)
    await completar(user)

    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await user.click(campo('Nombre'))

    await act(async () => terminar())
    expect(campo('Nombre')).toHaveFocus()
  })

  it('muestra los errores que devuelve onValid, enfoca el primero y lo limpia al editar el campo', async () => {
    const onValid = vi.fn().mockResolvedValue({ correo: 'Ya existe una cuenta con este correo.' })
    const { user } = setup(onValid)
    await completar(user)

    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(campo('Correo')).toHaveFocus()
    expect(campo('Correo')).toHaveAccessibleDescription('Ya existe una cuenta con este correo.')
    await user.type(campo('Correo'), 'x')
    expect(campo('Correo')).not.toHaveAttribute('aria-invalid')
  })

  it('cada envío reemplaza los errores que devolvió el envío anterior', async () => {
    const onValid = vi
      .fn()
      .mockResolvedValueOnce({ correo: 'Ya existe una cuenta con este correo.' })
      .mockResolvedValueOnce(undefined)
    const { user } = setup(onValid)
    await completar(user)

    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(campo('Correo')).toHaveAccessibleDescription('Ya existe una cuenta con este correo.')

    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onValid).toHaveBeenCalledTimes(2)
    expect(campo('Correo')).not.toHaveAttribute('aria-invalid')
  })

  it('setFieldValue cambia un valor sin evento nativo y descarta el error que devolvió el servicio', async () => {
    const onValid = vi.fn().mockResolvedValue({ nombre: 'Ese nombre ya está en uso.' })
    const { user } = setup(onValid)
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(campo('Nombre')).toHaveAccessibleDescription('Ese nombre ya está en uso.')

    await user.click(screen.getByRole('button', { name: 'Usar «Lucía»' }))

    expect(campo('Nombre')).toHaveValue('Lucía')
    expect(campo('Nombre')).not.toHaveAttribute('aria-invalid')
  })

  it('isDirty compara con los valores iniciales y reset los restaura', async () => {
    const { user } = setup()
    expect(screen.getByText('Sin cambios')).toBeInTheDocument()

    await user.type(campo('Nombre'), 'Ana')
    expect(screen.getByText('Con cambios')).toBeInTheDocument()

    await user.clear(campo('Nombre'))
    expect(screen.getByText('Sin cambios')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Acepto' }))
    await user.click(screen.getByRole('button', { name: 'Restablecer' }))
    expect(screen.getByText('Sin cambios')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Acepto' })).not.toBeChecked()
    expect(campo('Nombre')).not.toHaveAttribute('aria-invalid')
  })

  it('resetTo toma los valores dados como los nuevos iniciales, como tras guardar', async () => {
    const { user } = setup()
    await user.type(campo('Nombre'), 'Ana')
    await user.click(campo('Correo'))
    await user.tab()
    expect(campo('Correo')).toHaveAttribute('aria-invalid', 'true')

    await user.click(screen.getByRole('button', { name: 'Fijar como iniciales' }))

    expect(screen.getByText('Sin cambios')).toBeInTheDocument()
    expect(campo('Nombre')).toHaveValue('Ana')
    expect(campo('Correo')).not.toHaveAttribute('aria-invalid')

    await user.type(campo('Nombre'), 'lía')
    expect(screen.getByText('Con cambios')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restablecer' }))
    expect(campo('Nombre')).toHaveValue('Ana')
    expect(screen.getByText('Sin cambios')).toBeInTheDocument()
  })
})
