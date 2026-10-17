import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
    Alert,
    Bitacora,
    Button,
    Card,
    EmptyState,
    PriorityBadge,
    StatusBadge,
    useConfirm,
} from "../../shared/components";
import { encuestaEvaluarPath, ROUTES } from "../../routes/routePaths";
import { ticketsRepository } from "../../repositories/tickets.repository.js";
import { agregarEntrada, obtenerAtencion } from "../../services/atencion.service.js";
import {
    cancelarTicket,
    DIAS_PLAZO_REAPERTURA,
    estaDentroDelPlazoDeReapertura,
    reabrirTicket,
} from "../../services/tickets.service.js";
import { formatDateTime, getDisplayName } from "../../utils/format.js";
import { useAuth } from "../../hooks/useAuth.js";
import '../atencion/TicketAtencionPage.css';
import './TicketDetail.css';

export const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const confirm = useConfirm();

    const [detalle, setDetalle] = useState(null);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [errorCarga, setErrorCarga] = useState('');
    const [errorComentario, setErrorComentario] = useState('');
    const [guardandoComentario, setGuardandoComentario] = useState(false);
    const [guardandoAccion, setGuardandoAccion] = useState(false);
    const [errorAccion, setErrorAccion] = useState('');
    const [exitoAccion, setExitoAccion] = useState('');
    const [mostrarFormularioReapertura, setMostrarFormularioReapertura] = useState(false);
    const [motivoReapertura, setMotivoReapertura] = useState('');
    const [usuarioId, setUsuarioId] = useState('');

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => {
            if (!usuario) throw new Error('Inicia sesión con una cuenta activa para consultar este ticket.');

            const ticketPropio = ticketsRepository.findOne(
                (ticket) =>
                    (ticket.id === id || ticket.codigo === id) &&
                    ticket.usuarioId === usuario.id,
            );
            if (!ticketPropio) throw new Error('El ticket no existe o no pertenece a tu cuenta.');

            return obtenerAtencion(ticketPropio.codigo, usuario.id);
        }).then(
            (atencion) => {
                if (activo) {
                    setUsuarioId(usuario.id);
                    setDetalle(atencion);
                }
            },
            (reason) => {
                if (activo) setErrorCarga(reason.message || 'No se pudo cargar el detalle del ticket.');
            },
        );

        return () => { activo = false; };
    }, [id, usuario]);

    const handleEnviarComentario = async (e) => {
        e.preventDefault();
        if (!nuevoComentario.trim() || !detalle || guardandoComentario) return;

        setGuardandoComentario(true);
        setErrorComentario('');
        try {
            const atencionActualizada = await agregarEntrada(
                detalle.ticket.codigo,
                { tipo: 'publico', mensaje: nuevoComentario },
                usuarioId,
            );
            setDetalle(atencionActualizada);
            setNuevoComentario('');
        } catch (reason) {
            setErrorComentario(reason.message || 'No se pudo guardar el comentario.');
        } finally {
            setGuardandoComentario(false);
        }
    };

    const handleVolver = () => {
        if (ROUTES?.usuarioTickets) {
            navigate(ROUTES.usuarioTickets);
        } else {
            navigate('/usuario/tickets');
        }
    };

    if (errorCarga) {
        return (
            <Card>
                <EmptyState
                    title="No se encontró el ticket"
                    description={errorCarga}
                    action={<Button onClick={handleVolver}>Volver a mis tickets</Button>}
                />
            </Card>
        );
    }

    if (!detalle) {
        return (
            <Card aria-busy="true">
                <p role="status" className="text-muted">Cargando ticket…</p>
            </Card>
        );
    }

    const { ticket, bitacora, eventos, permisos } = detalle;
    const estado = ticket.estado || 'abierto';
    const prioridad = ticket.prioridad || 'baja';
    const fechaLimpia = formatDateTime(ticket.creadoEn) || '—';
    const estadosEnAtencion = ['en_atencion', 'en_espera', 'resuelto', 'cerrado'];
    const pasoAsignado = Boolean(ticket.tecnico) || estadosEnAtencion.includes(estado);
    const pasoAtencion = estadosEnAtencion.includes(estado);
    const pasoResuelto = ['resuelto', 'cerrado'].includes(estado);
    const tecnicoNombre = ticket.tecnico ? getDisplayName(ticket.tecnico) : 'Pendiente';
    const asignacion = eventos.findLast((evento) => evento.tipo === 'asignacion');
    const supervisorNombre = asignacion?.autor ? getDisplayName(asignacion.autor) : 'El supervisor';
    const puedeCancelar = !ticket.tecnico && ['abierto', 'reabierto'].includes(estado);
    const puedeReabrir = estaDentroDelPlazoDeReapertura(ticket);
    const pasoDeAtencion = pasoResuelto ? 'hecho' : pasoAtencion ? 'en-curso' : 'pendiente';

    const refrescarDetalle = async () => {
        const actualizada = await obtenerAtencion(ticket.codigo, usuarioId);
        setDetalle(actualizada);
    };

    const handleCancelarTicket = async () => {
        const confirmado = await confirm({
            title: '¿Cancelar este ticket?',
            message: 'No podrás continuar su seguimiento después de cancelarlo.',
            confirmText: 'Cancelar ticket',
            cancelText: 'Mantener ticket',
            variant: 'destructive',
        });
        if (!confirmado || guardandoAccion) return;

        setGuardandoAccion(true);
        setErrorAccion('');
        setExitoAccion('');
        try {
            await cancelarTicket(ticket.id, usuarioId);
            await refrescarDetalle();
            setExitoAccion('El ticket fue cancelado.');
        } catch (reason) {
            setErrorAccion(reason.message || 'No se pudo cancelar el ticket.');
        } finally {
            setGuardandoAccion(false);
        }
    };

    const handleReabrirTicket = async (event) => {
        event.preventDefault();
        if (guardandoAccion) return;

        setGuardandoAccion(true);
        setErrorAccion('');
        setExitoAccion('');
        try {
            await reabrirTicket(ticket.id, motivoReapertura, usuarioId);
            await refrescarDetalle();
            setMotivoReapertura('');
            setMostrarFormularioReapertura(false);
            setExitoAccion('El ticket fue reabierto y volvió a la cola de atención.');
        } catch (reason) {
            setErrorAccion(reason.message || 'No se pudo reabrir el ticket.');
        } finally {
            setGuardandoAccion(false);
        }
    };

    return (
        <div className="detalle-ticket">
            <nav className="ticket-atencion__breadcrumb" aria-label="Ruta de navegación">
                <Link to={ROUTES.usuarioTickets}>Mis tickets</Link> · <span aria-current="page">{ticket.codigo}</span>
            </nav>

            <div className="ticket-cabecera">
                <div className="ticket-cabecera__texto">
                    <div className="ticket-cabecera__linea">
                        <h1 className="ticket-cabecera__codigo">{ticket.codigo}</h1>
                        <p className="ticket-cabecera__etiquetas">
                            <span className="visually-hidden">Prioridad: </span>
                            <PriorityBadge prioridad={prioridad} />
                            <span className="visually-hidden">. Estado: </span>
                            <StatusBadge estado={estado} />
                        </p>
                    </div>
                    <p className="ticket-cabecera__asunto">{ticket.asunto}</p>
                </div>
                <div className="ticket-cabecera__acciones">
                    {permisos.comentar && (
                        <Button variant="secondary" onClick={() => document.getElementById('comentario-input')?.focus()}>
                            Agregar información
                        </Button>
                    )}
                    {/* la encuesta se habilita al cerrar, no al resolver */}
                    {estado === 'cerrado' && (
                        <Button onClick={() => navigate(encuestaEvaluarPath(ticket.codigo))}>
                            Responder encuesta
                        </Button>
                    )}
                    {puedeReabrir && !mostrarFormularioReapertura && (
                        <Button
                            variant="secondary"
                            onClick={() => setMostrarFormularioReapertura(true)}
                            disabled={guardandoAccion}
                        >
                            Reabrir ticket
                        </Button>
                    )}
                    {puedeCancelar && (
                        <Button variant="secondary" onClick={handleCancelarTicket} disabled={guardandoAccion}>
                            Cancelar ticket
                        </Button>
                    )}
                </div>
            </div>

            <div className="detalle-ticket__avisos">
                {estado === 'cerrado' && !puedeReabrir && (
                    <Alert variant="info">
                        El plazo de {DIAS_PLAZO_REAPERTURA} días para reabrir este ticket ya venció.
                    </Alert>
                )}
                {errorAccion && <Alert variant="error">{errorAccion}</Alert>}
                {exitoAccion && <Alert variant="success">{exitoAccion}</Alert>}
                {mostrarFormularioReapertura && puedeReabrir && (
                    <Card>
                        <form className="detalle-ticket__formulario" onSubmit={handleReabrirTicket}>
                            <div className="field">
                                <label className="field__label" htmlFor="motivo-reapertura">MOTIVO DE REAPERTURA</label>
                                <div className="control">
                                    <textarea
                                        id="motivo-reapertura"
                                        className="control__input detalle-ticket__texto"
                                        rows={3}
                                        maxLength={600}
                                        required
                                        value={motivoReapertura}
                                        onChange={(event) => setMotivoReapertura(event.target.value)}
                                        placeholder="Describe por qué el problema necesita atención nuevamente."
                                    />
                                </div>
                            </div>
                            <div className="detalle-ticket__envio">
                                <Button type="submit" variant="primary" disabled={guardandoAccion}>
                                    {guardandoAccion ? 'Reabriendo…' : 'Confirmar reapertura'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}
            </div>

            <div className="ticket-atencion__layout">
                <Card as="section" aria-labelledby="detalle-bitacora-titulo">
                    <h2 id="detalle-bitacora-titulo" className="bitacora-panel__titulo detalle-ticket__titulo">
                        Bitácora de la atención
                    </h2>
                    {errorComentario && <Alert variant="error">{errorComentario}</Alert>}
                    {bitacora.length > 0 && <Bitacora entradas={bitacora} aria-label="Entradas de la bitácora" />}

                    {permisos.comentar && estado !== 'cerrado' ? (
                        <form className="detalle-ticket__formulario detalle-ticket__comentario" onSubmit={handleEnviarComentario}>
                            <div className="field">
                                <label className="field__label" htmlFor="comentario-input">AGREGAR INFORMACIÓN</label>
                                <div className="control">
                                    <textarea
                                        id="comentario-input"
                                        className="control__input detalle-ticket__texto"
                                        rows={3}
                                        maxLength={600}
                                        placeholder="Escribe aquí si tienes un dato nuevo que ayude al técnico..."
                                        value={nuevoComentario}
                                        onChange={(e) => setNuevoComentario(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="detalle-ticket__envio">
                                <Button type="submit" variant="primary" disabled={guardandoComentario || !nuevoComentario.trim()}>
                                    {guardandoComentario ? 'Enviando…' : 'Enviar comentario'}
                                </Button>
                                <span className="detalle-ticket__nota">
                                    Las notas internas del equipo técnico no se muestran aquí.
                                </span>
                            </div>
                        </form>
                    ) : (
                        <p className="bitacora-panel__lectura">Este ticket ya no admite comentarios.</p>
                    )}
                </Card>

                <aside className="ticket-atencion__lateral" aria-label="Datos del ticket">
                    <Card as="section" className="ticket-dato-card" aria-labelledby="detalle-datos-titulo">
                        <h2 id="detalle-datos-titulo" className="ticket-dato-card__titulo">Datos del reporte</h2>
                        <dl className="ticket-datos">
                            <div className="ticket-datos__fila">
                                <dt>Categoría</dt>
                                <dd>{ticket.categoria?.nombre || 'General'}</dd>
                            </div>
                            {ticket.subcategoria && (
                                <div className="ticket-datos__fila">
                                    <dt>Subcategoría</dt>
                                    <dd>{ticket.subcategoria.nombre}</dd>
                                </div>
                            )}
                            <div className="ticket-datos__fila">
                                <dt>Ambiente</dt>
                                <dd className="text-mono">{ticket.ambiente?.codigo || '—'}</dd>
                            </div>
                            <div className="ticket-datos__fila">
                                <dt>Registrado</dt>
                                <dd>{fechaLimpia}</dd>
                            </div>
                            <div className="ticket-datos__fila">
                                <dt>Técnico asignado</dt>
                                <dd>{tecnicoNombre}</dd>
                            </div>
                            <div className="ticket-datos__fila">
                                <dt>Atención esperada</dt>
                                <dd>{detalle.tiempos.esperadoHoras} h</dd>
                            </div>
                        </dl>
                        {ticket.descripcion && <blockquote className="ticket-dato-card__cita">«{ticket.descripcion}»</blockquote>}
                    </Card>

                    <Card as="section" className="ticket-dato-card" aria-labelledby="detalle-linea-titulo">
                        <h2 id="detalle-linea-titulo" className="ticket-dato-card__titulo">Línea de tiempo</h2>
                        <ol className="detalle-ticket__linea">
                            <li className="detalle-ticket__paso detalle-ticket__paso--hecho">
                                <strong>Abierto</strong>
                                <span>{fechaLimpia} · registrado por ti</span>
                            </li>
                            <li className={`detalle-ticket__paso detalle-ticket__paso--${pasoAsignado ? 'hecho' : 'pendiente'}`}>
                                <strong>Asignado</strong>
                                <span>{pasoAsignado ? `${supervisorNombre} asignó el caso` : 'Pendiente'}</span>
                            </li>
                            <li className={`detalle-ticket__paso detalle-ticket__paso--${pasoDeAtencion}`}>
                                <strong>En atención</strong>
                                <span>{pasoAtencion || pasoResuelto ? `${tecnicoNombre} trabajando` : 'Pendiente'}</span>
                            </li>
                            <li className={`detalle-ticket__paso detalle-ticket__paso--${pasoResuelto ? 'hecho' : 'pendiente'}`}>
                                <strong>Resuelto</strong>
                                <span>{pasoResuelto ? 'Problema solucionado' : 'Pendiente'}</span>
                            </li>
                        </ol>
                    </Card>
                </aside>
            </div>
        </div>
    );
};
