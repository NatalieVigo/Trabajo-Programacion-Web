import { categoriasRepository, ambientesRepository, habilitacionesRepository, subcategoriasRepository } from '../repositories/catalogo.repository.js'
import { historialRepository } from '../repositories/atencion.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { HORA_MS } from '../utils/duracion.js'
import { getDisplayName } from '../utils/format.js'
import { esTicketEnCurso } from './ticketsEnCurso.js'
import { tiemposDe } from './tiemposDeAtencion.js'
import { simulateRequest } from './request.js'
import { ServiceError } from './ServiceError.js'

export const HORAS_POR_PRIORIDAD = Object.freeze({ critica: 2, alta: 8, media: 24, baja: 72 })
const ESTADOS_COLA = new Set(['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto'])

function cuentaActiva(usuarioId, rol) {
  const cuenta = usuariosRepository.findById(usuarioId)
  if (cuenta?.rol !== rol || cuenta.estado !== 'activo') {
    throw new ServiceError(403, 'FORBIDDEN', `Solo un ${rol === 'tecnico' ? 'técnico' : 'supervisor'} activo puede consultar esta vista.`)
  }
  return cuenta
}

const nombre = (persona) => persona ? getDisplayName(persona) : null

function horasEsperadas(ticket) {
  if (Number.isFinite(ticket.tiempoEsperadoHoras)) return ticket.tiempoEsperadoHoras
  const categoria = subcategoriasRepository.findById(ticket.subcategoriaId) ?? categoriasRepository.findById(ticket.categoriaId)
  return categoria?.tiempoEsperadoHoras ?? HORAS_POR_PRIORIDAD[ticket.prioridad]
}

function detalle(ticket, ahora) {
  const estados = historialRepository.findAll({ ticketId: ticket.id, tipo: 'estado' }).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  const { atencionMs } = tiemposDe(estados, ahora)
  const esperadoHoras = horasEsperadas(ticket)
  const restanteMs = esperadoHoras * HORA_MS - atencionMs
  const espera = ticket.estado === 'en_espera' ? estados.findLast(({ estado }) => estado === 'en_espera') : null
  const categoria = categoriasRepository.findById(ticket.categoriaId)
  const subcategoria = subcategoriasRepository.findById(ticket.subcategoriaId)
  const ambiente = ambientesRepository.findById(ticket.ambienteId)
  return {
    id: ticket.id,
    codigo: ticket.codigo,
    asunto: ticket.asunto,
    categoriaId: ticket.categoriaId,
    categoria: categoria?.nombre ?? 'Sin categoría',
    subcategoria: subcategoria?.nombre ?? null,
    ambienteId: ticket.ambienteId,
    ambiente: ambiente?.codigo ?? ambiente?.nombre ?? 'Sin ambiente',
    solicitante: nombre(usuariosRepository.findById(ticket.usuarioId)),
    tecnicoId: ticket.asignadoA,
    tecnico: nombre(usuariosRepository.findById(ticket.asignadoA)),
    prioridad: ticket.prioridad,
    estado: ticket.estado,
    creadoEn: ticket.creadoEn,
    cerradoEn: ticket.cerradoEn,
    resueltoEn: estados.findLast(({ estado }) => estado === 'resuelto')?.creadoEn ?? null,
    antiguedadMs: Math.max(0, ahora - Date.parse(ticket.creadoEn)),
    esperadoHoras,
    restanteMs,
    vencimientoEn: new Date(ahora + restanteMs).toISOString(),
    fueraDePlazo: esTicketEnCurso(ticket) && ticket.estado !== 'en_espera' && restanteMs < 0,
    espera: espera ? { motivo: espera.motivo, retornoEstimado: espera.retornoEstimado } : null,
  }
}

function tecnicosConCarga() {
  const tickets = ticketsRepository.findAll()
  return usuariosRepository.findAll({ rol: 'tecnico', estado: 'activo' }).map((tecnico) => {
    const propios = tickets.filter(({ asignadoA }) => asignadoA === tecnico.id)
    return {
      id: tecnico.id,
      nombre: nombre(tecnico),
      habilitadas: habilitacionesRepository.findAll({ tecnicoId: tecnico.id }).map(({ categoriaId }) => categoriaId),
      carga: propios.length,
      criticos: propios.filter(({ prioridad }) => prioridad === 'critica').length,
    }
  })
}

export function listarCola(usuarioId) {
  return simulateRequest(() => {
    cuentaActiva(usuarioId, 'supervisor')
    const ahora = Date.now()
    return {
      tickets: ticketsRepository.findAll((ticket) => ESTADOS_COLA.has(ticket.estado)).map((ticket) => detalle(ticket, ahora)),
      tecnicos: tecnicosConCarga(),
      categorias: categoriasRepository.findAll().map(({ id, nombre }) => ({ id, nombre })),
      ambientes: ambientesRepository.findAll().map(({ id, codigo, nombre }) => ({ id, nombre: codigo ?? nombre })),
    }
  })
}
