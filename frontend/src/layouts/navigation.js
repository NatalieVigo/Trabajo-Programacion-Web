import { ROUTES } from '../routes/routePaths.js'

// Menú por rol. contador es la clave que devuelve obtenerContadores.
export const NAVIGATION = Object.freeze({
  usuario: {
    title: 'Mis servicios',
    pill: { label: 'Mis tickets abiertos', contador: 'ticketsAbiertos' },
    items: [
      { label: 'Inicio', to: ROUTES.home, end: true },
      { label: 'Nuevo ticket', to: ROUTES.usuarioNuevoTicket },
      { label: 'Mis tickets', to: ROUTES.usuarioTickets, end: true, contador: 'ticketsReportados' },
      { label: 'Encuesta pendiente', to: ROUTES.usuarioEncuestaPendiente, contador: 'encuestasPendientes' },
      { label: 'Mis encuestas', to: ROUTES.usuarioEncuestas, end: true, contador: 'encuestasRespondidas' },
      { label: 'Mi cuenta', to: ROUTES.miCuenta },
    ],
  },
  tecnico: {
    title: 'Atención',
    pill: { label: 'Asignados a mí', contador: 'asignados' },
    items: [
      { label: 'Mi bandeja', to: ROUTES.tecnicoBandeja, end: true, contador: 'asignados' },
      { label: 'En atención', to: `${ROUTES.tecnicoBandeja}?vista=en_atencion`, contador: 'enAtencion' },
      { label: 'En espera', to: `${ROUTES.tecnicoBandeja}?vista=en_espera`, contador: 'enEspera' },
      { label: 'Resueltos hoy', to: `${ROUTES.tecnicoBandeja}?vista=resueltos_hoy`, contador: 'resueltosHoy' },
      { label: 'Historial', to: ROUTES.tecnicoHistorial },
      { label: 'Mi cuenta', to: ROUTES.miCuenta },
    ],
  },
  supervisor: {
    title: 'Supervisión',
    pill: { label: 'Cola sin asignar', contador: 'colaSinAsignar' },
    // Mi cuenta va solo en el bloque de abajo del menú
    items: [
      { label: 'Tablero', to: ROUTES.supervisorTablero, end: true },
      { label: 'Cola de atención', to: ROUTES.supervisorCola, contador: 'colaTotal' },
      { label: 'Categorías', to: ROUTES.supervisorCategorias },
      { label: 'Sedes y ambientes', to: ROUTES.supervisorAmbientes },
      { label: 'Técnicos por categoría', to: ROUTES.supervisorTecnicos },
      { label: 'Satisfacción', to: ROUTES.supervisorSatisfaccion },
      { label: 'Carga por técnico', to: ROUTES.supervisorCarga },
      { label: 'Usuarios', to: ROUTES.supervisorUsuarios, contador: 'usuariosTotal' },
    ],
  },
})
