import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY, sessionRepository } from '../repositories/session.repository.js'
import { DEMO, renderApp } from '../test/test-utils.jsx'

const TITULO_LANDING = 'Reporta una falla del campus y sigue su atención en un solo lugar'
const PILDORA = { usuario: 'Mis tickets abiertos', tecnico: 'Asignados a mí', supervisor: 'Cola sin asignar' }

const buscador = () => screen.getByRole('textbox', { name: 'Buscar ticket por código' })
const botonMenu = () => screen.getByRole('button', { name: 'Menú' })
const enlacesDe = (menu) =>
  within(menu)
    .getAllByRole('link')
    .map((link) => [link.textContent, link.getAttribute('href')])

/** Abre la aplicación con la sesión iniciada y espera a que la cabecera muestre el contador del rol. */
async function renderPanel(route, rol = 'usuario') {
  const view = renderApp(route, { usuario: DEMO[rol] })
  await screen.findByText(PILDORA[rol])
  return view
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime('2026-10-01T15:00:00.000Z')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AppLayout · cabecera y pie', () => {
  it('muestra la marca, el buscador, el contador del rol y la persona que ingresó (p10)', async () => {
    await renderPanel('/mi-cuenta')

    const cabecera = screen.getByRole('banner')
    expect(within(cabecera).getByRole('link', { name: 'Mesa de Ayuda' })).toHaveAttribute('href', '/usuario')
    expect(buscador()).toHaveAttribute('placeholder', 'Buscar por código de ticket · TCK-2026-…')
    expect(within(cabecera).getByRole('search')).toContainElement(buscador())
    expect(within(cabecera).getByText(PILDORA.usuario).closest('p')).toHaveTextContent('Mis tickets abiertos 3')
    expect(within(cabecera).getByText('Camila Quispe Ramos')).toBeInTheDocument()
    expect(within(cabecera).getByText('Usuario')).toBeInTheDocument()
    expect(within(cabecera).getByText('CQ')).toBeInTheDocument()

    const pie = screen.getByRole('contentinfo')
    expect(pie).toHaveTextContent('Mesa de Ayuda de Servicios del Campus · Universidad de Lima')
    expect(pie).toHaveTextContent('soporte.campus@ulima.edu.pe · anexo 30500 · Términos · Privacidad')
    expect(within(pie).getByRole('link', { name: 'soporte.campus@ulima.edu.pe' })).toHaveAttribute(
      'href',
      'mailto:soporte.campus@ulima.edu.pe',
    )
  })

  it.each([
    ['tecnico', '/tecnico', 'Asignados a mí 8', 'Julio Paredes Soto', 'Técnico', 'JP'],
    ['supervisor', '/supervisor', 'Cola sin asignar 2', 'Lucía Mendoza Ríos', 'Supervisor', 'LM'],
  ])('la cabecera del %s muestra su contador y su rol', async (rol, inicio, pildora, nombre, etiqueta, iniciales) => {
    await renderPanel(inicio, rol)

    const cabecera = screen.getByRole('banner')
    expect(within(cabecera).getByText(PILDORA[rol]).closest('p')).toHaveTextContent(pildora)
    expect(within(cabecera).getByText(nombre)).toBeInTheDocument()
    expect(within(cabecera).getByText(etiqueta)).toBeInTheDocument()
    expect(within(cabecera).getByText(iniciales)).toBeInTheDocument()
    expect(within(cabecera).getByRole('link', { name: 'Mesa de Ayuda' })).toHaveAttribute('href', inicio)
  })
})

