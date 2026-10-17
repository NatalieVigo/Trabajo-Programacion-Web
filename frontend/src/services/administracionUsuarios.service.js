import { readTable, updateTables } from '../repositories/db.js'
import { getDisplayName, pluralize } from '../utils/format.js'
import { esTicketEnCurso } from './ticketsEnCurso.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'

function supervisorActivo(usuarios, id) {
  const cuenta = usuarios.find((u) => u.id === id)
  if (cuenta?.rol !== 'supervisor' || cuenta.estado !== 'activo') throw new ServiceError(403, 'FORBIDDEN', 'Solo un supervisor activo puede gestionar las cuentas.')
}

function buscar(usuarios, id) {
  const cuenta = usuarios.find((u) => u.id === id)
  if (!cuenta) throw new ServiceError(404, 'USER_NOT_FOUND', 'No encontramos la cuenta solicitada.')
  return cuenta
}

function cuentaPublica(cuenta, tickets, categorias) {
  return {
    id: cuenta.id, nombres: cuenta.nombres, apellidos: cuenta.apellidos, nombre: getDisplayName(cuenta),
    correo: cuenta.correo, telefono: cuenta.telefono, rol: cuenta.rol, unidad: cuenta.unidad,
    vinculo: cuenta.vinculo, estado: cuenta.estado, creadoEn: cuenta.creadoEn,
    ambienteHabitualId: cuenta.ambienteHabitualId, ultimoAccesoEn: cuenta.ultimoAccesoEn ?? null,
    motivoBloqueo: cuenta.motivoBloqueo ?? null,
    especialidad: (cuenta.especialidades ?? []).map((id) => categorias.find((cat) => cat.id === id)?.nombre).filter(Boolean).join(' · '),
    ticketsReportados: tickets.filter((t) => t.usuarioId === cuenta.id).length,
    criticosAsignados: tickets.filter((t) => t.asignadoA === cuenta.id && t.prioridad === 'critica' && esTicketEnCurso(t)).length,
  }
}

export function listarCuentas(supervisorId) {
  return simulateRequest(() => {
    const usuarios = readTable('usuarios')
    supervisorActivo(usuarios, supervisorId)
    const tickets = readTable('tickets')
    const categorias = readTable('categorias')
    return usuarios.map((cuenta) => cuentaPublica(cuenta, tickets, categorias))
  })
}

function anunciarCambio() {
  window.dispatchEvent(new Event('mesa-ayuda:datos-actualizados'))
  window.dispatchEvent(new Event('mesa-ayuda:cuentas-actualizadas'))
}

export function bloquearCuenta(cuentaId, { motivo, notificar = false }, supervisorId) {
  return simulateRequest(() => {
    // Primero el permiso (403) y después los datos (400), como lo haría el servidor.
    supervisorActivo(readTable('usuarios'), supervisorId)
    if (typeof motivo !== 'string' || !motivo.trim() || motivo.trim().length > 240) throw validationError({ motivo: 'Escribe el motivo del bloqueo, con un máximo de 240 caracteres.' })
    const resultado = updateTables(['usuarios'], (db) => {
      supervisorActivo(db.usuarios, supervisorId)
      const cuenta = buscar(db.usuarios, cuentaId)
      if (cuentaId === supervisorId) throw new ServiceError(409, 'SELF_BLOCK', 'No puedes bloquear la cuenta con la que estás trabajando.')
      if (cuenta.estado !== 'activo') throw new ServiceError(409, 'ACCOUNT_CHANGED', 'La cuenta ya no está activa. Actualiza la lista.')
      const criticos = db.tickets.filter((t) => t.asignadoA === cuentaId && t.prioridad === 'critica' && esTicketEnCurso(t))
      if (criticos.length) throw new ServiceError(409, 'CRITICAL_TICKETS', `Esta cuenta tiene ${pluralize(criticos.length, 'ticket crítico abierto', 'tickets críticos abiertos')}. ${criticos.length === 1 ? 'Reasígnalo' : 'Reasígnalos'} antes de bloquearla.`)
      Object.assign(cuenta, { estado: 'bloqueado', motivoBloqueo: motivo.trim(), bloqueadoEn: new Date().toISOString(), bloqueadoPor: supervisorId, notificacionBloqueoSolicitada: notificar === true, actualizadoEn: new Date().toISOString() })
      return { id: cuenta.id, nombre: getDisplayName(cuenta) }
    })
    anunciarCambio()
    return resultado
  })
}

export function desbloquearCuenta(cuentaId, supervisorId) {
  return simulateRequest(() => {
    const resultado = updateTables(['usuarios'], (db) => {
      supervisorActivo(db.usuarios, supervisorId)
      const cuenta = buscar(db.usuarios, cuentaId)
      if (cuenta.estado !== 'bloqueado') throw new ServiceError(409, 'ACCOUNT_CHANGED', 'La cuenta ya no está bloqueada. Actualiza la ficha.')
      Object.assign(cuenta, { estado: 'activo', motivoBloqueo: null, desbloqueadoEn: new Date().toISOString(), desbloqueadoPor: supervisorId, actualizadoEn: new Date().toISOString() })
      return { id: cuenta.id, nombre: getDisplayName(cuenta) }
    })
    anunciarCambio()
    return resultado
  })
}

export function obtenerFichaCuenta(cuentaId, supervisorId) {
  return simulateRequest(() => {
    const usuarios = readTable('usuarios')
    supervisorActivo(usuarios, supervisorId)
    const cuenta = buscar(usuarios, cuentaId)
    const tickets = readTable('tickets')
    const categorias = readTable('categorias')
    const subcategorias = readTable('subcategorias')
    const ambientes = readTable('ambientes')
    const encuestas = readTable('encuestas')
    const reportados = tickets.filter((t) => t.usuarioId === cuentaId)
    const reportes = reportados.map((t) => {
      const categoria = categorias.find((c) => c.id === t.categoriaId)
      const subcategoria = subcategorias.find((c) => c.id === t.subcategoriaId)
      const ambiente = ambientes.find((a) => a.id === t.ambienteId)
      const encuesta = t.estado === 'cerrado' ? encuestas.find((e) => (e.ticketId === t.id || e.codigoTicket === t.codigo) && e.usuarioId === cuentaId) : null
      const puntaje = encuesta?.puntajeGeneral ?? encuesta?.puntaje
      return { id: t.id, codigo: t.codigo, asunto: t.asunto, categoria: [categoria?.nombre, subcategoria?.nombre].filter(Boolean).join(' · ') || 'Sin categoría',
        ambiente: ambiente?.codigo ?? ambiente?.nombre ?? 'Sin ambiente', prioridad: t.prioridad, estado: t.estado,
        encuesta: Number.isFinite(puntaje) && puntaje >= 1 && puntaje <= 5 ? puntaje : null, creadoEn: t.creadoEn }
    }).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    const puntajes = reportes.filter((r) => r.encuesta !== null).map((r) => r.encuesta)
    const habitual = ambientes.find((a) => a.id === cuenta.ambienteHabitualId)
    return {
      cuenta: cuentaPublica(cuenta, tickets, categorias), ambienteHabitual: habitual?.codigo ?? habitual?.nombre ?? 'Sin registrar',
      reportes, resumen: { reportados: reportados.length, abiertos: reportados.filter(esTicketEnCurso).length,
        cerrados: reportados.filter((t) => t.estado === 'cerrado').length,
        satisfaccion: puntajes.length ? puntajes.reduce((a, b) => a + b, 0) / puntajes.length : null },
    }
  })
}
