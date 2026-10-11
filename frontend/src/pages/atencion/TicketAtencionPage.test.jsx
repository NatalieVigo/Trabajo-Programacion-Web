import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bitacoraRepository, historialRepository } from '../../repositories/atencion.repository.js'
import { readTable, writeTable } from '../../repositories/db.js'
import { ticketsRepository } from '../../repositories/tickets.repository.js'
import { DEMO, renderApp } from '../../test/test-utils.jsx'

const AHORA = '2026-10-01T15:00:00.000Z'
const PILDORA = { usuario: 'Mis tickets abiertos', tecnico: 'Asignados a mí', supervisor: 'Cola sin asignar' }

/** Lo reportó Camila y lo atiende Julio. */
const EN_ATENCION = 'TCK-2026-00144'
const RESUELTO = 'TCK-2026-00141'
const DE_SANDRA = 'TCK-2026-00138'
const SIN_ASIGNAR = 'TCK-2026-00147'
const CERRADO = 'TCK-2026-00131'

const lista = () => screen.getByRole('list', { name: 'Entradas de la bitácora' })
const entradas = () => within(lista()).getAllByRole('listitem')
const formulario = () => screen.queryByRole('form', { name: 'Nueva entrada de la bitácora' })
const campo = (nombre) => screen.getByRole('textbox', { name: nombre })
const filtro = () => screen.getByRole('combobox', { name: 'Entradas que se muestran' })
const etiquetas = () => screen.getByText('Prioridad:').closest('p')
const boton = (nombre) => screen.queryByRole('button', { name: nombre })
const dialogo = (nombre) => screen.queryByRole('dialog', { name: nombre })
const opcion = (nombre) => screen.getByRole('radio', { name: nombre })

/** Abre el ticket en el panel del rol y espera su cabecera y el contador de la cabecera de la aplicación. */
async function renderTicket(codigo, rol = 'tecnico') {
  const view = renderApp(`/${rol}/tickets/${codigo}`, { usuario: DEMO[rol] })
  await screen.findByRole('heading', { level: 1, name: codigo })
  await screen.findByText(PILDORA[rol])
  return view
}

