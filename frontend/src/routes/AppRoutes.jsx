import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout.jsx'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AccountPage from '../pages/account/AccountPage.jsx'
import HistorialAtencionPage from '../pages/atencion/HistorialAtencionPage.jsx'
import HistorialCambiosPage from '../pages/atencion/HistorialCambiosPage.jsx'
import TicketAtencionPage from '../pages/atencion/TicketAtencionPage.jsx'
import CategoriaFormPage from '../pages/catalogo/CategoriaFormPage.jsx'
import CategoriasPage from '../pages/catalogo/CategoriasPage.jsx'
import TecnicosCategoriaPage from '../pages/catalogo/TecnicosCategoriaPage.jsx'
import UbicacionesPage from '../pages/catalogo/UbicacionesPage.jsx'
import ColaPage from '../pages/cola/ColaPage.jsx'
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
import SupervisorHomePage from '../pages/supervisor/SupervisorHomePage.jsx'
import TechnicianHomePage from '../pages/technician/TechnicianHomePage.jsx'
import GuestOnly from './GuestOnly.jsx'
import RequireAuth from './RequireAuth.jsx'
import RequireRole from './RequireRole.jsx'
import { PRIVATE_ROUTES } from './routeAccess.js'
import { ROUTES } from './routePaths.js'
/*h3-imports de tickets */
import { MyTickets } from '../pages/tickets/MyTickets.jsx'   
import { TicketDetail } from '../pages/tickets/TicketDetail.jsx' 
import { NewTicket } from '../pages/tickets/NewTicket.jsx'
import { TicketConfirmation } from '../pages/tickets/TicketConfirmation.jsx' 

const pendiente = (title, historia) => <PlaceholderPage title={title} pendiente={historia} />

/** Página de cada ruta privada. Quién puede verla lo define la tabla de routeAccess.js. */
const PRIVATE_PAGES = {
  [ROUTES.usuarioInicio]: <Navigate to={ROUTES.usuarioTickets} replace />,
  // h3-tickets
  [ROUTES.usuarioNuevoTicket]: <NewTicket />,  
  [ROUTES.usuarioTickets]: <MyTickets />,      
  [ROUTES.usuarioTicketDetalle]: <TicketDetail />, 
  [ROUTES.usuarioTicketConfirmacion]: <TicketConfirmation />, 

  [ROUTES.usuarioEncuestaPendiente]: pendiente('Encuesta pendiente', HISTORIAS.encuestas),
  [ROUTES.usuarioEncuestas]: pendiente('Mis encuestas', HISTORIAS.encuestas),

  [ROUTES.tecnicoBandeja]: <TechnicianHomePage />,
  [ROUTES.tecnicoHistorial]: <HistorialAtencionPage />,
  [ROUTES.tecnicoTicket]: <TicketAtencionPage />,
  [ROUTES.tecnicoTicketHistorial]: <HistorialCambiosPage />,

  [ROUTES.supervisorTablero]: <SupervisorHomePage />,
  [ROUTES.supervisorCola]: <ColaPage />,
  [ROUTES.supervisorTicket]: <TicketAtencionPage />,
  [ROUTES.supervisorTicketHistorial]: <HistorialCambiosPage />,
  [ROUTES.supervisorCategorias]: <CategoriasPage />,
  [ROUTES.supervisorCategoriaNueva]: <CategoriaFormPage />,
  [ROUTES.supervisorCategoriaEditar]: <CategoriaFormPage />,
  [ROUTES.supervisorAmbientes]: <UbicacionesPage />,
  [ROUTES.supervisorTecnicos]: <TecnicosCategoriaPage />,
  [ROUTES.supervisorUsuarios]: pendiente('Usuarios', HISTORIAS.metricas),

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
