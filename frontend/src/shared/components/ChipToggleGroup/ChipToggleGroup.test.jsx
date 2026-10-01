import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ChipToggleGroup from './ChipToggleGroup.jsx'

const OPCIONES = [
  { value: 'cat-01', label: 'Audiovisuales' },
  { value: 'cat-02', label: 'Redes y conectividad' },
  { value: 'cat-03', label: 'Climatización' },
  { value: 'cat-04', label: 'Eléctrico' },
]

function Especialidades({ onChange, ...props }) {
  const [value, setValue] = useState([])

  function handleChange(next) {
    setValue(next)
    onChange?.(next)
  }

  return (
    <>
      <ChipToggleGroup
        label="Especialidad"
        name="especialidades"
        options={OPCIONES}
        value={value}
        onChange={handleChange}
        {...props}
      />
      <button type="button">Siguiente</button>
    </>
  )
}

function setup(props) {
  const user = userEvent.setup({ delay: null })
  render(<Especialidades {...props} />)
  return { user }
}

const chip = (name) => screen.getByRole('button', { name })
const grupo = () => screen.getByRole('group', { name: 'Especialidad' })

describe('ChipToggleGroup', () => {
  it('cada opción es un botón que alterna aria-pressed y muestra «✓» cuando está elegida', async () => {
    const onChange = vi.fn()
    const { user } = setup({ onChange })
    expect(grupo()).toBeInTheDocument()
    expect(chip('Audiovisuales')).toHaveAttribute('aria-pressed', 'false')
    expect(chip('Audiovisuales')).not.toHaveTextContent('✓')

    await user.click(chip('Audiovisuales'))
    await user.click(chip('Climatización'))

    expect(chip('Audiovisuales')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Audiovisuales')).toHaveTextContent('Audiovisuales✓')
    expect(onChange).toHaveBeenLastCalledWith(['cat-01', 'cat-03'])

    await user.click(chip('Audiovisuales'))
    expect(chip('Audiovisuales')).toHaveAttribute('aria-pressed', 'false')
    expect(onChange).toHaveBeenLastCalledWith(['cat-03'])
  })

  it('se usa con el teclado: Tab recorre los chips y Espacio o Enter los alternan', async () => {
    const { user } = setup()

    await user.tab()
    expect(chip('Audiovisuales')).toHaveFocus()
    await user.keyboard(' ')
    await user.tab()
    await user.keyboard('{Enter}')

    expect(screen.getAllByRole('button', { pressed: true }).map((button) => button.textContent)).toEqual([
      'Audiovisuales✓',
      'Redes y conectividad✓',
    ])
  })

  it('al llegar al máximo inhabilita las demás opciones y muestra el mensaje', async () => {
    const onChange = vi.fn()
    const { user } = setup({ max: 2, maxMessage: 'Ya elegiste dos categorías.', onChange })

    await user.click(chip('Audiovisuales'))
    await user.click(chip('Redes y conectividad'))

    expect(grupo()).toHaveAccessibleDescription('Ya elegiste dos categorías.')
    expect(chip('Climatización')).toHaveAttribute('aria-disabled', 'true')
    expect(chip('Audiovisuales')).not.toHaveAttribute('aria-disabled')

    await user.click(chip('Climatización'))
    expect(chip('Climatización')).toHaveAttribute('aria-pressed', 'false')
    expect(onChange).toHaveBeenCalledTimes(2)

    await user.click(chip('Audiovisuales'))
    expect(chip('Climatización')).not.toHaveAttribute('aria-disabled')
    expect(grupo()).not.toHaveAccessibleDescription()
  })

  it('muestra el error o la ayuda enlazados al grupo', () => {
    const { rerender } = render(
      <ChipToggleGroup label="Especialidad" options={OPCIONES} onChange={() => {}} hint="Elige tus categorías." />,
    )
    expect(grupo()).toHaveAccessibleDescription('Elige tus categorías.')

    rerender(
      <ChipToggleGroup
        label="Especialidad"
        options={OPCIONES}
        onChange={() => {}}
        hint="Elige tus categorías."
        error="Elige entre una y tres categorías."
      />,
    )
    expect(grupo()).toHaveAccessibleDescription('Elige entre una y tres categorías.')
  })

  it('llama a onBlur solo cuando el foco sale del grupo', async () => {
    const onBlur = vi.fn()
    const { user } = setup({ onBlur })

    await user.tab()
    await user.tab()
    expect(chip('Redes y conectividad')).toHaveFocus()
    expect(onBlur).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onBlur).toHaveBeenCalledOnce()
    expect(onBlur.mock.calls[0][0].target).toHaveAttribute('name', 'especialidades')
  })

  it('deshabilitado no permite cambiar la selección', async () => {
    const onChange = vi.fn()
    const { user } = setup({ disabled: true, onChange })

    await user.click(chip('Audiovisuales'))

    expect(chip('Audiovisuales')).toBeDisabled()
    expect(onChange).not.toHaveBeenCalled()
  })
})
