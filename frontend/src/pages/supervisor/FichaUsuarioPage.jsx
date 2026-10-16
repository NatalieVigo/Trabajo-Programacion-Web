import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { desbloquearCuenta, obtenerFichaCuenta } from '../../services/administracionUsuarios.service.js'
import { ROUTES, ticketAtencionPath } from '../../routes/routePaths.js'
import { Alert, Avatar, Button, Card, PriorityBadge, SelectInput, StatusBadge, useConfirm, useToast } from '../../shared/components'
import { formatDate, formatDateTime, formatEstado, formatTelefono } from '../../utils/format.js'
import BloquearCuentaModal from './usuarios/BloquearCuentaModal.jsx'
import { EstadoCuenta, RolCuenta } from './usuarios/EtiquetasCuenta.jsx'
import './metricas/Metricas.css'
import './usuarios/Usuarios.css'

const ESTADOS = ['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto', 'cerrado'].map((value) => ({ value, label: formatEstado(value) }))

function ReportesCuenta({ reportes }) {
  const [estado, setEstado] = useState('')
  const visibles = reportes.filter((t) => !estado || t.estado === estado)
  return <section className="hu7-ficha__reportes">
    <div className="hu7-ficha__reportes-cabecera"><h2>Historial de reportes</h2><SelectInput aria-label="Estado de los reportes" options={ESTADOS} placeholder="Estado: todos" value={estado} onChange={(e) => setEstado(e.target.value)} /></div>
    {visibles.length ? <div className="hu7-ficha__scroll"><table className="hu7-tabla hu7-ficha__tabla" aria-label="Historial de reportes de la cuenta">
      <thead><tr>{['Código', 'Asunto', 'Categoría', 'Ambiente', 'Prioridad', 'Estado', 'Encuesta'].map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
      <tbody>{visibles.map((t) => <tr key={t.id}>
        <th scope="row"><Link className="hu7-ficha__codigo" to={ticketAtencionPath('supervisor', t.codigo)}>{t.codigo}</Link></th>
        <td>{t.asunto}</td><td className="text-muted">{t.categoria}</td><td className="text-mono">{t.ambiente}</td>
        <td><PriorityBadge prioridad={t.prioridad} /></td><td><StatusBadge estado={t.estado} /></td><td>{t.encuesta === null ? '—' : `${t.encuesta} / 5`}</td>
      </tr>)}</tbody>
    </table></div> : <p className="hu7-ficha__vacio">{reportes.length ? 'No hay reportes con este estado.' : 'Esta cuenta aún no ha reportado tickets.'}</p>}
  </section>
}

export default function FichaUsuarioPage() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const cargar = useCallback(() => obtenerFichaCuenta(id, usuario.id), [id, usuario.id])
  const consulta = useAsyncData(cargar)
  const [bloqueando, setBloqueando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()
  const d = consulta.data
  useDocumentTitle(d ? `Usuarios · ${d.cuenta.nombre}` : 'Ficha de usuario')

  async function desbloquear() {
    const ok = await confirm({ title: `¿Desbloquear la cuenta de ${d.cuenta.nombre}?`, message: 'La persona podrá volver a iniciar sesión con sus credenciales.', confirmText: 'Desbloquear cuenta' })
    if (!ok) return
    setGuardando(true)
    try {
      await desbloquearCuenta(id, usuario.id)
      toast.success(`Cuenta desbloqueada. ${d.cuenta.nombre} puede volver a iniciar sesión.`)
      consulta.reload()
    } catch (e) { toast.error(e.message); consulta.reload() }
    finally { setGuardando(false) }
  }

  if (consulta.status === 'loading') return <Card aria-busy="true">Cargando ficha de usuario…</Card>
  if (consulta.status === 'error') return <Alert variant="error" actions={<><Button variant="secondary" onClick={consulta.reload}>Reintentar</Button><Button to={ROUTES.supervisorUsuarios}>Volver a Usuarios</Button></>}>{consulta.error?.message ?? 'No pudimos cargar la ficha.'}</Alert>
  const cuenta = d.cuenta
  return <div className="hu7-page">
    <nav className="hu7-ficha__ruta" aria-label="Ruta de navegación"><Link to={ROUTES.supervisorUsuarios}>Usuarios</Link> · {cuenta.nombre}</nav>
    <div className="hu7-ficha__cabecera">
      <Avatar nombres={cuenta.nombres} apellidos={cuenta.apellidos} tone="primary" size="lg" />
      <div className="hu7-ficha__identidad"><div><h1>{cuenta.nombre}</h1><RolCuenta rol={cuenta.rol} /><EstadoCuenta estado={cuenta.estado} /></div><p>{[cuenta.correo, cuenta.rol === 'tecnico' ? cuenta.especialidad : cuenta.unidad, cuenta.vinculo?.toLowerCase()].filter(Boolean).join(' · ')}</p></div>
      {cuenta.estado === 'bloqueado' ? <Button variant="secondary" onClick={desbloquear} loading={guardando}>Desbloquear cuenta</Button> : <Button variant="secondary" className="hu7-ficha__bloquear" disabled={cuenta.id === usuario.id || cuenta.estado !== 'activo'} onClick={() => setBloqueando(true)} title={cuenta.id === usuario.id ? 'Esta es tu cuenta actual' : undefined}>Bloquear cuenta</Button>}
    </div>
    <div className="hu7-ficha__columnas">
      <aside className="hu7-ficha__datos">
        <Card title="Datos de la cuenta"><dl className="hu7-ficha__campos">
          <div><dt>Teléfono</dt><dd>{formatTelefono(cuenta.telefono) || 'Sin registrar'}</dd></div>
          <div><dt>Ambiente habitual</dt><dd>{d.ambienteHabitual}</dd></div>
          <div><dt>Cuenta creada</dt><dd>{formatDate(cuenta.creadoEn) || 'Sin registro'}</dd></div>
          <div><dt>Último acceso</dt><dd>{formatDateTime(cuenta.ultimoAccesoEn) || 'Sin registro'}</dd></div>
          {cuenta.estado === 'bloqueado' && cuenta.motivoBloqueo && <div><dt>Motivo del bloqueo</dt><dd>{cuenta.motivoBloqueo}</dd></div>}
        </dl></Card>
        <Card title="Resumen de reportes"><dl className="hu7-ficha__resumen">
          <div><dt>Reportados</dt><dd>{d.resumen.reportados}</dd></div><div><dt>Abiertos</dt><dd>{d.resumen.abiertos}</dd></div>
          <div><dt>Cerrados</dt><dd>{d.resumen.cerrados}</dd></div><div><dt>Satisfacción promedio</dt><dd>{d.resumen.satisfaccion === null ? '—' : d.resumen.satisfaccion.toFixed(1)}</dd></div>
        </dl><p className="text-aux text-muted">Promedio de las encuestas que respondió sobre sus tickets cerrados.</p></Card>
      </aside>
      <ReportesCuenta key={id} reportes={d.reportes} />
    </div>
    {bloqueando && <BloquearCuentaModal cuenta={cuenta} onClose={() => setBloqueando(false)} onBloqueada={consulta.reload} />}
  </div>
}
