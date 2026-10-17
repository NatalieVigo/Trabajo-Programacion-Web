import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, useConfirm } from "../../shared/components";
import { ROUTES } from "../../routes/routePaths";
import { ticketsRepository } from "../../repositories/tickets.repository.js";
import { agregarEntrada, obtenerAtencion } from "../../services/atencion.service.js";
import {
    cancelarTicket,
    DIAS_PLAZO_REAPERTURA,
    estaDentroDelPlazoDeReapertura,
    reabrirTicket,
} from "../../services/tickets.service.js";
import { ESTADO_LABELS, PRIORIDAD_LABELS, ROL_LABELS, formatDateTime, getInitials } from "../../utils/format.js";
import { useAuth } from "../../hooks/useAuth.js";
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
            <div className="ticket-detail-container" style={{ textAlign: 'center', padding: '50px' }}>
                <h2>No se encontró el ticket</h2>
                <p>{errorCarga}</p>
                <Button onClick={handleVolver}>Volver a mis tickets</Button>
            </div>
        );
    }

    if (!detalle) return <div className="ticket-detail-container">Cargando ticket...</div>;

    const { ticket, bitacora, eventos, permisos } = detalle;
    const estado = ticket.estado || 'abierto';
    const prioridad = ticket.prioridad || 'baja';
    const estadoEtiqueta = ESTADO_LABELS[estado] || estado;
    const prioridadEtiqueta = PRIORIDAD_LABELS[prioridad] || prioridad;
    const estadoClase = estado.replaceAll('_', '-');
    const prioridadClase = prioridad.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const fechaLimpia = formatDateTime(ticket.creadoEn) || '—';
    const estadosEnAtencion = ['en_atencion', 'en_espera', 'resuelto', 'cerrado'];
    const pasoAsignado = Boolean(ticket.tecnico) || estadosEnAtencion.includes(estado);
    const pasoAtencion = estadosEnAtencion.includes(estado);
    const pasoResuelto = ['resuelto', 'cerrado'].includes(estado);
    const tecnicoNombre = ticket.tecnico
        ? `${ticket.tecnico.nombres} ${ticket.tecnico.apellidos}`.trim()
        : 'Pendiente';
    const asignacion = eventos.findLast((evento) => evento.tipo === 'asignacion');
    const supervisorNombre = asignacion?.autor
        ? `${asignacion.autor.nombres} ${asignacion.autor.apellidos}`.trim()
        : 'El supervisor';
    const puedeCancelar = !ticket.tecnico && ['abierto', 'reabierto'].includes(estado);
    const puedeReabrir = estaDentroDelPlazoDeReapertura(ticket);

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
        <div className="ticket-detail-container">
            <div className="ticket-detail-header">
                <div className="breadcrumb">
                    <span className="breadcrumb-link" onClick={handleVolver}>Mis tickets</span>
                    <span className="breadcrumb-separator">·</span>
                    <span className="breadcrumb-current">{ticket.codigo}</span>
                </div>

                <div className="title-row">
                    <div className="title-with-badges">
                        <h1>{ticket.codigo}</h1>
                        <span className={`priority-tag ${prioridadClase}`}>{prioridadEtiqueta}</span>
                        <span className={`status-tag ${estadoClase}`}>{estadoEtiqueta}</span>
                    </div>
                    {permisos.comentar && (
                        <Button variant="secondary" onClick={() => document.getElementById('comentario-input')?.focus()}>
                            Agregar información
                        </Button>
                    )}
                </div>
                {puedeCancelar && (
                    <Button variant="secondary" onClick={handleCancelarTicket} disabled={guardandoAccion}>
                        Cancelar ticket
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
                {estado === 'cerrado' && !puedeReabrir && (
                    <p>El plazo de {DIAS_PLAZO_REAPERTURA} días para reabrir este ticket ya venció.</p>
                )}
                {errorAccion && <p role="alert">{errorAccion}</p>}
                {exitoAccion && <p role="status">{exitoAccion}</p>}
                {mostrarFormularioReapertura && puedeReabrir && (
                    <form className="add-comment-form" onSubmit={handleReabrirTicket}>
                        <label htmlFor="motivo-reapertura">MOTIVO DE REAPERTURA</label>
                        <textarea
                            id="motivo-reapertura"
                            rows={3}
                            maxLength={600}
                            required
                            value={motivoReapertura}
                            onChange={(event) => setMotivoReapertura(event.target.value)}
                            placeholder="Describe por qué el problema necesita atención nuevamente."
                        />
                        <Button type="submit" variant="primary" disabled={guardandoAccion}>
                            {guardandoAccion ? 'Reabriendo…' : 'Confirmar reapertura'}
                        </Button>
                    </form>
                )}

                <p className="ticket-subtitle">{ticket.asunto}</p>
                {ticket.descripcion && <p>{ticket.descripcion}</p>}
            </div>

            <div className="ticket-detail-grid">
                <div className="bitacora-card">
                    <h2>Bitácora de la atención</h2>
                    {errorComentario && <p role="alert">{errorComentario}</p>}
                    <div className="comments-list">
                        {bitacora.map((item) => (
                            <div key={item.id} className="comment-item">
                                <div className={`avatar-badge ${(item.autor?.rol || 'usuario').toLowerCase()}`}>
                                    {getInitials(item.autor?.nombres, item.autor?.apellidos) || 'US'}
                                </div>
                                <div className="comment-content">
                                    <div className="comment-meta">
                                        <strong>
                                            {`${item.autor?.nombres || ''} ${item.autor?.apellidos || ''}`.trim() || 'Usuario'}
                                        </strong>
                                        <span className="role-label">{ROL_LABELS[item.autor?.rol] || 'Usuario'}</span>
                                        <span className="dot-separator">·</span>
                                        <span className="date-label">{formatDateTime(item.creadoEn)}</span>
                                    </div>
                                    <p className="comment-text">{item.mensaje}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {permisos.comentar && estado !== 'cerrado' ? (
                        <form className="add-comment-form" onSubmit={handleEnviarComentario}>
                            <label htmlFor="comentario-input">AGREGAR INFORMACIÓN</label>
                            <textarea
                                id="comentario-input"
                                rows={3}
                                maxLength={600}
                                placeholder="Escribe aquí si tienes un dato nuevo que ayude al técnico..."
                                value={nuevoComentario}
                                onChange={(e) => setNuevoComentario(e.target.value)}
                            />
                            <div className="form-footer-row">
                                <Button type="submit" variant="primary" disabled={guardandoComentario || !nuevoComentario.trim()}>
                                    {guardandoComentario ? 'Enviando…' : 'Enviar comentario'}
                                </Button>
                                <span className="disclaimer-text">
                                    Las notas internas del equipo técnico no se muestran aquí.
                                </span>
                            </div>
                        </form>
                    ) : (
                        <p className="disclaimer-text">Este ticket ya no admite comentarios.</p>
                    )}
                </div>

                <aside className="detail-sidebar">
                    <div className="sidebar-card">
                        <h3>Datos del reporte</h3>
                        <div className="report-data-list">
                            <div className="data-row">
                                <span className="data-label">Categoría</span>
                                <span className="data-value">{ticket.categoria?.nombre || 'General'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Subcategoría</span>
                                <span className="data-value">{ticket.subcategoria?.nombre || '-'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Ambiente</span>
                                <span className="data-value highlight">{ticket.ambiente?.codigo || '-'}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Registrado</span>
                                <span className="data-value">{fechaLimpia}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Técnico asignado</span>
                                <span className="data-value">{tecnicoNombre}</span>
                            </div>
                            <div className="data-row">
                                <span className="data-label">Atención esperada</span>
                                <span className="data-value">{detalle.tiempos.esperadoHoras} h</span>
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-card">
                        <h3>Línea de tiempo</h3>
                        <div className="timeline-list">
                            <div className="timeline-item done">
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>Abierto</strong>
                                    <span>{fechaLimpia} · registrado por ti</span>
                                </div>
                            </div>
                            <div className={`timeline-item ${pasoAsignado ? 'done' : 'pending'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>Asignado</strong>
                                    <span>{pasoAsignado ? `${supervisorNombre} asignó el caso` : 'Pendiente'}</span>
                                </div>
                            </div>
                            <div className={`timeline-item ${pasoAtencion ? 'in-progress' : pasoResuelto ? 'done' : 'pending'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>En atención</strong>
                                    <span>{pasoAtencion || pasoResuelto ? `${tecnicoNombre} trabajando` : 'Pendiente'}</span>
                                </div>
                            </div>
                            <div className={`timeline-item ${pasoResuelto ? 'done' : 'pending'}`}>
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <strong>Resuelto</strong>
                                    <span>{pasoResuelto ? 'Problema solucionado' : 'Pendiente'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};