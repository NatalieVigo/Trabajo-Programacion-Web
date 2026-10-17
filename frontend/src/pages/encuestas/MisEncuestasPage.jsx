import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { obtenerEncuestasUsuario } from '../../services/encuestas.service.js'
import { Button, Card, EmptyState, PageHeader } from '../../shared/components'
import { formatDate } from '../../utils/format.js'
import './MisEncuestasPage.css'

export default function MisEncuestasPage() {
  const { user, usuario } = useAuth()
  const currentUser = user || usuario
  const navigate = useNavigate()
  const [data, setData] = useState({ encuestas: [], promedioGeneral: 0, totalRespondidas: 0 })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (currentUser?.id) {
        try {
          const res = await obtenerEncuestasUsuario(currentUser.id)
          setData(res)
        } finally {
          setCargando(false)
        }
      } else {
        setCargando(false)
      }
    }
    cargar()
  }, [currentUser?.id])

  if (cargando) {
    return (
      <Card aria-busy="true">
        <p role="status" className="text-muted">
          Cargando encuestas…
        </p>
      </Card>
    )
  }

  const respondidas = `${data.totalRespondidas} ${data.totalRespondidas === 1 ? 'encuesta respondida' : 'encuestas respondidas'}`

  return (
    <div className="mis-encuestas">
      <PageHeader title="Mis encuestas" subtitle={`${respondidas} · promedio que diste: ${data.promedioGeneral} de 5`} />

      {data.encuestas.length === 0 ? (
        <Card>
          <EmptyState
            title="Aún no respondes encuestas"
            description="Cuando se cierre uno de tus tickets te pediremos calificar la atención."
            action={<Button onClick={() => navigate('/usuario/tickets')}>Ver mis tickets</Button>}
          />
        </Card>
      ) : (
        <div className="mis-encuestas__tabla">
          <table>
            <thead>
              <tr>
                <th>TICKET / ASUNTO</th>
                <th>TÉCNICO</th>
                <th>RESPONDIDA</th>
                <th>PUNTAJE</th>
                <th>PLAZO DE EDICIÓN</th>
              </tr>
            </thead>
            <tbody>
              {data.encuestas.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="mis-encuestas__codigo">{e.codigoTicket}</span>
                    <span className="mis-encuestas__asunto">{e.asunto}</span>
                  </td>
                  <td>{e.tecnicoNombre}</td>
                  <td>{formatDate(e.fechaRespuesta)}</td>
                  <td>
                    <span className="mis-encuestas__puntaje">{e.puntajeGeneral} / 5</span>
                  </td>
                  <td>
                    {e.editable ? (
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => navigate(`/usuario/encuestas/${e.codigoTicket}/evaluar`)}
                      >
                        Editar encuesta
                      </Button>
                    ) : (
                      <span className="mis-encuestas__vencido">Plazo vencido</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