describe('AppLayout · menú lateral', () => {
  it('el usuario ve «Mis servicios» con sus contadores y solo el ítem actual resaltado', async () => {
    await renderPanel('/usuario/tickets')

    const menu = screen.getByRole('navigation', { name: 'Mis servicios' })
    expect(enlacesDe(menu)).toEqual([
      ['Inicio', '/usuario'],
      ['Nuevo ticket', '/usuario/tickets/nuevo'],
      ['Mis tickets 12', '/usuario/tickets'],
      ['Encuesta pendiente 1', '/usuario/encuestas/pendiente'],
      ['Mis encuestas 7', '/usuario/encuestas'],
      ['Mi cuenta', '/mi-cuenta'],
    ])
    const actuales = within(menu)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(actuales.map((link) => link.textContent)).toEqual(['Mis tickets 12'])
    expect(screen.getAllByRole('link', { name: 'Mi cuenta' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('el técnico ve «Atención» y el supervisor «Supervisión» (SPEC §9)', async () => {
    const { unmount } = await renderPanel('/tecnico', 'tecnico')
    expect(enlacesDe(screen.getByRole('navigation', { name: 'Atención' }))).toEqual([
      ['Mi bandeja 8', '/tecnico'],
      ['Historial', '/tecnico/historial'],
      ['Mi cuenta', '/mi-cuenta'],
    ])
    unmount()

    await renderPanel('/supervisor/usuarios', 'supervisor')
    const menu = screen.getByRole('navigation', { name: 'Supervisión' })
    expect(enlacesDe(menu)).toEqual([
      ['Tablero', '/supervisor'],
      ['Cola de atención', '/supervisor/cola'],
      ['Categorías', '/supervisor/categorias'],
      ['Sedes y ambientes', '/supervisor/ambientes'],
      ['Técnicos por categoría', '/supervisor/tecnicos'],
      ['Usuarios', '/supervisor/usuarios'],
      ['Invitaciones', '/supervisor/invitaciones'],
      ['Mi cuenta', '/mi-cuenta'],
    ])
    expect(within(menu).getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu).getByRole('link', { name: 'Tablero' })).not.toHaveAttribute('aria-current')
  })

  it('«Menú» abre el menú lateral, que se cierra con Esc y devuelve el foco al botón', async () => {
    const { user } = await renderPanel('/usuario/encuestas')
    expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
    expect(botonMenu()).toHaveAttribute('aria-controls', 'menu-lateral')

    await user.click(botonMenu())

    expect(botonMenu()).toHaveAttribute('aria-expanded', 'true')
    expect(within(screen.getByRole('navigation', { name: 'Mis servicios' })).getByRole('link', { name: 'Inicio' })).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
    expect(botonMenu()).toHaveFocus()
  })

  it('el menú lateral se cierra al navegar, al tocar el fondo y cuando el foco sale de él', async () => {
    const { user } = await renderPanel('/usuario')

    await user.click(botonMenu())
    await user.click(within(screen.getByRole('navigation', { name: 'Mis servicios' })).getByRole('link', { name: 'Nuevo ticket' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Nuevo ticket' })).toBeInTheDocument()
    expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')

    await user.click(botonMenu())
    await user.click(document.querySelector('.app-sidebar__overlay'))
    expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
    expect(botonMenu()).toHaveFocus()

    await user.click(botonMenu())
    await user.click(buscador())
    expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
    expect(buscador()).toHaveFocus()
  })

  it('el botón «Menú» vuelve a cerrar el menú lateral', async () => {
    const { user } = await renderPanel('/usuario')

    await user.click(botonMenu())
    await user.click(botonMenu())

    expect(botonMenu()).toHaveAttribute('aria-expanded', 'false')
    expect(document.querySelector('.app-sidebar__overlay')).not.toBeInTheDocument()
  })
})

describe('AppLayout · buscador de la cabecera', () => {
  it('con Enter lleva a la lista de tickets del usuario con el código buscado', async () => {
    const { user } = await renderPanel('/usuario')

    await user.type(buscador(), ' tck-2026-00147 {Enter}')

    expect(await screen.findByRole('heading', { level: 1, name: 'Mis tickets' })).toBeInTheDocument()
    expect(screen.getByText('TCK-2026-00147')).toBeInTheDocument()
    expect(screen.getByText(/^Buscaste el código/)).toHaveTextContent(
      'Buscaste el código TCK-2026-00147. El resultado aparecerá aquí cuando esta sección esté disponible.',
    )
    expect(buscador()).toHaveValue('')
  })

  it.each([
    ['tecnico', '/tecnico/historial', 'Mi bandeja'],
    ['supervisor', '/supervisor', 'Cola de atención'],
  ])('al %s lo lleva a su lista de tickets (%s → %s)', async (rol, desde, lista) => {
    const { user } = await renderPanel(desde, rol)

    await user.type(buscador(), 'TCK-2026-00144{Enter}')

    expect(await screen.findByRole('heading', { level: 1, name: lista })).toBeInTheDocument()
    expect(screen.getByText('TCK-2026-00144')).toBeInTheDocument()
  })

  it('sin código no navega', async () => {
    const { user } = await renderPanel('/usuario')

    await user.type(buscador(), '   {Enter}')

    expect(screen.getByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument()
  })
})

describe('AppLayout · cerrar sesión', () => {
  it('«Cerrar sesión» termina la sesión, lo notifica y vuelve a la landing', async () => {
    const { user } = await renderPanel('/usuario/encuestas')

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByText('Cerraste sesión correctamente.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: TITULO_LANDING })).toBeInTheDocument()
    const cabecera = screen.getByRole('banner')
    expect(within(cabecera).getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(within(cabecera).queryByRole('link', { name: 'Ir a mi panel' })).not.toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(await screen.findByRole('heading', { level: 3, name: 'Audiovisuales' })).toBeInTheDocument()
  })

  it('si no puede cerrar la sesión lo notifica y la mantiene', async () => {
    const { user } = await renderPanel('/tecnico', 'tecnico')
    vi.spyOn(sessionRepository, 'clear').mockImplementationOnce(() => {
      throw new Error('Almacenamiento no disponible')
    })

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
    expect(screen.getByRole('heading', { level: 1, name: 'Mi bandeja' })).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
  })
})
