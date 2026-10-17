import { readTable } from '../repositories/db.js'
import { fechaEnLima, esFechaDeCalendario } from '../utils/fechaLima.js'
import { HORA_MS } from '../utils/duracion.js'
import { getDisplayName } from '../utils/format.js'
import { tiemposDe } from './tiemposDeAtencion.js'
import { esTicketEnCurso } from './ticketsEnCurso.js'
import { simulateRequest } from './request.js'
import { ServiceError, validationError } from './ServiceError.js'

const DIA_MS = 24 * HORA_MS
const HORAS = { critica: 2, alta: 8, media: 24, baja: 72 }

export function rangoMetricasInicial(ahora = Date.now()) {
  return { desde: fechaEnLima(ahora - 89 * DIA_MS), hasta: fechaEnLima(ahora) }
}

export function validarRangoMetricas(rango) {
  if (!esFechaDeCalendario(rango?.desde) || !esFechaDeCalendario(rango?.hasta) || rango.desde > rango.hasta) {
    throw validationError({ periodo: 'Elige fechas válidas y una fecha final igual o posterior a la inicial.' })
  }
}

const enRango = (fecha, rango) => Boolean(fecha) && Number.isFinite(Date.parse(fecha)) && fechaEnLima(fecha) >= rango.desde && fechaEnLima(fecha) <= rango.hasta
const promedio = (valores) => valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null

function periodoAnterior({ desde, hasta }) {
  const inicio = Date.parse(`${desde}T00:00:00-05:00`)
  const dias = Math.round((Date.parse(`${hasta}T00:00:00-05:00`) - inicio) / DIA_MS) + 1
  return { desde: fechaEnLima(inicio - dias * DIA_MS), hasta: fechaEnLima(inicio - DIA_MS) }
}

function exigirSupervisor(usuarioId) {
  const cuenta = readTable('usuarios').find(({ id }) => id === usuarioId)
  if (cuenta?.rol !== 'supervisor' || cuenta.estado !== 'activo') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo un supervisor activo puede consultar las métricas.')
  }
}

// el técnico que lo tenía al resolverlo, aunque luego lo reasignen
function tecnicoEn(ticket, eventos, instante) {
  const asignaciones = eventos.filter((e) => e.tipo === 'asignacion' && e.creadoEn <= instante)
  return asignaciones.length ? asignaciones.at(-1).asignadoA : ticket.asignadoA
}

function actividad(ahora) {
  const historial = readTable('historial')
  const categorias = readTable('categorias')
  const subcategorias = readTable('subcategorias')
  const tickets = readTable('tickets').map((ticket) => {
    const eventos = historial.filter((e) => e.ticketId === ticket.id).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
    let estados = eventos.filter((e) => e.tipo === 'estado')
    if (!estados.length || estados[0].creadoEn > ticket.creadoEn) estados = [{ estado: 'abierto', creadoEn: ticket.creadoEn }, ...estados]
    const medirHasta = (fin) => tiemposDe(estados.filter((e) => Date.parse(e.creadoEn) <= fin), fin).atencionMs
    const resoluciones = estados.filter((e) => e.estado === 'resuelto').map((e) => ({
      creadoEn: e.creadoEn, tecnicoId: tecnicoEn(ticket, eventos, e.creadoEn), atencionMs: medirHasta(Date.parse(e.creadoEn)),
    }))
    if (!resoluciones.length && ticket.estado === 'cerrado' && ticket.cerradoEn) {
      resoluciones.push({ creadoEn: ticket.cerradoEn, tecnicoId: tecnicoEn(ticket, eventos, ticket.cerradoEn), atencionMs: medirHasta(Date.parse(ticket.cerradoEn)) })
    }
    const ultima = resoluciones.at(-1)
    const fin = !esTicketEnCurso(ticket) && ultima ? Date.parse(ultima.creadoEn) : ahora
    const atencionMs = medirHasta(fin)
    const catalogo = subcategorias.find((c) => c.id === ticket.subcategoriaId) ?? categorias.find((c) => c.id === ticket.categoriaId)
    const esperado = ticket.tiempoEsperadoHoras ?? catalogo?.tiempoEsperadoHoras ?? HORAS[ticket.prioridad]
    return { ...ticket, resoluciones, atencionMs,
      fueraDePlazo: atencionMs > esperado * HORA_MS }
  })
  return { tickets, categorias }
}

function resumenPeriodo(tickets, rango) {
  const registrados = tickets.filter((t) => enRango(t.creadoEn, rango))
  // reabrir no borra lo ya resuelto; cada ticket cuenta una vez por periodo
  const resueltos = tickets.flatMap((t) => {
    const resolucion = t.resoluciones.filter((r) => enRango(r.creadoEn, rango)).at(-1)
    return resolucion ? [{ ...t, resueltoEn: resolucion.creadoEn, tecnicoResolutorId: resolucion.tecnicoId, atencionMs: resolucion.atencionMs }] : []
  })
  return { registrados, resueltos, total: registrados.length,
    promedioMs: promedio(resueltos.map((t) => t.atencionMs)),
    fueraDePlazo: registrados.filter((t) => t.fueraDePlazo).length }
}

