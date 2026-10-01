import { Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout.jsx'
import PublicLayout from '../layouts/PublicLayout.jsx'
import InvitationPage from '../pages/auth/InvitationPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import NotFoundPage from '../pages/errors/NotFoundPage.jsx'
import { HISTORIAS } from '../pages/placeholders/historias.js'
import PlaceholderPage from '../pages/placeholders/PlaceholderPage.jsx'
import PublicPlaceholderPage from '../pages/placeholders/PublicPlaceholderPage.jsx'
import LandingPage from '../pages/public/LandingPage.jsx'
import SupervisorHomePage from '../pages/supervisor/SupervisorHomePage.jsx'
import TechnicianHomePage from '../pages/technician/TechnicianHomePage.jsx'
import UserHomePage from '../pages/user/UserHomePage.jsx'
import RequireAuth from './RequireAuth.jsx'
import { ROLES } from './roleHome.js'
import { ROUTES } from './routePaths.js'

const pendiente = (title, historia) => <PlaceholderPage title={title} pendiente={historia} />

/**
 * Rutas privadas (SPEC §9) con los roles que pueden verlas. Por ahora RequireAuth solo exige sesión: la protección
 * por rol (RequireRole y la vista 403) llega en HU-1 · 1.4 y usará `roles`.
 */
const PRIVATE_ROUTES = [
  { path: ROUTES.usuarioInicio, roles: ['usuario'], element: <UserHomePage /> },
  { path: ROUTES.usuarioNuevoTicket, roles: ['usuario'], element: pendiente('Nuevo ticket', HISTORIAS.tickets) },
  { path: ROUTES.usuarioTickets, roles: ['usuario'], element: pendiente('Mis tickets', HISTORIAS.tickets) },
  {
    path: ROUTES.usuarioEncuestaPendiente,
    roles: ['usuario'],
    element: pendiente('Encuesta pendiente', HISTORIAS.encuestas),
  },
  { path: ROUTES.usuarioEncuestas, roles: ['usuario'], element: pendiente('Mis encuestas', HISTORIAS.encuestas) },

  { path: ROUTES.tecnicoBandeja, roles: ['tecnico'], element: <TechnicianHomePage /> },
  { path: ROUTES.tecnicoHistorial, roles: ['tecnico'], element: pendiente('Historial', HISTORIAS.atencion) },

  { path: ROUTES.supervisorTablero, roles: ['supervisor'], element: <SupervisorHomePage /> },
  { path: ROUTES.supervisorCola, roles: ['supervisor'], element: pendiente('Cola de atención', HISTORIAS.cola) },
  {
    path: ROUTES.supervisorCategorias,
    roles: ['supervisor'],
    element: pendiente('Categorías de servicio', HISTORIAS.catalogo),
  },
  {
    path: ROUTES.supervisorAmbientes,
    roles: ['supervisor'],
    element: pendiente('Sedes y ambientes', HISTORIAS.catalogo),
  },
  {
    path: ROUTES.supervisorTecnicos,
    roles: ['supervisor'],
    element: pendiente('Técnicos por categoría', HISTORIAS.catalogo),
  },
  { path: ROUTES.supervisorUsuarios, roles: ['supervisor'], element: pendiente('Usuarios', HISTORIAS.metricas) },
  {
    path: ROUTES.supervisorInvitaciones,
    roles: ['supervisor'],
    element: pendiente('Invitaciones', HISTORIAS.invitaciones),
  },

  { path: ROUTES.miCuenta, roles: ROLES, element: pendiente('Mi cuenta', HISTORIAS.miCuenta) },
  { path: ROUTES.accesoDenegado, roles: ROLES, element: pendiente('Acceso denegado', HISTORIAS.accesoPorRol) },
]

/** Tabla única de rutas. Cada commit de HU-1 agrega aquí las suyas (ver routePaths.js). */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={ROUTES.home} element={<LandingPage />} />
        <Route path={ROUTES.registro} element={<RegisterPage />} />
        <Route path={ROUTES.invitacion} element={<InvitationPage />} />
        <Route path={ROUTES.iniciarSesion} element={<LoginPage />} />
        <Route
          path={ROUTES.recuperarContrasena}
          element={<PublicPlaceholderPage title="Recuperar mi contraseña" pendiente={HISTORIAS.recuperacion} />}
        />
        <Route path={ROUTES.notFound} element={<NotFoundPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {PRIVATE_ROUTES.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Route>
      </Route>
    </Routes>
  )
}
