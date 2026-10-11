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
const EN_ESPERA = 'TCK-2026-00143'
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
    modificarTicket('tck-00144', { estado: 'cerrado', cerradoEn: AHORA })
    await user.click(opcion('Resuelto · la falla ya no se presenta'))
    await user.click(boton('Guardar estado'))

    expect(await screen.findByText('El ticket está cerrado y no admite el cambio a «Resuelto».')).toBeInTheDocument()
    await waitFor(() => expect(etiquetas()).toHaveTextContent('Estado: Cerrado'))
    expect(dialogo(DIALOGO)).not.toBeInTheDocument()
    expect(boton('Cambiar estado')).not.toBeInTheDocument()
    expect(historialRepository.findAll()).toHaveLength(66)
  })
})

describe('TicketAtencionPage · espera', () => {
  const EN_ESPERA_OPCION = 'En espera · falta un repuesto o depende de un tercero'

  it('un ticket en espera muestra el motivo, desde cuándo espera y la fecha estimada de retorno', async () => {
    await renderTicket(EN_ESPERA)

    const aviso = screen.getByText('Ticket en espera').closest('[role="status"]')
    expect(aviso).toHaveTextContent('Se solicitó al proveedor un filtro de línea para el amplificador.')
    expect(aviso).toHaveTextContent('En espera desde el 30/09/2026 09:30 · retorno estimado: 05/10/2026')
    expect(aviso).not.toHaveTextContent('ya pasó')
  })

  it('avisa cuando la fecha estimada de retorno ya pasó', async () => {
    vi.setSystemTime('2026-10-07T15:00:00.000Z')
    await renderTicket(EN_ESPERA)

    expect(screen.getByText('Ticket en espera').closest('[role="alert"]')).toHaveTextContent(
      'retorno estimado: 05/10/2026 · la fecha estimada ya pasó',
    )
  })

  it('un ticket que no está en espera no muestra el aviso', async () => {
    await renderTicket(EN_ATENCION)

    expect(screen.queryByText('Ticket en espera')).not.toBeInTheDocument()
  })

  it('pide el motivo y la fecha de retorno solo al elegir «En espera»', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    expect(screen.queryByRole('textbox', { name: 'Motivo de espera' })).not.toBeInTheDocument()

    await user.click(opcion(EN_ESPERA_OPCION))
    expect(campo('Motivo de espera')).toBeRequired()
    expect(screen.getByLabelText('Fecha estimada de retorno')).toHaveAttribute('min', '2026-10-01')

    await user.click(opcion('Resuelto · la falla ya no se presenta'))
    expect(screen.queryByRole('textbox', { name: 'Motivo de espera' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Fecha estimada de retorno')).not.toBeInTheDocument()
  })

  it('deja el ticket en espera con su motivo y su fecha estimada de retorno', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    await user.click(opcion(EN_ESPERA_OPCION))
    await user.type(campo('Motivo de espera'), 'Tomacorriente solicitado al almacén.')
    await user.type(screen.getByLabelText('Fecha estimada de retorno'), '2026-10-05')
    await user.click(boton('Guardar estado'))

    expect(await screen.findByText('Estado actualizado: En espera.')).toBeInTheDocument()
    expect(etiquetas()).toHaveTextContent('Estado: En espera')
    const aviso = screen.getByText('Ticket en espera').closest('[role="status"]')
    expect(aviso).toHaveTextContent('Tomacorriente solicitado al almacén.')
    expect(aviso).toHaveTextContent('En espera desde el 01/10/2026 10:00 · retorno estimado: 05/10/2026')
    expect(historialRepository.findAll({ ticketId: 'tck-00144' }).at(-1)).toMatchObject({
      estado: 'en_espera',
      motivo: 'Tomacorriente solicitado al almacén.',
      retornoEstimado: '2026-10-06T04:59:59.000Z',
    })
  })

  it('sin motivo ni fecha señala cada error junto a su campo y no cambia el estado', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    await user.click(opcion(EN_ESPERA_OPCION))
    await user.click(boton('Guardar estado'))

    expect(campo('Motivo de espera')).toHaveAccessibleDescription('Indica el motivo de la espera.')
    expect(campo('Motivo de espera')).toHaveFocus()
    expect(screen.getByLabelText('Fecha estimada de retorno')).toHaveAccessibleDescription(
      'Indica la fecha estimada de retorno.',
    )
    expect(ticketsRepository.findById('tck-00144').estado).toBe('en_atencion')
  })

  it('rechaza una fecha de retorno anterior a hoy', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cambiar estado'))
    await user.click(opcion(EN_ESPERA_OPCION))
    await user.type(campo('Motivo de espera'), 'Tomacorriente solicitado al almacén.')
    await user.type(screen.getByLabelText('Fecha estimada de retorno'), '2026-09-30')
    await user.click(boton('Guardar estado'))

    expect(screen.getByLabelText('Fecha estimada de retorno')).toHaveAccessibleDescription(
      'La fecha de retorno no puede ser anterior a hoy.',
    )
    expect(ticketsRepository.findById('tck-00144').estado).toBe('en_atencion')
  })

  it('al retomar la atención el aviso de espera desaparece', async () => {
    const { user } = await renderTicket(EN_ESPERA)

    await user.click(boton('Cambiar estado'))
    await user.click(opcion('En atención · estás trabajando en la falla'))
    await user.click(boton('Guardar estado'))

    expect(await screen.findByText('Estado actualizado: En atención.')).toBeInTheDocument()
    expect(screen.queryByText('Ticket en espera')).not.toBeInTheDocument()
  })
})

