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
import {
    cancelarTicket,
    reabrirTicket,
    listarMisTickets,
} from "../../services/tickets.api.js";
import {
    DIAS_PLAZO_REAPERTURA,
    estaDentroDelPlazoDeReapertura,
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
    const [errorCarga, setErrorCarga] = useState('');
    const [guardandoAccion, setGuardandoAccion] = useState(false);
    const [errorAccion, setErrorAccion] = useState('');
    const [exitoAccion, setExitoAccion] = useState('');
    const [mostrarFormularioReapertura, setMostrarFormularioReapertura] = useState(false);
    const [motivoReapertura, setMotivoReapertura] = useState('');

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(async () => {
            if (!usuario) throw new Error('Inicia sesión con una cuenta activa para consultar este ticket.');

            const tickets = await listarMisTickets();
            const ticketPropio = tickets.find((ticket) => ticket.id === id || ticket.codigo === id);
            if (!ticketPropio) throw new Error('El ticket no existe o no pertenece a tu cuenta.');

            return {
                ticket: ticketPropio,
                bitacora: [],
                eventos: [],
                permisos: { comentar: false },
                tiempos: { esperadoHoras: ticketPropio.tiempoEsperadoHoras },
            };
        }).then(
            (atencion) => {
                if (activo) {
                    setDetalle(atencion);
                }
            },
            (reason) => {
                if (activo) setErrorCarga(reason.message || 'No se pudo cargar el detalle del ticket.');
            },
        );

        return () => { activo = false; };
    }, [id, usuario]);

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

    const { ticket, bitacora, eventos } = detalle;
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
    const puedeCancelar = !ticket.tecnico && !ticket.asignadoA && ['abierto', 'reabierto'].includes(estado);
    const puedeReabrir = estaDentroDelPlazoDeReapertura(ticket);
    const pasoDeAtencion = pasoResuelto ? 'hecho' : pasoAtencion ? 'en-curso' : 'pendiente';

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
            const actualizado = await cancelarTicket(ticket.id);
            setDetalle((actual) => ({ ...actual, ticket: { ...actual.ticket, ...actualizado } }));
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
            const actualizado = await reabrirTicket(ticket.id, motivoReapertura);
            setDetalle((actual) => ({ ...actual, ticket: { ...actual.ticket, ...actualizado } }));
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
                    {bitacora.length > 0 && <Bitacora entradas={bitacora} aria-label="Entradas de la bitácora" />}

                    <p className="bitacora-panel__lectura">
                        La bitácora y los comentarios estarán disponibles cuando se conecte el flujo de atención (HU-5).
                    </p>
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
                                <dd>{detalle.tiempos.esperadoHoras ? `${detalle.tiempos.esperadoHoras} h` : '—'}</dd>
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
