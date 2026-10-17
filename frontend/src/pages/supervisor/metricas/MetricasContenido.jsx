import { Alert, Button, Card } from '../../../shared/components'

export default function MetricasContenido({ consulta, children }) {
  if (consulta.status === 'loading') return <Card aria-busy="true"><p role="status">Cargando métricas…</p></Card>
  if (consulta.status === 'error') return <Alert variant="error" actions={<Button variant="secondary" onClick={consulta.reload}>Reintentar</Button>}>{consulta.error?.message ?? 'No pudimos cargar las métricas.'}</Alert>
  return children(consulta.data)
}
