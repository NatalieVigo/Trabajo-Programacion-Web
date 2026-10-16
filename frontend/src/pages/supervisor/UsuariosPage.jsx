import { useCallback, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { listarCuentas } from '../../services/administracionUsuarios.service.js'
import { usuarioFichaPath } from '../../routes/routePaths.js'
import { Alert, Button, Card, EmptyState, PageHeader, SelectInput, TextInput, useToast } from '../../shared/components'
import { descargarFilasCsv } from '../../utils/exportarCsv.js'
import { pluralize } from '../../utils/format.js'
import Paginacion from '../catalogo/Paginacion.jsx'
import InvitarTecnicoButton from './InvitarTecnicoButton.jsx'
import BloquearCuentaModal from './usuarios/BloquearCuentaModal.jsx'
import { EstadoCuenta, RolCuenta } from './usuarios/EtiquetasCuenta.jsx'
import { FILTROS_CUENTAS, cuentasAFilas, filtrarCuentas } from './usuarios/cuentasList.js'
import './metricas/Metricas.css'
import './usuarios/Usuarios.css'

const ROLES = [{ value: 'usuario', label: 'Usuario' }, { value: 'tecnico', label: 'Técnico' }, { value: 'supervisor', label: 'Supervisor' }]
const ESTADOS = [{ value: 'activo', label: 'Activo' }, { value: 'bloqueado', label: 'Bloqueado' }, { value: 'inactivo', label: 'Inactivo' }]
const POR_PAGINA = 15

export default function UsuariosPage() {
  const { usuario } = useAuth()
  const cargar = useCallback(() => listarCuentas(usuario.id), [usuario.id])
  const consulta = useAsyncData(cargar)
  const toast = useToast()
  const [filtros, setFiltros] = useState(FILTROS_CUENTAS)
  const [pagina, setPagina] = useState(1)
  const [bloqueando, setBloqueando] = useState(null)
  useDocumentTitle('Usuarios')
  const cuentas = consulta.data ?? []
  const filtradas = filtrarCuentas(cuentas, filtros)
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA)
  const resumen = `${pluralize(cuentas.length, 'cuenta', 'cuentas')} · ${pluralize(cuentas.filter((u) => u.rol === 'usuario').length, 'usuario', 'usuarios')}, ${pluralize(cuentas.filter((u) => u.rol === 'tecnico').length, 'técnico', 'técnicos')}, ${pluralize(cuentas.filter((u) => u.rol === 'supervisor').length, 'supervisor', 'supervisores')}`
  function filtrar(campo, valor) { setFiltros({ ...filtros, [campo]: valor }); setPagina(1) }
  function limpiar() { setFiltros(FILTROS_CUENTAS); setPagina(1) }
  function exportar() {
    try { descargarFilasCsv('cuentas-mesa-ayuda.csv', cuentasAFilas(filtradas)); toast.success('Cuentas exportadas.') }
    catch { toast.error('No pudimos exportar las cuentas. Vuelve a intentarlo.') }
  }
  return <div className="hu7-page">
    <PageHeader title="Usuarios" subtitle={consulta.status === 'success' ? resumen : undefined} actions={<><InvitarTecnicoButton /><Button onClick={exportar} disabled={consulta.status !== 'success'}>Exportar cuentas</Button></>} />
    {consulta.status === 'loading' && <Card aria-busy="true">Cargando cuentas…</Card>}
    {consulta.status === 'error' && <Alert variant="error" actions={<Button variant="secondary" onClick={consulta.reload}>Reintentar</Button>}>{consulta.error?.message}</Alert>}
    {consulta.status === 'success' && <>
      <div className="hu7-usuarios__filtros">
        <TextInput aria-label="Buscar por nombre o correo" type="search" placeholder="Buscar por nombre o correo" value={filtros.busqueda} onChange={(e) => filtrar('busqueda', e.target.value)} />
        <SelectInput aria-label="Rol" placeholder="Rol: todos" options={ROLES} value={filtros.rol} onChange={(e) => filtrar('rol', e.target.value)} />
        <SelectInput aria-label="Estado de cuenta" placeholder="Estado: todos" options={ESTADOS} value={filtros.estado} onChange={(e) => filtrar('estado', e.target.value)} />
        <SelectInput aria-label="Unidad" placeholder="Unidad: todas" options={[...new Set(cuentas.map((u) => u.unidad).filter(Boolean))].sort()} value={filtros.unidad} onChange={(e) => filtrar('unidad', e.target.value)} />
        {Object.values(filtros).some(Boolean) && <Button variant="tertiary" size="sm" onClick={limpiar}>Limpiar filtros</Button>}
      </div>
      {visibles.length ? <div className="hu7-tabla-scroll">
        <table className="hu7-tabla hu7-usuarios" aria-label="Cuentas de usuarios">
          <thead><tr>{['Usuario', 'Correo', 'Rol', 'Unidad o especialidad', 'Tickets reportados', 'Estado', 'Acciones'].map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
          <tbody>{visibles.map((u) => <tr key={u.id}>
            <th scope="row">{u.nombre}</th><td className="text-muted">{u.correo}</td><td><RolCuenta rol={u.rol} /></td><td>{u.rol === 'tecnico' ? u.especialidad || 'Sin especialidad' : u.unidad || '—'}</td><td>{u.ticketsReportados}</td><td><EstadoCuenta estado={u.estado} /></td>
            <td><div className="hu7-usuarios__acciones"><Button to={usuarioFichaPath(u.id)} variant="tertiary" size="sm">Ver ficha</Button><Button variant="tertiary-destructive" size="sm" disabled={u.id === usuario.id || u.estado !== 'activo'} onClick={() => setBloqueando(u)} title={u.id === usuario.id ? 'Esta es tu cuenta actual' : u.estado === 'bloqueado' ? 'Puedes desbloquearla desde su ficha' : undefined}>Bloquear</Button></div></td>
          </tr>)}</tbody>
        </table>
        <div className="hu7-usuarios__pie"><p role="status">Mostrando {inicio + 1}-{inicio + visibles.length} de {filtradas.length} cuentas</p><Paginacion pagina={paginaActual} totalPaginas={totalPaginas} onCambiar={setPagina} etiqueta="Páginas de usuarios" /></div>
      </div> : <Card><EmptyState title="No hay cuentas con estos filtros" description="Prueba otra búsqueda o cambia los filtros." action={<Button variant="secondary" onClick={limpiar}>Quitar filtros</Button>} /></Card>}
    </>}
    {bloqueando && <BloquearCuentaModal cuenta={bloqueando} onClose={() => setBloqueando(null)} onBloqueada={consulta.reload} />}
  </div>
}
