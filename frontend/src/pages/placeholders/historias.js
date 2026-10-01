/**
 * Historias dueñas de las secciones que aún no existen (enunciado §5), para PendingFeature. Las de HU-1 marcadas como
 * `propia` llegan en una etapa posterior de esta misma historia.
 */
export const HISTORIAS = Object.freeze({
  catalogo: { historia: 'HU-2', nombre: 'Catálogo de servicios' },
  tickets: { historia: 'HU-3', nombre: 'Registro de tickets' },
  cola: { historia: 'HU-4', nombre: 'Cola y asignación' },
  atencion: { historia: 'HU-5', nombre: 'Atención y cierre' },
  encuestas: { historia: 'HU-6', nombre: 'Encuesta de satisfacción' },
  metricas: { historia: 'HU-7', nombre: 'Métricas y usuarios' },
  invitaciones: { historia: 'HU-1.4', nombre: 'Gestión de invitaciones', propia: true },
  accesoPorRol: { historia: 'HU-1.4', nombre: 'Protección de rutas por rol', propia: true },
  miCuenta: { historia: 'HU-1.5', nombre: 'Consulta y edición de la cuenta', propia: true },
  recuperacion: { historia: 'HU-1.6', nombre: 'Cambio de contraseña y recuperación', propia: true },
})
