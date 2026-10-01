import { generatePath } from 'react-router-dom'

/** Todas las rutas finales de la aplicación (SPEC §9). AppRoutes las registra a medida que se implementan. */
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
  usuarioEncuestas: '/usuario/encuestas',
  usuarioEncuestaPendiente: '/usuario/encuestas/pendiente',

  tecnicoBandeja: '/tecnico',
  tecnicoHistorial: '/tecnico/historial',

  supervisorTablero: '/supervisor',
  supervisorCola: '/supervisor/cola',
  supervisorCategorias: '/supervisor/categorias',
  supervisorAmbientes: '/supervisor/ambientes',
  supervisorTecnicos: '/supervisor/tecnicos',
  supervisorUsuarios: '/supervisor/usuarios',
  supervisorInvitaciones: '/supervisor/invitaciones',

  miCuenta: '/mi-cuenta',
  accesoDenegado: '/acceso-denegado',
  notFound: '*',
})

/** Secciones de la landing enlazadas desde la cabecera y el pie. */
export const LANDING_SECTIONS = Object.freeze({
  comoReportar: 'como-reportar',
  categorias: 'categorias',
  tiempos: 'tiempos',
})

export const landingSectionPath = (sectionId) => ({ pathname: ROUTES.home, hash: `#${sectionId}` })

export const invitacionPath = (token) => generatePath(ROUTES.invitacion, { token })

export const restablecerContrasenaPath = (token) => generatePath(ROUTES.restablecerContrasena, { token })

/** Recuperación de contraseña con el correo precargado: /recuperar-contrasena?correo=… */
export const recuperarContrasenaPath = (correo) => ({
  pathname: ROUTES.recuperarContrasena,
  search: `?${new URLSearchParams({ correo })}`,
})