/** Cambia un ticket directamente en la base, como si lo hubiera hecho otra persona mientras la página está abierta. */
function modificarTicket(ticketId, cambios) {
  writeTable(
    'tickets',
    readTable('tickets').map((ticket) => (ticket.id === ticketId ? { ...ticket, ...cambios } : ticket)),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TicketAtencionPage · bitácora', () => {
  it('muestra la cabecera del ticket y cada entrada con su autor, su momento y su tipo (p25)', async () => {
    await renderTicket(EN_ATENCION)

    expect(screen.getByText('Punto de red caído en laboratorio · Redes y conectividad')).toBeInTheDocument()
    expect(etiquetas()).toHaveTextContent('Prioridad: Crítica. Estado: En atención')
    expect(screen.getByRole('heading', { level: 2, name: 'Bitácora · 4 entradas' })).toBeInTheDocument()
    expect(entradas()).toHaveLength(4)
    expect(entradas()[0]).toHaveTextContent('Camila Quispe Ramos Usuario · 29/09/2026 15:40')
    expect(entradas()[0]).toHaveTextContent('Comentario público')
    expect(entradas()[0]).toHaveTextContent('No hay red en ninguna computadora del laboratorio H-210.')
    expect(entradas()[1]).toHaveTextContent('Lucía Mendoza Ríos Supervisor · 29/09/2026 15:52')
    expect(entradas()[2]).toHaveTextContent('Julio Paredes Soto Técnico · 29/09/2026 16:30')
    expect(entradas()[2]).toHaveTextContent('Nota interna · no visible para el usuario')
    expect(within(screen.getByRole('navigation', { name: 'Ruta de navegación' })).getByRole('link')).toHaveAttribute(
      'href',
      '/tecnico',
    )
    expect(document.title).toBe('TCK-2026-00144 · Mesa de Ayuda')
  })

  it('filtra las entradas por tipo', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.selectOptions(filtro(), 'Mostrar: notas internas')
    expect(entradas()).toHaveLength(1)
    expect(entradas()[0]).toHaveTextContent('El switch del gabinete del piso 2 está apagado')

    await user.selectOptions(filtro(), 'Mostrar: comentarios públicos')
    expect(entradas()).toHaveLength(3)
    expect(screen.getByRole('heading', { level: 2, name: 'Bitácora · 4 entradas' })).toBeInTheDocument()
  })

  it('sin entradas del tipo elegido lo indica', async () => {
    const { user } = await renderTicket(SIN_ASIGNAR)

    await user.selectOptions(filtro(), 'Mostrar: notas internas')

    expect(screen.getByRole('heading', { level: 3, name: 'Este ticket no tiene notas internas' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Entradas de la bitácora' })).not.toBeInTheDocument()
  })

  it('publica un comentario, lo agrega a la bitácora y lo notifica', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    expect(screen.getByText('Estás escribiendo un comentario público: también lo verá Camila Quispe Ramos.')).toBeInTheDocument()
    await user.type(campo('Comentario público'), 'Ya llegó energía al gabinete.')
    expect(screen.getByText('29 / 600 caracteres')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Publicar comentario' }))

    expect(await screen.findByText('Comentario publicado.')).toBeInTheDocument()
    expect(entradas()).toHaveLength(5)
    expect(entradas()[4]).toHaveTextContent('Julio Paredes Soto Técnico · 01/10/2026 10:00')
    expect(entradas()[4]).toHaveTextContent('Ya llegó energía al gabinete.')
    expect(screen.getByRole('heading', { level: 2, name: 'Bitácora · 5 entradas' })).toBeInTheDocument()
    expect(campo('Comentario público')).toHaveValue('')
    expect(bitacoraRepository.findAll({ ticketId: 'tck-00144' }).at(-1)).toMatchObject({
      autorId: DEMO.tecnico,
      tipo: 'publico',
      mensaje: 'Ya llegó energía al gabinete.',
    })
  })

  it('guarda una nota interna y deja el formulario listo para otra', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(screen.getByRole('radio', { name: 'Nota interna' }))
    expect(
      screen.getByText('Estás escribiendo una nota interna: solo la ve el equipo técnico y el supervisor.'),
    ).toBeInTheDocument()
    await user.type(campo('Nota interna'), 'Pedí un tomacorriente al almacén.')
    await user.click(screen.getByRole('button', { name: 'Guardar nota interna' }))

    expect(await screen.findByText('Nota interna guardada.')).toBeInTheDocument()
    expect(entradas()[4]).toHaveTextContent('Nota interna · no visible para el usuario')
    expect(entradas()[4]).toHaveTextContent('Pedí un tomacorriente al almacén.')
    expect(screen.getByRole('radio', { name: 'Nota interna' })).toBeChecked()
    expect(campo('Nota interna')).toHaveValue('')
    expect(bitacoraRepository.findAll({ ticketId: 'tck-00144' }).at(-1)).toMatchObject({ tipo: 'interno' })
  })

  it('con el mensaje vacío señala el error junto al campo y no guarda nada', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.type(campo('Comentario público'), '   ')
    await user.click(screen.getByRole('button', { name: 'Publicar comentario' }))

    expect(campo('Comentario público')).toHaveAccessibleDescription('Escribe un mensaje antes de guardar.')
    expect(campo('Comentario público')).toBeInvalid()
    expect(campo('Comentario público')).toHaveFocus()
    expect(bitacoraRepository.findAll()).toHaveLength(44)
  })

  it('un ticket cerrado solo se lee', async () => {
    await renderTicket(CERRADO)

    expect(etiquetas()).toHaveTextContent('Estado: Cerrado')
    expect(entradas()).toHaveLength(4)
    expect(formulario()).not.toBeInTheDocument()
    expect(screen.getByText('El ticket está cerrado: su bitácora ya no admite entradas.')).toBeInTheDocument()
  })

  it('el técnico consulta el ticket de otro técnico o uno en cola, sin poder escribir', async () => {
    const { unmount } = await renderTicket(DE_SANDRA)
    expect(entradas()).toHaveLength(3)
    expect(formulario()).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'Este ticket lo atiende Sandra Nolasco Ríos. Puedes consultarlo, pero solo quien lo atiende registra el avance.',
      ),
    ).toBeInTheDocument()
    unmount()

    await renderTicket(SIN_ASIGNAR)
    expect(formulario()).not.toBeInTheDocument()
    expect(
      screen.getByText('Este ticket aún no tiene un técnico asignado: quien lo reciba registrará aquí su avance.'),
    ).toBeInTheDocument()
  })

  it('la supervisora lee las notas internas y escribe en cualquier ticket', async () => {
    const { user } = await renderTicket(DE_SANDRA, 'supervisor')

    expect(entradas()[2]).toHaveTextContent('Nota interna · no visible para el usuario')
    expect(within(screen.getByRole('navigation', { name: 'Ruta de navegación' })).getByRole('link')).toHaveAttribute(
      'href',
      '/supervisor/cola',
    )
    await user.type(campo('Comentario público'), 'El repuesto se aprobó hoy.')
    await user.click(screen.getByRole('button', { name: 'Publicar comentario' }))

    expect(await screen.findByText('Comentario publicado.')).toBeInTheDocument()
    expect(entradas()[3]).toHaveTextContent('Lucía Mendoza Ríos Supervisor · 01/10/2026 10:00')
  })

  it('si el ticket se cerró mientras se escribía, lo avisa y vuelve a cargarlo', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.type(campo('Comentario público'), 'Ya llegó energía al gabinete.')
    modificarTicket('tck-00144', { estado: 'cerrado', cerradoEn: AHORA })
    await user.click(screen.getByRole('button', { name: 'Publicar comentario' }))

    // El mismo mensaje llega como notificación y, ya recargado el ticket, como motivo de la bitácora de solo lectura.
    await waitFor(() =>
      expect(screen.getAllByText('El ticket está cerrado: su bitácora ya no admite entradas.')).toHaveLength(2),
    )
    expect(formulario()).not.toBeInTheDocument()
    expect(etiquetas()).toHaveTextContent('Estado: Cerrado')
    expect(bitacoraRepository.findAll()).toHaveLength(44)
  })

  it('indica con un 404 que el código no es de ningún ticket', async () => {
    renderApp('/tecnico/tickets/tck-2026-99999', { usuario: DEMO.tecnico })

    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos el ticket TCK-2026-99999' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Mi bandeja' })).toHaveAttribute('href', '/tecnico')
    expect(document.title).toBe('Ticket no encontrado · Mesa de Ayuda')
  })

  it('un usuario ve el acceso denegado', async () => {
    renderApp(`/tecnico/tickets/${EN_ATENCION}`, { usuario: DEMO.usuario })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No tienes permiso para ver la atención del ticket' }),
    ).toBeInTheDocument()
  })
})

