import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO, renderApp, ubicacionActual } from '../../test/test-utils.jsx'

const AHORA = '2026-10-01T15:00:00.000Z'
const PILDORA = { usuario: 'Mis tickets abiertos', tecnico: 'Asignados a mí', supervisor: 'Cola sin asignar' }

// cerrado por Iván después de una espera
const CERRADO = 'TCK-2026-00130'
// lo atiende Julio
const EN_ATENCION = 'TCK-2026-00144'

const contenido = () => screen.getByRole('main')
const cambios = (codigo) => within(screen.getByRole('list', { name: `Cambios de ${codigo}` })).getAllByRole('listitem')
const etapas = () => within(screen.getByRole('region', { name: 'Tiempo por etapa' })).getAllByRole('listitem')
const ruta = () => screen.getByRole('navigation', { name: 'Ruta de navegación' })

async function renderHistorial(codigo, rol = 'tecnico') {
  const view = renderApp(`/${rol}/tickets/${codigo}/historial`, { usuario: DEMO[rol] })
  await screen.findByRole('heading', { level: 1, name: 'Historial de cambios' })
  await screen.findByText(PILDORA[rol])
  return view
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('HistorialCambiosPage', () => {
  it('muestra cada cambio de estado con su autor, su momento y cuánto duró (p27)', async () => {
    await renderHistorial(CERRADO, 'supervisor')

    expect(
      screen.getByText('Extensión eléctrica en mal estado · E-304 · cerrado el 01/09/2026 · tiempo total 1 d 6 h 12 min'),
    ).toBeInTheDocument()
    const [abierto, asignado, enAtencion, enEspera, resuelto, cerrado] = cambios(CERRADO)
    expect(cambios(CERRADO)).toHaveLength(6)
    expect(abierto).toHaveTextContent('Abierto')
    expect(abierto).toHaveTextContent('31/08/2026 09:04 · Camila Quispe Ramos (usuario) · prioridad inicial alta')
    expect(abierto).toHaveTextContent('Permaneció 1 h 08 min en este estado')
    expect(enAtencion).toHaveTextContent('En atención')
    expect(enAtencion).toHaveTextContent('31/08/2026 10:12 · Iván Zegarra Pinto (técnico)')
    expect(enAtencion).toHaveTextContent('Permaneció 5 h 48 min en este estado')
    expect(resuelto).toHaveTextContent('Resuelto')
    expect(resuelto).toHaveTextContent('01/09/2026 10:30 · Iván Zegarra Pinto (técnico)')
    expect(resuelto).toHaveTextContent('Permaneció 4 h 46 min en este estado')
    expect(document.title).toBe('Historial de TCK-2026-00130 · Mesa de Ayuda')

    expect(asignado).toHaveTextContent('Asignado a Iván Zegarra Pinto')
    expect(asignado).toHaveTextContent('31/08/2026 09:50 · Lucía Mendoza Ríos (supervisor)')
    expect(asignado).not.toHaveTextContent('en este estado')

    expect(enEspera).toHaveTextContent('En espera · Repuesto de canaleta: el almacén lo entrega al día siguiente.')
    expect(enEspera).toHaveTextContent('31/08/2026 16:00 · Iván Zegarra Pinto (técnico) · retorno estimado 01/09/2026')
    expect(enEspera).not.toHaveTextContent('Motivo:')
    expect(enEspera).toHaveTextContent('Permaneció 18 h 30 min en este estado')

    expect(cerrado).toHaveTextContent('Cerrado')
    expect(cerrado).toHaveTextContent('01/09/2026 15:16 · Iván Zegarra Pinto (técnico) · encuesta enviada al usuario')
    expect(cerrado).not.toHaveTextContent('Solución:')
    expect(cerrado).not.toHaveTextContent('en este estado')
  })

  it('resume el tiempo por etapa e indica qué parte del tiempo fue espera', async () => {
    await renderHistorial(CERRADO, 'supervisor')

    expect(etapas().map((etapa) => etapa.textContent)).toEqual([
      'Abierto 1 h 08 min',
      'En atención 5 h 48 min',
      'En espera 18 h 30 min',
      'Resuelto 4 h 46 min',
    ])
    expect(
      screen.getByText(
        'El 61 % del tiempo se consumió en espera. El tiempo en espera no cuenta para el tiempo esperado de atención.',
      ),
    ).toBeInTheDocument()
  })

  it('en un ticket en curso el estado actual sigue contando', async () => {
    await renderHistorial(EN_ATENCION)

    expect(
      screen.getByText('Punto de red caído en laboratorio · H-210 · en atención · tiempo total 1 d 18 h 20 min'),
    ).toBeInTheDocument()
    expect(cambios(EN_ATENCION)).toHaveLength(3)
    expect(cambios(EN_ATENCION)[0]).toHaveTextContent('Permaneció 30 min en este estado')
    expect(cambios(EN_ATENCION)[2]).toHaveTextContent('29/09/2026 16:10 · Julio Paredes Soto (técnico)')
    expect(cambios(EN_ATENCION)[2]).toHaveTextContent('Lleva 1 d 17 h 50 min en este estado')
    expect(etapas().map((etapa) => etapa.textContent)).toEqual(['Abierto 30 min', 'En atención 1 d 17 h 50 min'])
    expect(screen.queryByText(/se consumió en espera/)).not.toBeInTheDocument()
  })

  it('la ruta de navegación lleva a la lista del rol y al ticket', async () => {
    const { user } = await renderHistorial(EN_ATENCION)

    expect(within(ruta()).getByRole('link', { name: 'Mi bandeja' })).toHaveAttribute('href', '/tecnico')
    expect(within(ruta()).getByRole('link', { name: EN_ATENCION })).toHaveAttribute('href', `/tecnico/tickets/${EN_ATENCION}`)
    expect(screen.queryByRole('link', { name: 'Volver al ticket' })).not.toBeInTheDocument()
    await user.click(within(ruta()).getByRole('link', { name: EN_ATENCION }))

    expect(await screen.findByRole('heading', { level: 1, name: EN_ATENCION })).toBeInTheDocument()
    expect(ubicacionActual()).toBe(`/tecnico/tickets/${EN_ATENCION}`)
  })

  it('la supervisora llega desde la cola y vuelve al ticket en su panel', async () => {
    await renderHistorial(CERRADO, 'supervisor')

    expect(within(ruta()).getByRole('link', { name: 'Cola de atención' })).toHaveAttribute('href', '/supervisor/cola')
    expect(within(ruta()).getByRole('link', { name: CERRADO })).toHaveAttribute('href', `/supervisor/tickets/${CERRADO}`)
  })

  it('desde el ticket, «Historial» abre su historial con el cambio de estado recién hecho', async () => {
    const { user } = renderApp(`/tecnico/tickets/${EN_ATENCION}`, { usuario: DEMO.tecnico })
    await screen.findByRole('heading', { level: 1, name: EN_ATENCION })

    await user.click(screen.getByRole('button', { name: 'Cambiar estado' }))
    await user.click(screen.getByRole('radio', { name: 'Resuelto · la falla ya no se presenta' }))
    await user.click(screen.getByRole('button', { name: 'Guardar estado' }))
    await screen.findByText('Estado actualizado: Resuelto.')
    await user.click(within(contenido()).getByRole('link', { name: 'Historial' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Historial de cambios' })).toBeInTheDocument()
    expect(ubicacionActual()).toBe(`/tecnico/tickets/${EN_ATENCION}/historial`)
    expect(cambios(EN_ATENCION)).toHaveLength(4)
    expect(cambios(EN_ATENCION)[3]).toHaveTextContent('Resuelto')
    expect(cambios(EN_ATENCION)[3]).toHaveTextContent('01/10/2026 10:00 · Julio Paredes Soto (técnico)')
    expect(cambios(EN_ATENCION)[3]).toHaveTextContent('Lleva menos de 1 min en este estado')
  })

  it('indica con un 404 que el código no es de ningún ticket', async () => {
    renderApp('/tecnico/tickets/TCK-2026-99999/historial', { usuario: DEMO.tecnico })

    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos el ticket TCK-2026-99999' })).toBeInTheDocument()
  })

  it('un usuario ve el acceso denegado', async () => {
    renderApp(`/supervisor/tickets/${CERRADO}/historial`, { usuario: DEMO.usuario })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No tienes permiso para ver el historial del ticket' }),
    ).toBeInTheDocument()
  })
})
