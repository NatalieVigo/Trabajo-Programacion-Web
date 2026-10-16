import { ROUTES } from '../routes/routePaths.js'

/**
 * Menú lateral y píldora de la cabecera de cada rol (SPEC §9; mockups p10, p22 y p24). `contador` es la clave del
 * resultado de resumen.service#obtenerContadores que se muestra como insignia del ítem o en la píldora. `end` hace
 * que el ítem solo quede activo en su ruta exacta y no en las que cuelgan de ella.
 */
export const NAVIGATION = Object.freeze({
  usuario: {
    title: 'Mis servicios',
    pill: { label: 'Mis tickets abiertos', contador: 'ticketsAbiertos' },
    items: [
      // «Inicio» es la landing (p03): el mapa de navegación de p02 no tiene otra pantalla de inicio para el usuario.
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
    // Como en p12 y p22, «Mi cuenta» no va en esta lista: queda solo en el bloque inferior del menú.
    items: [
      { label: 'Tablero', to: ROUTES.supervisorTablero, end: true },
      { label: 'Cola de atención', to: ROUTES.supervisorCola, contador: 'colaTotal' },
      { label: 'Categorías', to: ROUTES.supervisorCategorias },
      { label: 'Sedes y ambientes', to: ROUTES.supervisorAmbientes },
      { label: 'Técnicos por categoría', to: ROUTES.supervisorTecnicos },
      { label: 'Satisfacción', to: ROUTES.supervisorSatisfaccion },
      { label: 'Carga por técnico', to: ROUTES.supervisorCarga },
      { label: 'Usuarios', to: ROUTES.supervisorUsuarios },
    ],
  },
})
