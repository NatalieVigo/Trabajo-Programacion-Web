import { resumenRepository } from '../repositories/resumen.repository.js'

// la encuesta se puede responder hasta 7 días después del cierre
const PLAZO_ENCUESTA_MS = 7 * 24 * 60 * 60 * 1000

// encuestas aún a tiempo, la más urgente primero
async function encuestasPendientes(usuarioId) {
  const cerrados = await resumenRepository.cerradosSinEncuesta(usuarioId, new Date(Date.now() - PLAZO_ENCUESTA_MS))
  return cerrados.map(({ codigo, cerradoEn }) => ({
    ticketCodigo: codigo,
    cerradoEn,
    fechaLimite: new Date(cerradoEn.getTime() + PLAZO_ENCUESTA_MS),
  }))
}

// Solo lo que muestran los mockups de HU-1: la bienvenida (p05) y la cabecera y el menú del usuario (p10 y p11).
const CONTADORES_POR_ROL = {
  async usuario(usuarioId) {
    const [tickets, pendientes, respondidas] = await Promise.all([
      resumenRepository.contarTicketsDelUsuario(usuarioId),
      encuestasPendientes(usuarioId),
      resumenRepository.contarEncuestasRespondidas(usuarioId),
    ])
    return {
      ticketsAbiertos: tickets.abiertos,
      ticketsReportados: tickets.reportados,
      encuestasPendientes: pendientes.length,
      encuestasRespondidas: respondidas,
    }
  },
  async tecnico(usuarioId) {
    return { asignados: await resumenRepository.contarAsignados(usuarioId) }
  },
  async supervisor() {
    return { colaSinAsignar: await resumenRepository.contarColaSinAsignar() }
  },
}

export function obtenerContadores(usuario) {
  return CONTADORES_POR_ROL[usuario.rol](usuario.id)
}

// Tarjeta lateral de Mi cuenta (p10); técnico y supervisor solo muestran la fecha de creación.
export async function obtenerResumenCuenta(usuario) {
  if (usuario.rol !== 'usuario') return { cuentaCreada: usuario.creadoEn }
  const [tickets, pendientes] = await Promise.all([
    resumenRepository.contarTicketsDelUsuario(usuario.id),
    encuestasPendientes(usuario.id),
  ])
  return {
    ticketsReportados: tickets.reportados,
    abiertosAhora: tickets.abiertos,
    encuestaPendiente: pendientes[0] ?? null,
    cuentaCreada: usuario.creadoEn,
  }
}
