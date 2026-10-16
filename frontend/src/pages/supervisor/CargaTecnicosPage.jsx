import { useCallback, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { obtenerCargaTecnicos, rangoMetricasInicial } from '../../services/metricas.service.js'
import { Alert, Card, PageHeader } from '../../shared/components'
import { formatDuracion } from '../../utils/duracion.js'
import MetricasContenido from './metricas/MetricasContenido.jsx'
import PeriodoFiltro from './metricas/PeriodoFiltro.jsx'
import './metricas/Metricas.css'

function TablaCarga({ filas }) {
  const maximo = Math.max(1, ...filas.map((fila) => fila.resueltos))
  return <div className="hu7-tabla-scroll"><table className="hu7-tabla hu7-carga" aria-label="Carga por técnico">
    <thead><tr>{['Técnico', 'Especialidad', 'Asignados', 'Resueltos', 'En espera', 'Tiempo promedio', 'Satisfacción', 'Resueltos en el periodo'].map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
    <tbody>{filas.map((fila) => <tr key={fila.id}>
      <th scope="row">{fila.nombre}</th><td className="text-muted">{fila.especialidad || 'Sin especialidad'}</td>
      <td>{fila.asignados}</td><td>{fila.resueltos}</td><td>{fila.enEspera}</td>
      <td>{fila.promedioMs === null ? '—' : formatDuracion(fila.promedioMs)}</td>
      <td className="hu7-carga__puntaje">{fila.satisfaccion === null ? '—' : `${fila.satisfaccion.toFixed(1)} / 5`}</td>
      <td><div className="hu7-barras__pista" role="img" aria-label={`${fila.resueltos} resueltos en el periodo`}><div style={{ width: `${fila.resueltos / maximo * 100}%` }} /></div></td>
    </tr>)}</tbody>
  </table></div>
}

export default function CargaTecnicosPage() {
  const { usuario } = useAuth()
  const [rango, setRango] = useState(rangoMetricasInicial)
  const cargar = useCallback(() => obtenerCargaTecnicos(usuario.id, rango), [usuario.id, rango])
  const consulta = useAsyncData(cargar)
  const d = consulta.data
  useDocumentTitle('Carga por técnico')
  return <div className="hu7-page">
    <PageHeader title="Carga por técnico" subtitle={d ? `${d.filas.length} técnicos activos · ${d.totalAsignados} tickets asignados · promedio ${d.promedioAsignados.toFixed(1)} tickets por técnico` : undefined} actions={<PeriodoFiltro rango={rango} onChange={setRango} />} />
    <MetricasContenido consulta={consulta}>{(datos) => <>
      {datos.filas.length ? <TablaCarga filas={datos.filas} /> : <Card>No hay técnicos activos.</Card>}
      <div className="hu7-carga__notas">
        <Alert variant="info">{datos.aviso}</Alert>
        <Card>Los tiempos en espera no cuentan en el tiempo promedio. Satisfacción es el promedio de las encuestas respondidas del periodo.</Card>
      </div>
    </>}</MetricasContenido>
  </div>
}