// abiertos y sin asignar son cifras de ahora, no del periodo
export function obtenerTablero(usuarioId, rango) {
  return simulateRequest(() => {
    exigirSupervisor(usuarioId)
    validarRangoMetricas(rango)
    const ahora = Date.now()
    const { tickets, categorias } = actividad(ahora)
    const actual = resumenPeriodo(tickets, rango)
    const anterior = resumenPeriodo(tickets, periodoAnterior(rango))
    const abiertos = tickets.filter(esTicketEnCurso)
    const grupos = [
      ['abierto', 'Abierto', ['abierto', 'reabierto']], ['en_atencion', 'En atención', ['en_atencion']],
      ['en_espera', 'En espera', ['en_espera']], ['cerrado', 'Resuelto y cerrado', ['resuelto', 'cerrado']],
    ]
    const ambientes = readTable('ambientes').map((a) => ({ id: a.id, nombre: a.codigo ?? a.nombre,
      total: actual.registrados.filter((t) => t.ambienteId === a.id).length,
    })).filter((a) => a.total).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre)).slice(0, 6)
    return {
      rango, actualizadoEn: new Date(ahora).toISOString(), sede: readTable('sedes')[0]?.nombre ?? 'Campus',
      total: actual.total, abiertos: abiertos.length, sinAsignar: abiertos.filter((t) => !t.asignadoA).length,
      promedioMs: actual.promedioMs, fueraDePlazo: actual.fueraDePlazo,
      porcentajeFuera: actual.total ? actual.fueraDePlazo / actual.total * 100 : 0,
      variacionTickets: anterior.total ? (actual.total - anterior.total) / anterior.total * 100 : null,
      variacionTiempoMs: actual.promedioMs !== null && anterior.promedioMs !== null ? actual.promedioMs - anterior.promedioMs : null,
      porEstado: grupos.map(([id, nombre, estados]) => ({ id, nombre, total: actual.registrados.filter((t) => estados.includes(t.estado)).length })),
      porCategoria: categorias.map((cat) => ({ id: cat.id, nombre: cat.nombre, total: actual.registrados.filter((t) => t.categoriaId === cat.id).length })).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre)),
      ambientes,
    }
  })
}

// carga actual de cada técnico junto a sus resultados del periodo
export function obtenerCargaTecnicos(usuarioId, rango) {
  return simulateRequest(() => {
    exigirSupervisor(usuarioId)
    validarRangoMetricas(rango)
    const { tickets, categorias } = actividad(Date.now())
    const resueltosDelPeriodo = resumenPeriodo(tickets, rango).resueltos
    const encuestas = readTable('encuestas')
    const tecnicos = readTable('usuarios').filter((u) => u.rol === 'tecnico' && u.estado === 'activo')
    const habilitaciones = readTable('habilitaciones')
    const filas = tecnicos.map((u) => {
      const propios = tickets.filter((t) => t.asignadoA === u.id && esTicketEnCurso(t))
      const resueltos = resueltosDelPeriodo.filter((t) => t.tecnicoResolutorId === u.id)
      const puntajes = encuestas.filter((e) => enRango(e.fechaRespuesta ?? e.respondidaEn, rango)).flatMap((e) => {
        const ticket = tickets.find((t) => t.id === e.ticketId || t.codigo === e.codigoTicket)
        const puntaje = e.puntajeGeneral ?? e.puntaje
        const resolucion = ticket?.resoluciones.filter((r) => r.creadoEn <= (e.fechaRespuesta ?? e.respondidaEn)).at(-1)
        return resolucion?.tecnicoId === u.id && Number.isFinite(puntaje) && puntaje >= 1 && puntaje <= 5 ? [puntaje] : []
      })
      return {
        id: u.id, nombre: getDisplayName(u),
        especialidad: (u.especialidades ?? []).map((id) => categorias.find((cat) => cat.id === id)?.nombre).filter(Boolean).join(' · '),
        asignados: propios.length, resueltos: resueltos.length,
        enEspera: propios.filter((t) => t.estado === 'en_espera').length,
        promedioMs: promedio(resueltos.map((t) => t.atencionMs)), satisfaccion: promedio(puntajes),
      }
    })
    const totalAsignados = filas.reduce((total, fila) => total + fila.asignados, 0)
    const mayor = [...filas].sort((a, b) => b.asignados - a.asignados)[0]
    let aviso = mayor?.asignados ? `${mayor.nombre} concentra ${mayor.asignados} de los ${totalAsignados} tickets asignados.` : 'No hay tickets en curso asignados a técnicos activos.'
    if (mayor?.asignados) {
      const criticos = tickets.filter((t) => t.asignadoA === mayor.id && esTicketEnCurso(t) && t.prioridad === 'critica')
      const candidato = [...filas].sort((a, b) => a.asignados - b.asignados).find((fila) => fila.id !== mayor.id && fila.asignados < mayor.asignados && criticos.some((t) => habilitaciones.some((h) => h.tecnicoId === fila.id && h.categoriaId === t.categoriaId)))
      if (candidato) aviso += ` Considera repartir los tickets críticos con ${candidato.nombre}, que cuenta con habilitación compatible.`
    }
    return { filas, totalAsignados, promedioAsignados: filas.length ? totalAsignados / filas.length : 0, aviso }
  })
}
