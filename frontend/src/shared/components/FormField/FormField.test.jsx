import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Checkbox from '../Checkbox/Checkbox.jsx'
import PasswordInput from '../PasswordInput/PasswordInput.jsx'
import SelectInput from '../SelectInput/SelectInput.jsx'
import TextInput from '../TextInput/TextInput.jsx'
import FormField from './FormField.jsx'

describe('FormField y controles', () => {
  it('asocia la etiqueta y la ayuda al control', () => {
    render(
      <FormField label="Teléfono" hint="Para coordinar el acceso al ambiente.">
        <TextInput name="telefono" />
      </FormField>,
    )

    const input = screen.getByLabelText('Teléfono')
    expect(input).toHaveAccessibleDescription('Para coordinar el acceso al ambiente.')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('muestra el error junto al campo y marca el control como inválido', () => {
    render(
      <FormField label="Confirmar contraseña" hint="Repite la contraseña." error="Las contraseñas no coinciden.">
        <PasswordInput name="confirmacion" />
      </FormField>,
    )

    const input = screen.getByLabelText('Confirmar contraseña')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Las contraseñas no coinciden.')
    expect(screen.queryByText('Repite la contraseña.')).not.toBeInTheDocument()
  })

  it('muestra el mensaje de éxito', () => {
    render(
      <FormField label="Correo institucional" success="Correo válido y disponible.">
        <TextInput name="correo" defaultValue="camila.quispe@aloe.ulima.edu.pe" />
      </FormField>,
    )

    expect(screen.getByLabelText('Correo institucional')).toHaveAccessibleDescription('Correo válido y disponible.')
  })

  it('PasswordInput alterna entre «Mostrar» y «Ocultar»', async () => {
    const user = userEvent.setup()
    render(
      <FormField label="Contraseña">
        <PasswordInput name="password" defaultValue="Camila2026" />
      </FormField>,
    )
    const input = screen.getByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('SelectInput muestra el marcador y las opciones', async () => {
    const user = userEvent.setup()
    render(
      <FormField label="Vínculo con la universidad">
        <SelectInput
          name="vinculo"
          defaultValue=""
          placeholder="Selecciona tu vínculo"
          options={['Estudiante', { value: 'Docente', label: 'Docente' }]}
        />
      </FormField>,
    )
    const select = screen.getByLabelText('Vínculo con la universidad')

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Selecciona tu vínculo',
      'Estudiante',
      'Docente',
    ])
    await user.selectOptions(select, 'Docente')
    expect(select).toHaveValue('Docente')
  })

  it('Checkbox enlaza su error', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Acepto los términos del servicio y la política de privacidad." error="Debes aceptar los términos para continuar." />)
    const checkbox = screen.getByRole('checkbox', { name: 'Acepto los términos del servicio y la política de privacidad.' })

    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
    expect(checkbox).toHaveAccessibleDescription('Debes aceptar los términos para continuar.')
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })
})
