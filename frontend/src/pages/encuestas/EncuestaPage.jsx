import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { obtenerEncuestaPorTicket, registrarEncuesta } from '../../services/encuestas.service.js'
import { obtenerTicketPorCodigo } from '../../services/atencion.service.js'
import { obtenerResumenCuenta } from '../../services/usuarios.service.js'
import { useToast } from '../../shared/components/Toast/useToast.js'
import Button from '../../shared/components/Button/Button.jsx'
import { Card, EmptyState, PageHeader } from '../../shared/components'
import './EncuestaPage.css'

const SIN_PENDIENTES = {
  titulo: 'No tienes encuestas pendientes',
  descripcion: 'Cuando se cierre uno de tus tickets podrás calificar la atención durante 7 días.',
}

const TICKET_NO_DISPONIBLE = {
  titulo: 'No encontramos un ticket cerrado tuyo con ese código',
  descripcion: 'Solo puedes calificar la atención de tus propios tickets una vez cerrados.',
}

export default function EncuestaPage() {
  const { codigoTicket } = useParams()
  const { user, usuario } = useAuth()
  const currentUser = user || usuario
  const navigate = useNavigate()
  const toast = useToast()

  const [ticket, setTicket] = useState(null)
  const [puntajeGeneral, setPuntajeGeneral] = useState(5)
  const [rapidez, setRapidez] = useState(5)
  const [trato, setTrato] = useState(5)
  const [solucion, setSolucion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [cargando, setCargando] = useState(true)
  const [noDisponible, setNoDisponible] = useState(null)
  const usuarioId = currentUser?.id

  useEffect(() => {
    async function CargarDatos() {
      try {
        // sin código se abre la que vence primero, como en el contador del menú
        let codigo = codigoTicket
        if (!codigo) {
          const resumen = await obtenerResumenCuenta(usuarioId)
          codigo = resumen.encuestaPendiente?.ticketCodigo
          if (!codigo) {
            setNoDisponible(SIN_PENDIENTES)
            return
          }
        }
        const t = await obtenerTicketPorCodigo(codigo)
        if (!t || t.usuarioId !== usuarioId || t.estado !== 'cerrado') {
          setNoDisponible(TICKET_NO_DISPONIBLE)
          return
        }
        setTicket(t)
        const codigoBuscado = t.codigo
        if (codigoBuscado) {
          const enc = await obtenerEncuestaPorTicket(codigoBuscado)
          if (enc) {
            setPuntajeGeneral(enc.puntajeGeneral)
            setRapidez(enc.rapidez)
            setTrato(enc.trato)
            setSolucion(enc.solucion)
            setComentario(enc.comentario || '')
          }
        }
      } catch {
        toast.showError('No se pudo cargar la información del ticket.')
      } finally {
        setCargando(false)
      }
    }
    CargarDatos()
  }, [codigoTicket, usuarioId, toast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const codigoFinal = codigoTicket || ticket?.codigo
    if (!codigoFinal) {
      toast.showError('No se encontró el ticket a evaluar.')
      return
    }
    try {
      await registrarEncuesta({
        codigoTicket: codigoFinal,
        usuarioId: currentUser?.id,
        puntajeGeneral,
        rapidez,
        trato,
        solucion,
        comentario,
      })
      toast.showSuccess(`Gracias, registramos tu encuesta del ticket ${codigoFinal}.`)
      navigate('/usuario/encuestas')
    } catch (err) {
      toast.showError(err.message || 'Error al guardar la encuesta.')
    }
  }

  const getTextoPuntaje = (puntaje) => {
    switch (puntaje) {
      case 1:
        return '1 · Muy insatisfecho'
      case 2:
        return '2 · Insatisfecho'
      case 3:
        return '3 · Regular'
      case 4:
        return '4 · Buena atención'
      case 5:
        return '5 · Excelente atención'
      default:
        return `${puntaje} · Calificación`
    }
  }

  if (cargando) {
    return (
      <Card aria-busy="true">
        <p role="status" className="text-muted">
          Cargando encuesta…
        </p>
      </Card>
    )
  }

  if (noDisponible) {
    return (
      <Card>
        <EmptyState
          title={noDisponible.titulo}
          description={noDisponible.descripcion}
          action={
            <Button variant="secondary" onClick={() => navigate('/usuario/encuestas')}>
              Ver mis encuestas
            </Button>
          }
        />
      </Card>
    )
  }

  const aspectos = [
    { id: 'rapidez', etiqueta: 'Rapidez', valor: rapidez, cambiar: setRapidez },
    { id: 'trato', etiqueta: 'Trato del técnico', valor: trato, cambiar: setTrato },
    { id: 'solucion', etiqueta: 'Solución del problema', valor: solucion, cambiar: setSolucion },
  ]

  return (
    <div className="encuesta">
      <PageHeader
        title="¿Cómo fue la atención de tu ticket?"
        subtitle="Tu respuesta ayuda al área de Infraestructura a mejorar los tiempos y el trato. Toma menos de un minuto."
      />

      <div className="encuesta__layout">
        <Card>
          <form className="encuesta__form" onSubmit={handleSubmit}>
            <div className="encuesta__grupo" role="group" aria-labelledby="encuesta-general">
              <span id="encuesta-general" className="text-label text-muted">
                PUNTAJE GENERAL
              </span>
              <div className="encuesta__puntajes">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="encuesta__puntaje encuesta__puntaje--grande"
                    onClick={() => setPuntajeGeneral(val)}
                    aria-pressed={puntajeGeneral === val}
                  >
                    {val}
                  </button>
                ))}
                <span className="encuesta__texto-puntaje">{getTextoPuntaje(puntajeGeneral)}</span>
              </div>
            </div>

            <div className="encuesta__grupo">
              <span className="text-label text-muted">CALIFICACIÓN POR ASPECTOS</span>
              <div className="encuesta__aspectos">
                {aspectos.map(({ id, etiqueta, valor, cambiar }) => (
                  <div key={id} className="encuesta__aspecto" role="group" aria-labelledby={`encuesta-${id}`}>
                    <span id={`encuesta-${id}`}>{etiqueta}</span>
                    <div className="encuesta__puntajes">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          className="encuesta__puntaje"
                          onClick={() => cambiar(val)}
                          aria-pressed={valor === val}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="comentario">
                COMENTARIO (OPCIONAL)
              </label>
              <div className="control">
                <textarea
                  id="comentario"
                  className="control__input encuesta__comentario"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Escribe aquí tu opinión sobre el servicio recibido..."
                  maxLength={500}
                />
              </div>
              <p className="field__message">Tu comentario lo lee el supervisor del área; el técnico lo ve sin tu nombre.</p>
            </div>

            <div className="encuesta__acciones">
              <Button type="submit" variant="primary">
                Enviar encuesta
              </Button>
              <Button type="button" variant="tertiary" onClick={() => navigate('/usuario/tickets')}>
                Responder después
              </Button>
            </div>
          </form>
        </Card>

        <aside className="encuesta__lateral">
          <Card title="Ticket evaluado">
            <p className="encuesta__codigo">{ticket?.codigo}</p>
            <p className="encuesta__asunto">{ticket?.asunto}</p>
            <dl className="encuesta__datos">
              <div>
                <dt>Categoría</dt>
                <dd>{ticket?.categoriaNombre}</dd>
              </div>
              <div>
                <dt>Ambiente</dt>
                <dd className="text-mono">{ticket?.ambienteCodigo}</dd>
              </div>
              <div>
                <dt>Técnico</dt>
                <dd>{ticket?.tecnicoNombre || 'Atendido'}</dd>
              </div>
              <div>
                <dt>Cerrado</dt>
                <dd>{ticket?.fechaCierre || 'Recientemente'}</dd>
              </div>
            </dl>
          </Card>

          <p className="encuesta__nota">Puedes editar tu respuesta hasta 7 días después de enviarla.</p>
        </aside>
      </div>
    </div>
  )
}

