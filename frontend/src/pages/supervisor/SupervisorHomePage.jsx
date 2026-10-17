import { useCallback, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { obtenerTablero, rangoMetricasInicial } from '../../services/metricas.service.js'
import { Button, Card, PageHeader, useToast } from '../../shared/components'
import { formatDuracion } from '../../utils/duracion.js'
import { formatDateTime } from '../../utils/format.js'
import { descargarFilasCsv } from '../../utils/exportarCsv.js'
import PeriodoFiltro from './metricas/PeriodoFiltro.jsx'
import MetricasContenido from './metricas/MetricasContenido.jsx'
import { BarrasMetricas, GraficoEstados } from './metricas/GraficosMetricas.jsx'
import './metricas/Metricas.css'

function Indicador({ titulo, valor, detalle, peligro = false, variacion = false }) {
  return <Card className={`hu7-indicador ${peligro ? 'hu7-indicador--peligro' : ''}`}><h2>{titulo}</h2><strong>{valor}</strong><p className={variacion ? 'hu7-variacion' : undefined}>{detalle}</p></Card>
}

export default function SupervisorHomePage() {
  const { usuario } = useAuth()
  const [rango, setRango] = useState(rangoMetricasInicial)
  const cargar = useCallback(() => obtenerTablero(usuario.id, rango), [usuario.id, rango])
  const consulta = useAsyncData(cargar)
  const toast = useToast()
  useDocumentTitle('Tablero de métricas')
  function exportar() {
    const d = consulta.data
    try {
      descargarFilasCsv(`metricas-${rango.desde}-${rango.hasta}.csv`, [
        ['Periodo', rango.desde, rango.hasta], ['Indicador', 'Valor'], ['Tickets del periodo', d.total],
        ['Abiertos ahora', d.abiertos], ['Sin asignar', d.sinAsignar],
        ['Tiempo promedio de atención', d.promedioMs === null ? 'Sin datos' : formatDuracion(d.promedioMs)], ['Fuera del tiempo esperado', d.fueraDePlazo],
        [], ['Estado', 'Tickets'], ...d.porEstado.map((fila) => [fila.nombre, fila.total]),
        [], ['Categoría', 'Tickets'], ...d.porCategoria.map((fila) => [fila.nombre, fila.total]),
        [], ['Ambiente', 'Tickets'], ...d.ambientes.map((fila) => [fila.nombre, fila.total]),
      ])
      toast.success('Reporte descargado.')
    } catch { toast.error('No pudimos descargar el reporte. Vuelve a intentarlo.') }
  }
  return <div className="hu7-page">
    <PageHeader title="Tablero de métricas" subtitle={consulta.data ? `${consulta.data.sede} · datos al ${formatDateTime(consulta.data.actualizadoEn)}` : undefined}
      actions={<><PeriodoFiltro rango={rango} onChange={setRango} etiqueta="Rango" /><Button variant="secondary" onClick={exportar} disabled={consulta.status !== 'success'}>Descargar reporte</Button></>} />
    <MetricasContenido consulta={consulta}>{(d) => <>
      <div className="hu7-indicadores">
        <Indicador titulo="Tickets del periodo" valor={d.total} variacion={d.variacionTickets !== null} detalle={d.variacionTickets === null ? 'Sin base para comparar con el periodo anterior' : `${d.variacionTickets > 0 ? '+' : ''}${d.variacionTickets.toFixed(1)} % frente al periodo anterior`} />
        <Indicador titulo="Abiertos ahora" valor={d.abiertos} detalle={`${d.sinAsignar} sin asignar`} />
        <Indicador titulo="Tiempo promedio de atención" valor={d.promedioMs === null ? '—' : formatDuracion(d.promedioMs)} variacion={d.variacionTiempoMs !== null && d.variacionTiempoMs <= 0} detalle={d.variacionTiempoMs === null ? 'Sin base para comparar con el periodo anterior' : `${d.variacionTiempoMs > 0 ? '+' : '−'}${Math.round(Math.abs(d.variacionTiempoMs) / 60000)} min frente al periodo anterior`} />
        <Indicador titulo="Fuera del tiempo esperado" valor={d.fueraDePlazo} peligro detalle={`${d.porcentajeFuera.toFixed(1)} % de los tickets del periodo`} />
      </div>
      <div className="hu7-graficos">
        <Card title="Tickets por estado"><GraficoEstados datos={d.porEstado} total={d.total} /></Card>
        <Card title="Tickets por categoría"><BarrasMetricas datos={d.porCategoria} /></Card>
        <Card title="Ambientes con más tickets"><BarrasMetricas datos={d.ambientes} ambiente /></Card>
      </div>
    </>}</MetricasContenido>
  </div>
}
