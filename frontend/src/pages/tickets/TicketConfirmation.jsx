import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components";
import { ROUTES, usuarioTicketDetallePath } from "../../routes/routePaths";
import './TicketConfirmation.css';

export const TicketConfirmation = ({ ticket }) => {
    const navigate = useNavigate();
    const [copiado, setCopiado] = useState(false);

    const handleCopiarCodigo = () => {
        if (ticket?.codigo) {
            navigator.clipboard.writeText(ticket.codigo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    const handleIrAMisTickets = () => {
        if (ROUTES?.usuarioTickets) {
            navigate(ROUTES.usuarioTickets);
        } else {
            navigate('/user/tickets');
        }
    };

    const handleVerDetalle = () => {
        if (ROUTES?.usuarioTicketDetalle) {
            navigate(usuarioTicketDetallePath(ticket.id));
        } else {
            handleIrAMisTickets();
        }
    };

    return (
        <div className="confirmation-container">
            <div className="confirmation-card">
                {/* Icono de Check Verde */}
                <div className="check-icon-box">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>

                <h2>Tu ticket quedó registrado</h2>
                <p className="confirmation-subtitle">
                    Guarda el código: con él puedes buscar el ticket desde la cabecera en cualquier momento.
                </p>

                {/* Recuadro Azul con el Código */}
                <div className="ticket-code-display">
                    <span className="code-text">{ticket.codigo}</span>
                    <button type="button" className="btn-copy" onClick={handleCopiarCodigo}>
                        {copiado ? '¡Copiado!' : 'Copiar'}
                    </button>
                </div>

                {/* Fila de detalles: Prioridad, Tiempo Esperado y Ambiente */}
                <div className="confirmation-details-row">
                    <div className="detail-box">
                        <span className="detail-title">PRIORIDAD ASIGNADA</span>
                        <div className="badges-group">
                            <span className={`priority-tag ${ticket.prioridad.toLowerCase()}`}>
                                {ticket.prioridad}
                            </span>
                            <span className="status-badge-open">
                                {ticket.estado}
                            </span>
                        </div>
                    </div>

                    <div className="detail-box">
                        <span className="detail-title">TIEMPO DE ATENCIÓN ESPERADO</span>
                        <span className="detail-value-text">{ticket.tiempoEsperado}</span>
                    </div>

                    <div className="detail-box">
                        <span className="detail-title">AMBIENTE</span>
                        <span className="detail-value-text">
                            <strong>{ticket.ambiente}</strong> · {ticket.categoriaNombre}
                        </span>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="confirmation-actions">
                    <Button variant="primary" onClick={handleVerDetalle}>
                        Ver el detalle del ticket
                    </Button>
                    <Button variant="secondary" onClick={handleIrAMisTickets}>
                        Ir a mis tickets
                    </Button>
                </div>
            </div>
        </div>
    );
};