import { screen, waitFor, within } from '@testing-library/react'
import { useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readTable } from '../repositories/db.js'
import { solicitudesAccesoRepository } from '../repositories/solicitudesAcceso.repository.js'
import { DEMO, renderApp, renderWithProviders, ubicacionActual } from '../test/test-utils.jsx'
import AppRoutes from './AppRoutes.jsx'

const AHORA = '2026-10-01T15:00:00.000Z'
const PILDORA = { usuario: 'Mis tickets abiertos', tecnico: 'Asignados a mí', supervisor: 'Cola sin asignar' }
const CIERRE = 'Si necesitas ese acceso, solicítalo a Infraestructura y Servicios.'

const contenido = () => screen.getByRole('main')
const botonSolicitar = () => within(contenido()).getByRole('button', { name: 'Solicitar acceso' })

/** Abre `ruta` con la sesión del rol y espera a que la cabecera cargue su contador. */
async function renderComo(rol, ruta) {
  const view = renderApp(ruta, { usuario: DEMO[rol] })
  await screen.findByText(PILDORA[rol])
  return view
}

async function solicitarAcceso(user) {
  await user.click(botonSolicitar())
  const dialogo = await screen.findByRole('alertdialog', { name: '¿Solicitar acceso?' })
  await user.click(within(dialogo).getByRole('button', { name: 'Enviar solicitud' }))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('RequireRole · vista 403', () => {
  it('un usuario en la cola de atención ve el 403 dentro de su layout y sin cambiar la URL (p11)', async () => {
    await renderComo('usuario', '/supervisor/cola')

    expect(within(contenido()).getByText('403')).toBeInTheDocument()
    expect(
      within(contenido()).getByRole('heading', { level: 1, name: 'No tienes permiso para ver la cola de atención' }),
    ).toBeInTheDocument()
    expect(
      within(contenido()).getByText(
        `Tu cuenta tiene el rol de usuario. La cola, la asignación y el catálogo de servicios son exclusivos del supervisor. ${CIERRE}`,
      ),
    ).toBeInTheDocument()
    expect(within(contenido()).getByRole('link', { name: 'Ir a mis tickets' })).toHaveAttribute(
      'href',
      '/usuario/tickets',
    )
    expect(botonSolicitar()).toBeEnabled()
    expect(within(contenido()).queryByRole('heading', { name: 'Cola de atención' })).not.toBeInTheDocument()

    expect(ubicacionActual()).toBe('/supervisor/cola')
    expect(screen.getByRole('navigation', { name: 'Mis servicios' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveTextContent('Camila Quispe Ramos')
    expect(document.title).toBe('Acceso denegado · Mesa de Ayuda')
  })

  it('el supervisor sí ve la cola de atención', async () => {
    await renderComo('supervisor', '/supervisor/cola')

    expect(within(contenido()).getByRole('heading', { level: 1, name: 'Cola de atención' })).toBeInTheDocument()
    expect(within(contenido()).queryByText('403')).not.toBeInTheDocument()
  })

  it('un técnico en el inicio del usuario ve el 403 y vuelve a su bandeja', async () => {
    const { user } = await renderComo('tecnico', '/usuario')

    expect(
      within(contenido()).getByRole('heading', { level: 1, name: 'No tienes permiso para ver el inicio del usuario' }),
    ).toBeInTheDocument()
    expect(
      within(contenido()).getByText(
        `Tu cuenta tiene el rol de técnico. El registro de tickets, su seguimiento y las encuestas son exclusivos del usuario. ${CIERRE}`,
      ),
    ).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/usuario')

    await user.click(within(contenido()).getByRole('link', { name: 'Ir a mi bandeja' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi bandeja' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe('/tecnico')
  })

  it('un supervisor en el historial del técnico ve el 403 con el acceso a su tablero', async () => {
    await renderComo('supervisor', '/tecnico/historial')

    const titulo = 'No tienes permiso para ver el historial de atención'
    expect(within(contenido()).getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
    expect(within(contenido()).getByText(/^Tu cuenta tiene el rol de supervisor\. La bandeja/)).toBeInTheDocument()
    expect(within(contenido()).getByRole('link', { name: 'Ir al tablero' })).toHaveAttribute('href', '/supervisor')
  })

  it('/acceso-denegado muestra la misma vista con un texto general y sin solicitud', async () => {
    await renderComo('tecnico', '/acceso-denegado')

    expect(within(contenido()).getByText('403')).toBeInTheDocument()
    expect(
      within(contenido()).getByRole('heading', { level: 1, name: 'No tienes permiso para ver esta página' }),
    ).toBeInTheDocument()
    expect(within(contenido()).getByText(`Tu cuenta tiene el rol de técnico. ${CIERRE}`)).toBeInTheDocument()
    expect(within(contenido()).getByRole('link', { name: 'Ir a mi bandeja' })).toBeInTheDocument()
    expect(within(contenido()).queryByRole('button', { name: 'Solicitar acceso' })).not.toBeInTheDocument()
  })
})

describe('RequireRole · «Solicitar acceso»', () => {
  it('tras confirmar envía la solicitud, lo notifica y queda como «Solicitud enviada»', async () => {
    const { user } = await renderComo('usuario', '/supervisor/cola')

    await user.click(botonSolicitar())
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Solicitar acceso?' })
    expect(dialogo).toHaveAccessibleDescription(
      'Enviaremos a Infraestructura y Servicios tu solicitud para ver la cola de atención.',
    )
    await user.click(within(dialogo).getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByText('Enviamos tu solicitud a Infraestructura y Servicios.')).toBeInTheDocument()
    expect(within(contenido()).getByRole('button', { name: 'Solicitud enviada' })).toBeDisabled()
    expect(readTable('solicitudesAcceso')).toEqual([
      { id: 'sol-001', usuarioId: DEMO.usuario, recurso: 'la cola de atención', creadaEn: AHORA },
    ])
  })

  it('si se cancela la confirmación no envía nada', async () => {
    const { user } = await renderComo('usuario', '/supervisor/cola')

    await user.click(botonSolicitar())
    const dialogo = await screen.findByRole('alertdialog', { name: '¿Solicitar acceso?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(botonSolicitar()).toHaveFocus()
    expect(readTable('solicitudesAcceso')).toEqual([])
  })

  it('si ya la había enviado lo avisa y también queda como «Solicitud enviada»', async () => {
    solicitudesAccesoRepository.insert({
      id: 'sol-001',
      usuarioId: DEMO.usuario,
      recurso: 'la cola de atención',
      creadaEn: '2026-09-30T15:00:00.000Z',
    })
    const { user } = await renderComo('usuario', '/supervisor/cola')

    await solicitarAcceso(user)

    expect(
      await screen.findByText(
        'Ya habías solicitado acceso a la cola de atención. Infraestructura y Servicios está revisando tu solicitud.',
      ),
    ).toBeInTheDocument()
    expect(within(contenido()).getByRole('button', { name: 'Solicitud enviada' })).toBeDisabled()
    expect(readTable('solicitudesAcceso')).toHaveLength(1)
  })

  it('si el envío falla lo notifica y permite reintentar', async () => {
    vi.spyOn(solicitudesAccesoRepository, 'insert').mockImplementationOnce(() => {
      throw new Error('Sin espacio')
    })
    const { user } = await renderComo('usuario', '/supervisor/cola')

    await solicitarAcceso(user)

    expect(await screen.findByText('Ocurrió un error inesperado. Inténtalo otra vez.')).toBeInTheDocument()
    await waitFor(() => expect(botonSolicitar()).toBeEnabled())
    expect(readTable('solicitudesAcceso')).toEqual([])
  })

  it('al pasar a otra sección prohibida la solicitud vuelve a estar disponible para ese recurso', async () => {
    function IrAInvitaciones() {
      const navigate = useNavigate()
      return (
        <button type="button" onClick={() => navigate('/supervisor/invitaciones')}>
          Abrir invitaciones
        </button>
      )
    }
    const { user } = renderWithProviders(
      <>
        <AppRoutes />
        <IrAInvitaciones />
      </>,
      { route: '/supervisor/cola', usuario: DEMO.usuario },
    )
    await screen.findByText(PILDORA.usuario)
    await solicitarAcceso(user)
    await within(contenido()).findByRole('button', { name: 'Solicitud enviada' })

    await user.click(screen.getByRole('button', { name: 'Abrir invitaciones' }))

    expect(
      within(contenido()).getByRole('heading', { level: 1, name: 'No tienes permiso para ver las invitaciones' }),
    ).toBeInTheDocument()
    expect(botonSolicitar()).toBeEnabled()
  })
})