describe('TicketAtencionPage · cambio de estado', () => {
  const DIALOGO = 'Cambiar estado de TCK-2026-00144'

  it('ofrece «Cambiar estado» solo al técnico que tiene asignado el ticket', async () => {
    const propio = await renderTicket(EN_ATENCION)
    expect(boton('Cambiar estado')).toBeInTheDocument()
    propio.unmount()

    const ajeno = await renderTicket(DE_SANDRA)
    expect(boton('Cambiar estado')).not.toBeInTheDocument()
    ajeno.unmount()

    const cerrado = await renderTicket(CERRADO)
    expect(boton('Cambiar estado')).not.toBeInTheDocument()
    cerrado.unmount()

    await renderTicket(EN_ATENCION, 'supervisor')
    expect(boton('Cambiar estado')).not.toBeInTheDocument()
  })

  it('el diálogo ofrece los cambios que el estado actual admite y deshabilita los demás (p26)', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))

    expect(dialogo(DIALOGO)).toHaveAccessibleDescription('Estado actual: En atención. Solo se ofrecen los cambios permitidos.')
    expect(within(dialogo(DIALOGO)).getAllByRole('radio')).toHaveLength(3)
    expect(opcion('En espera · falta un repuesto o depende de un tercero')).toBeEnabled()
    expect(opcion('En espera · falta un repuesto o depende de un tercero')).toHaveFocus()
    expect(opcion('Resuelto · la falla ya no se presenta')).toBeEnabled()
    expect(opcion('Abierto · no disponible desde En atención')).toBeDisabled()
    within(dialogo(DIALOGO))
      .getAllByRole('radio')
      .forEach((radio) => expect(radio).not.toBeChecked())
  })

  it('guarda el nuevo estado, lo muestra en la cabecera y lo notifica', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    await user.click(opcion('Resuelto · la falla ya no se presenta'))
    await user.click(boton('Guardar estado'))

    expect(await screen.findByText('Estado actualizado: Resuelto.')).toBeInTheDocument()
    expect(dialogo(DIALOGO)).not.toBeInTheDocument()
    expect(etiquetas()).toHaveTextContent('Estado: Resuelto')
    expect(ticketsRepository.findById('tck-00144')).toMatchObject({ estado: 'resuelto', cerradoEn: null })
    expect(historialRepository.findAll({ ticketId: 'tck-00144' }).at(-1)).toMatchObject({
      tipo: 'estado',
      estado: 'resuelto',
      autorId: DEMO.tecnico,
      creadoEn: AHORA,
    })
  })

  it('sin elegir un estado lo señala y no cambia nada', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    await user.click(boton('Guardar estado'))

    expect(within(dialogo(DIALOGO)).getByRole('group', { name: 'Nuevo estado' })).toHaveAccessibleDescription(
      'Elige el nuevo estado.',
    )
    expect(opcion('En espera · falta un repuesto o depende de un tercero')).toHaveFocus()
    expect(ticketsRepository.findById('tck-00144').estado).toBe('en_atencion')
    expect(historialRepository.findAll()).toHaveLength(66)
  })

  it('con un solo cambio posible ya viene elegido', async () => {
    const { user } = await renderTicket(RESUELTO)

    await user.click(boton('Cambiar estado'))
    expect(opcion('En atención · estás trabajando en la falla')).toBeChecked()
    expect(opcion('En espera · no disponible desde Resuelto')).toBeDisabled()
    await user.click(boton('Guardar estado'))

    expect(await screen.findByText('Estado actualizado: En atención.')).toBeInTheDocument()
    expect(etiquetas()).toHaveTextContent('Estado: En atención')
  })

  it('cancelar con un estado elegido pide confirmación antes de descartarlo', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    await user.click(opcion('Resuelto · la falla ya no se presenta'))
    await user.click(boton('Cancelar'))
    await user.click(
      within(await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })).getByRole('button', {
        name: 'Seguir editando',
      }),
    )
    expect(opcion('Resuelto · la falla ya no se presenta')).toBeChecked()

    await user.click(boton('Cancelar'))
    await user.click(
      within(await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })).getByRole('button', {
        name: 'Descartar',
      }),
    )
    expect(dialogo(DIALOGO)).not.toBeInTheDocument()
    expect(etiquetas()).toHaveTextContent('Estado: En atención')
    expect(ticketsRepository.findById('tck-00144').estado).toBe('en_atencion')
  })

  it('sin nada elegido se cierra sin preguntar', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    await user.click(boton('Cancelar'))

    expect(dialogo(DIALOGO)).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(boton('Cambiar estado')).toHaveFocus()
  })

  it('si el ticket cambió de estado mientras tanto, lo avisa y vuelve a cargarlo', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    modificarTicket('tck-00144', { estado: 'resuelto' })
    await user.click(opcion('En espera · falta un repuesto o depende de un tercero'))
    await user.click(boton('Guardar estado'))

    expect(await screen.findByText('El ticket está resuelto y no admite el cambio a «En espera».')).toBeInTheDocument()
    await waitFor(() => expect(etiquetas()).toHaveTextContent('Estado: Resuelto'))
    expect(dialogo(DIALOGO)).not.toBeInTheDocument()
    expect(historialRepository.findAll()).toHaveLength(66)
  })
})
