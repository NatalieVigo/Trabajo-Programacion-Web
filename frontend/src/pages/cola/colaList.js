import { fechaEnLima, hoyEnLima } from '../../utils/fechaLima.js'

export const FILTROS_COLA = Object.freeze({ busqueda: '', prioridades: [], estados: [], soloResueltosHoy: false, categoriaId: '', ambienteId: '', orden: 'antiguedad' })
export const PRIORIDADES = Object.freeze(['critica', 'alta', 'media', 'baja'])
export const ESTADOS = Object.freeze(['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto'])

const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function filtrarCola(tickets, filtros) {
  const palabras = normalizar(filtros.busqueda).split(/\s+/).filter(Boolean)
  const visibles = tickets.filter((ticket) =>
    palabras.every((palabra) => normalizar(`${ticket.codigo} ${ticket.asunto}`).includes(palabra)) &&
    (!filtros.prioridades.length || filtros.prioridades.includes(ticket.prioridad)) &&
    (!filtros.estados.length || filtros.estados.includes(ticket.estado)) &&
    (!filtros.soloResueltosHoy || ticket.estado === 'resuelto' && ticket.resueltoEn && fechaEnLima(ticket.resueltoEn) === hoyEnLima()) &&
    (!filtros.categoriaId || ticket.categoriaId === filtros.categoriaId) &&
    (!filtros.ambienteId || ticket.ambienteId === filtros.ambienteId),
  )
  const orden = {
    antiguedad: (a, b) => a.creadoEn.localeCompare(b.creadoEn),
    recientes: (a, b) => b.creadoEn.localeCompare(a.creadoEn),
    prioridad: (a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad) || a.creadoEn.localeCompare(b.creadoEn),
  }
  return visibles.sort((a, b) => (orden[filtros.orden] ?? orden.antiguedad)(a, b) || a.codigo.localeCompare(b.codigo))
}

export function resumirCola(tickets) {
  return {
    total: tickets.length,
    sinAsignar: tickets.filter(({ tecnicoId }) => !tecnicoId).length,
    fueraDePlazo: tickets.filter(({ fueraDePlazo }) => fueraDePlazo).length,
    abiertos: tickets.filter(({ estado }) => estado === 'abierto' || estado === 'reabierto').length,
    enAtencion: tickets.filter(({ estado }) => estado === 'en_atencion').length,
    enEspera: tickets.filter(({ estado }) => estado === 'en_espera').length,
    resueltosHoy: tickets.filter(({ estado, resueltoEn }) => estado === 'resuelto' && resueltoEn && fechaEnLima(resueltoEn) === hoyEnLima()).length,
  }
}

export function filtrarBandeja(tickets, vista, orden, ahora = Date.now()) {
  const hoy = hoyEnLima(ahora)
  const visibles = tickets.filter((ticket) => {
    if (vista === 'abiertos') return ticket.estado === 'abierto' || ticket.estado === 'reabierto'
    if (vista === 'criticos') return ticket.prioridad === 'critica'
    if (vista === 'fuera') return ticket.fueraDePlazo
    if (vista === 'hoy') return ticket.estado !== 'cerrado' && fechaEnLima(ticket.vencimientoEn) === hoy
    if (vista === 'en_atencion' || vista === 'en_espera') return ticket.estado === vista
    if (vista === 'resueltos_hoy') return ticket.estado === 'resuelto' && ticket.resueltoEn && fechaEnLima(ticket.resueltoEn) === hoy
    return true
  })
  return visibles.sort((a, b) => {
    if (orden === 'antiguedad') return a.creadoEn.localeCompare(b.creadoEn)
    if (orden === 'recientes') return b.creadoEn.localeCompare(a.creadoEn)
    return PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad) || a.restanteMs - b.restanteMs
  })
}
