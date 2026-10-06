import { Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout.jsx'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AccountPage from '../pages/account/AccountPage.jsx'
import CategoriaFormPage from '../pages/catalogo/CategoriaFormPage.jsx'
import CategoriasPage from '../pages/catalogo/CategoriasPage.jsx'
import TecnicosCategoriaPage from '../pages/catalogo/TecnicosCategoriaPage.jsx'
import UbicacionesPage from '../pages/catalogo/UbicacionesPage.jsx'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx'
import InvitationPage from '../pages/auth/InvitationPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage.jsx'
import ForbiddenPage from '../pages/errors/ForbiddenPage.jsx'
import NotFoundPage from '../pages/errors/NotFoundPage.jsx'
import { HISTORIAS } from '../pages/placeholders/historias.js'
import PlaceholderPage from '../pages/placeholders/PlaceholderPage.jsx'
import LandingPage from '../pages/public/LandingPage.jsx'
import InvitationsPage from '../pages/supervisor/InvitationsPage.jsx'
import SupervisorHomePage from '../pages/supervisor/SupervisorHomePage.jsx'
import TechnicianHomePage from '../pages/technician/TechnicianHomePage.jsx'
import UserHomePage from '../pages/user/UserHomePage.jsx'
import GuestOnly from './GuestOnly.jsx'
import RequireAuth from './RequireAuth.jsx'
import RequireRole from './RequireRole.jsx'
import { PRIVATE_ROUTES } from './routeAccess.js'
import { ROUTES } from './routePaths.js'

const pendiente = (title, historia) => <PlaceholderPage title={title} pendiente={historia} />

/** Página de cada ruta privada. Quién puede verla lo define la tabla de routeAccess.js. */
const PRIVATE_PAGES = {
  [ROUTES.usuarioInicio]: <UserHomePage />,
  [ROUTES.usuarioNuevoTicket]: pendiente('Nuevo ticket', HISTORIAS.tickets),
  [ROUTES.usuarioTickets]: pendiente('Mis tickets', HISTORIAS.tickets),
  [ROUTES.usuarioEncuestaPendiente]: pendiente('Encuesta pendiente', HISTORIAS.encuestas),
  [ROUTES.usuarioEncuestas]: pendiente('Mis encuestas', HISTORIAS.encuestas),

  [ROUTES.tecnicoBandeja]: <TechnicianHomePage />,
  [ROUTES.tecnicoHistorial]: pendiente('Historial', HISTORIAS.atencion),

  [ROUTES.supervisorTablero]: <SupervisorHomePage />,
  [ROUTES.supervisorCola]: pendiente('Cola de atención', HISTORIAS.cola),
  [ROUTES.supervisorCategorias]: <CategoriasPage />,
  [ROUTES.supervisorCategoriaNueva]: <CategoriaFormPage />,
  [ROUTES.supervisorCategoriaEditar]: <CategoriaFormPage />,
  [ROUTES.supervisorAmbientes]: <UbicacionesPage />,
  [ROUTES.supervisorTecnicos]: <TecnicosCategoriaPage />,
  [ROUTES.supervisorUsuarios]: pendiente('Usuarios', HISTORIAS.metricas),
  [ROUTES.supervisorInvitaciones]: <InvitationsPage />,

  [ROUTES.miCuenta]: <AccountPage />,
  [ROUTES.accesoDenegado]: <ForbiddenPage />,
}

/**
 * Tabla única de rutas. Las de visitantes pasan por GuestOnly (con sesión llevan a la vista del rol) y las privadas por
 * RequireAuth y RequireRole, con los roles de routeAccess.js.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={ROUTES.home} element={<LandingPage />} />
        <Route path={ROUTES.invitacion} element={<InvitationPage />} />
        <Route element={<GuestOnly />}>
          <Route path={ROUTES.registro} element={<RegisterPage />} />
          <Route path={ROUTES.iniciarSesion} element={<LoginPage />} />
          <Route path={ROUTES.recuperarContrasena} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.restablecerContrasena} element={<ResetPasswordPage />} />
        </Route>
        <Route path={ROUTES.notFound} element={<NotFoundPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {PRIVATE_ROUTES.map(({ path, roles, recurso }) => (
            <Route
              key={path}
              path={path}
              element={
                <RequireRole roles={roles} recurso={recurso}>
                  {PRIVATE_PAGES[path]}
                </RequireRole>
              }
            />
          ))}
        </Route>
      </Route>
    </Routes>
  )
}
