import { Route, Routes } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout.jsx'
import NotFoundPage from '../pages/errors/NotFoundPage.jsx'
import LandingPage from '../pages/public/LandingPage.jsx'
import { ROUTES } from './routePaths.js'

/** Tabla única de rutas. Cada commit de HU-1 agrega aquí las suyas (ver routePaths.js). */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={ROUTES.home} element={<LandingPage />} />
        <Route path={ROUTES.notFound} element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