describe('TicketAtencionPage · cierre', () => {
  const DIALOGO = 'Cerrar TCK-2026-00144'
  const SOLUCION = 'Se reemplazó el tomacorriente del rack y se verificó el enlace del laboratorio.'
  const cerrarEnElDialogo = () => within(dialogo(DIALOGO)).getByRole('button', { name: 'Cerrar ticket' })
  const desenlace = () => screen.getByRole('region', { name: 'Desenlace' })

  it('ofrece «Cerrar ticket» al técnico asignado mientras atiende el ticket o cuando ya lo resolvió', async () => {
    const enAtencion = await renderTicket(EN_ATENCION)
    expect(boton('Cambiar estado')).toBeInTheDocument()
    expect(boton('Cerrar ticket')).toBeInTheDocument()
    enAtencion.unmount()

    const resuelto = await renderTicket(RESUELTO)
    expect(boton('Cerrar ticket')).toBeInTheDocument()
    resuelto.unmount()

    const enEspera = await renderTicket(EN_ESPERA)
    expect(boton('Cambiar estado')).toBeInTheDocument()
    expect(boton('Cerrar ticket')).not.toBeInTheDocument()
    enEspera.unmount()

    await renderTicket(EN_ATENCION, 'supervisor')
    expect(boton('Cerrar ticket')).not.toBeInTheDocument()
  })

  it('el diálogo muestra el tiempo total de atención, el plazo y lo que significa cerrar (p26)', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cerrar ticket'))

    expect(dialogo(DIALOGO)).toHaveAccessibleDescription('Punto de red caído en laboratorio')
    expect(campo('Solución aplicada')).toHaveFocus()
    expect(campo('Solución aplicada')).toBeRequired()
    expect(within(dialogo(DIALOGO)).getByText('Tiempo total de atención').closest('div')).toHaveTextContent(
      'Tiempo total de atención1 d 18 h 20 minFuera del tiempo esperado (2 h)',
    )
    expect(within(dialogo(DIALOGO)).getByText('Estado final').closest('div')).toHaveTextContent('Estado finalCerrado')
    expect(
      within(dialogo(DIALOGO)).getByText(
        'Al cerrar, Camila Quispe Ramos recibirá la encuesta de satisfacción y podrá reabrir el ticket dentro de 7 días.',
      ),
    ).toBeInTheDocument()
  })

  it('cierra el ticket con su solución, lo notifica y muestra el desenlace', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cerrar ticket'))
    await user.type(campo('Solución aplicada'), SOLUCION)
    await user.click(cerrarEnElDialogo())

    expect(
      await screen.findByText('Ticket TCK-2026-00144 cerrado. Camila Quispe Ramos ya puede calificar la atención.'),
    ).toBeInTheDocument()
    expect(dialogo(DIALOGO)).not.toBeInTheDocument()
    expect(etiquetas()).toHaveTextContent('Estado: Cerrado')
    expect(desenlace()).toHaveTextContent(`Solución aplicada${SOLUCION}`)
    expect(desenlace()).toHaveTextContent('Cerrado01/10/2026 10:00 · Julio Paredes Soto')
    expect(desenlace()).toHaveTextContent('Tiempo total de atención1 d 18 h 20 minFuera del tiempo esperado (2 h)')
    expect(boton('Cambiar estado')).not.toBeInTheDocument()
    expect(boton('Cerrar ticket')).not.toBeInTheDocument()
    expect(formulario()).not.toBeInTheDocument()
    expect(ticketsRepository.findById('tck-00144')).toMatchObject({ estado: 'cerrado', cerradoEn: AHORA })
    expect(historialRepository.findAll({ ticketId: 'tck-00144' }).at(-1)).toMatchObject({
      estado: 'cerrado',
      solucion: SOLUCION,
      autorId: DEMO.tecnico,
    })
  })

  it('sin una solución suficiente señala el error junto al campo y no cierra el ticket', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cerrar ticket'))
    await user.click(cerrarEnElDialogo())
    expect(campo('Solución aplicada')).toHaveAccessibleDescription('Describe la solución aplicada.')
    expect(campo('Solución aplicada')).toHaveFocus()

    await user.type(campo('Solución aplicada'), 'Listo.')
    await user.click(cerrarEnElDialogo())
    expect(campo('Solución aplicada')).toHaveAccessibleDescription('Describe la solución con al menos 10 caracteres.')
    expect(ticketsRepository.findById('tck-00144')).toMatchObject({ estado: 'en_atencion', cerradoEn: null })
  })

  it('cancelar con la solución escrita pide confirmación antes de descartarla', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cerrar ticket'))
    await user.type(campo('Solución aplicada'), SOLUCION)
    await user.click(boton('Cancelar'))
    await user.click(
      within(await screen.findByRole('alertdialog', { name: '¿Descartar el cierre?' })).getByRole('button', {
        name: 'Descartar',
      }),
    )

    expect(dialogo(DIALOGO)).not.toBeInTheDocument()
    expect(etiquetas()).toHaveTextContent('Estado: En atención')
    expect(ticketsRepository.findById('tck-00144').estado).toBe('en_atencion')
  })

  it('un ticket cerrado muestra su desenlace, con la espera descontada del tiempo de atención', async () => {
    const conEspera = await renderTicket('TCK-2026-00130')
    expect(desenlace()).toHaveTextContent(
      'Se retiró la extensión dañada y se instaló una canaleta con dos tomacorrientes fijos junto al podio.',
    )
    expect(desenlace()).toHaveTextContent('Cerrado01/09/2026 15:16 · Iván Zegarra Pinto')
    expect(desenlace()).toHaveTextContent('1 d 6 h 12 minFuera del tiempo esperado (8 h)')
    expect(desenlace()).toHaveTextContent('Sin contar 18 h 30 min en espera: 11 h 42 min de atención.')
    conEspera.unmount()

    await renderTicket('TCK-2026-00118')
    expect(desenlace()).toHaveTextContent('1 d 1 h 35 minDentro del tiempo esperado (4 h)')
    expect(desenlace()).toHaveTextContent('Sin contar 23 h 30 min en espera: 2 h 05 min de atención.')
  })

  it('un ticket que no está cerrado no tiene desenlace', async () => {
    await renderTicket(RESUELTO)

    expect(screen.queryByRole('region', { name: 'Desenlace' })).not.toBeInTheDocument()
  })

  it('si el ticket dejó de estar en atención mientras tanto, lo avisa y vuelve a cargarlo', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cerrar ticket'))
    modificarTicket('tck-00144', { estado: 'abierto' })
    await user.type(campo('Solución aplicada'), SOLUCION)
    await user.click(cerrarEnElDialogo())

    expect(
      await screen.findByText('El ticket está abierto: solo se cierra un ticket en atención o resuelto.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(etiquetas()).toHaveTextContent('Estado: Abierto'))
    expect(dialogo(DIALOGO)).not.toBeInTheDocument()
    expect(boton('Cerrar ticket')).not.toBeInTheDocument()
  })
})

