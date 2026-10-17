import { generatePath } from 'react-router-dom'

export const ROUTES = Object.freeze({
  home: '/',
  registro: '/registro',
  invitacion: '/invitacion/:token',
  iniciarSesion: '/iniciar-sesion',
  recuperarContrasena: '/recuperar-contrasena',
  restablecerContrasena: '/restablecer-contrasena/:token',

  usuarioInicio: '/usuario',
  usuarioNuevoTicket: '/usuario/tickets/nuevo', 
  usuarioTickets: '/usuario/tickets', 
  usuarioTicketDetalle: '/usuario/tickets/:id',
  usuarioTicketConfirmacion: '/usuario/tickets/confirmacion',
  usuarioEncuestas: '/usuario/encuestas',
  usuarioEncuestaPendiente: '/usuario/encuestas/pendiente',
  usuarioEncuestaEvaluar: '/usuario/encuestas/:codigoTicket/evaluar',

  tecnicoBandeja: '/tecnico',
  tecnicoHistorial: '/tecnico/historial',
  tecnicoTicket: '/tecnico/tickets/:codigo',
  tecnicoTicketHistorial: '/tecnico/tickets/:codigo/historial',

  supervisorTablero: '/supervisor',
  supervisorCola: '/supervisor/cola',
  supervisorTicket: '/supervisor/tickets/:codigo',
  supervisorTicketHistorial: '/supervisor/tickets/:codigo/historial',
  supervisorCategorias: '/supervisor/categorias',
  supervisorCategoriaNueva: '/supervisor/categorias/nueva',
  supervisorCategoriaEditar: '/supervisor/categorias/:id/editar',
  supervisorAmbientes: '/supervisor/ambientes',
  supervisorTecnicos: '/supervisor/tecnicos',
  supervisorSatisfaccion: '/supervisor/satisfaccion',
  supervisorCarga: '/supervisor/carga-tecnicos',
  supervisorUsuarios: '/supervisor/usuarios',
  supervisorUsuarioFicha: '/supervisor/usuarios/:id',

  miCuenta: '/mi-cuenta',
  accesoDenegado: '/acceso-denegado',
  notFound: '*',
})

export const LANDING_SECTIONS = Object.freeze({
  comoReportar: 'como-reportar',
  categorias: 'categorias',
  tiempos: 'tiempos',
})
export const usuarioTicketDetallePath = (id) => generatePath(ROUTES.usuarioTicketDetalle, { id })

export const landingSectionPath = (sectionId) => ({ pathname: ROUTES.home, hash: `#${sectionId}` })

export const invitacionPath = (token) => generatePath(ROUTES.invitacion, { token })

export const restablecerContrasenaPath = (token) => generatePath(ROUTES.restablecerContrasena, { token })

export const categoriaEditarPath = (id) => generatePath(ROUTES.supervisorCategoriaEditar, { id })

export const usuarioFichaPath = (id) => generatePath(ROUTES.supervisorUsuarioFicha, { id })

export const ticketAtencionPath = (rol, codigo) =>
  generatePath(rol === 'supervisor' ? ROUTES.supervisorTicket : ROUTES.tecnicoTicket, { codigo })

export const ticketHistorialPath = (rol, codigo) =>
  generatePath(rol === 'supervisor' ? ROUTES.supervisorTicketHistorial : ROUTES.tecnicoTicketHistorial, { codigo })

export const encuestaEvaluarPath = (codigoTicket) => generatePath(ROUTES.usuarioEncuestaEvaluar, { codigoTicket })

// lleva a recuperar contraseña con el correo ya escrito
export const recuperarContrasenaPath = (correo) => ({
  pathname: ROUTES.recuperarContrasena,
  search: correo ? `?${new URLSearchParams({ correo })}` : '',
})