describe('TicketAtencionPage · vista consolidada', () => {
  const seccion = (nombre) => screen.getByRole('region', { name: nombre })
  const recientes = () =>
    within(seccion('Historial reciente'))
      .getAllByRole('listitem')
      .map((evento) => evento.textContent)

  it('reúne junto a la bitácora los datos del reporte, el ambiente y el historial reciente (p25)', async () => {
    await renderTicket(EN_ATENCION)

    expect(within(seccion('Datos del reporte')).getAllByRole('term').map((termino) => termino.textContent)).toEqual([
      'Solicitante',
      'Teléfono',
      'Categoría',
      'Registrado',
      'Técnico asignado',
      'Atención esperada',
    ])
    expect(within(seccion('Datos del reporte')).getAllByRole('definition').map((dato) => dato.textContent)).toEqual([
      'Camila Quispe Ramos',
      '987 654 321',
      'Redes y conectividad',
      '29/09/2026 15:40',
      'Julio Paredes Soto',
      '2 h',
    ])
    expect(seccion('Ambiente')).toHaveTextContent('H-210')
    expect(seccion('Ambiente')).toHaveTextContent('Laboratorio de Redes')
    expect(seccion('Ambiente')).toHaveTextContent('Laboratorio · Pabellón H · piso 2 · capacidad 28 · Campus Monterrico')
    expect(seccion('Ambiente')).toHaveTextContent('2 tickets en curso en este ambiente · sin cierres anteriores')
    expect(recientes()).toEqual([
      'Abierto 29/09/2026 15:40',
      'Asignado a Julio Paredes Soto 29/09/2026 15:50',
      'En atención 29/09/2026 16:10',
    ])
    expect(seccion('Historial reciente')).toHaveTextContent('1 d 18 h 20 min transcurridos')
    expect(screen.getByRole('link', { name: 'Ver el historial completo' })).toHaveAttribute(
      'href',
      '/tecnico/tickets/TCK-2026-00144/historial',
    )
    expect(entradas()).toHaveLength(4)
  })

  it('un ticket en cola indica que no tiene técnico y cuándo fue el último cierre en su ambiente', async () => {
    await renderTicket(SIN_ASIGNAR, 'supervisor')

    expect(seccion('Datos del reporte')).toHaveTextContent('Técnico asignadoSin asignar')
    expect(seccion('Ambiente')).toHaveTextContent('A-201')
    expect(seccion('Ambiente')).toHaveTextContent('Aula · Pabellón A · piso 2 · capacidad 68 · Campus Monterrico')
    expect(seccion('Ambiente')).toHaveTextContent('1 ticket en curso en este ambiente · último cierre 21/08/2026')
    expect(recientes()).toEqual(['Abierto 30/09/2026 08:12'])
  })

  it('muestra la subcategoría y la descripción cuando el registro del ticket las tiene', async () => {
    modificarTicket('tck-00144', {
      subcategoriaId: 'sub-05',
      descripcion: 'No hay red en ninguna computadora del laboratorio.',
    })
    await renderTicket(EN_ATENCION)

    expect(seccion('Datos del reporte')).toHaveTextContent('SubcategoríaPunto de red caído')
    expect(seccion('Datos del reporte')).toHaveTextContent('«No hay red en ninguna computadora del laboratorio.»')
  })

  it('un ticket cerrado reúne el reporte, la bitácora y el desenlace, y solo se consulta', async () => {
    await renderTicket(CERRADO)

    expect(seccion('Desenlace')).toHaveTextContent(
      'El proveedor reemplazó el receptor inalámbrico. Se sincronizaron los dos micrófonos en una frecuencia libre.',
    )
    expect(seccion('Datos del reporte')).toHaveTextContent('CategoríaAudiovisuales')
    expect(seccion('Ambiente')).toHaveTextContent('AUD-CEN')
    expect(entradas()).toHaveLength(4)
    expect(recientes()).toEqual([
      'En espera 24/09/2026 11:30',
      'En atención 28/09/2026 15:00',
      'Resuelto 28/09/2026 16:40',
      'Cerrado 28/09/2026 17:20',
    ])
    expect(seccion('Historial reciente')).toHaveTextContent('4 d 8 h 50 min de atención en total')
    expect(formulario()).not.toBeInTheDocument()
    expect(boton('Cambiar estado')).not.toBeInTheDocument()
  })

  it('el historial reciente y el desenlace se actualizan al cerrar el ticket', async () => {
    const { user } = await renderTicket(EN_ATENCION)

    await user.click(boton('Cerrar ticket'))
    await user.type(campo('Solución aplicada'), 'Se reemplazó el tomacorriente del rack.')
    await user.click(within(dialogo('Cerrar TCK-2026-00144')).getByRole('button', { name: 'Cerrar ticket' }))

    expect(await screen.findByRole('region', { name: 'Desenlace' })).toBeInTheDocument()
    expect(recientes().at(-1)).toBe('Cerrado 01/10/2026 10:00')
    expect(seccion('Historial reciente')).toHaveTextContent('1 d 18 h 20 min de atención en total')
    expect(seccion('Ambiente')).toHaveTextContent('1 ticket en curso en este ambiente · último cierre 01/10/2026')
  })
})
