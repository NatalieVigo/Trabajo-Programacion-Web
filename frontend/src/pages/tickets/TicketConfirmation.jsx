import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, CheckIcon, PriorityBadge, StatusBadge } from "../../shared/components";
import { ROUTES, usuarioTicketDetallePath } from "../../routes/routePaths";
import { ambientesRepository, categoriasRepository, subcategoriasRepository } from "../../repositories/catalogo.repository.js";
import './TicketConfirmation.css';

export const TicketConfirmation = ({ ticket }) => {
    const navigate = useNavigate();
    const [copiado, setCopiado] = useState(false);

    if (!ticket) return <Navigate to={ROUTES.usuarioTickets} replace />;

    // Copiar el código del ticket al portapapeles
    const handleCopiarCodigo = () => {
        if (ticket?.codigo) {
            navigator.clipboard.writeText(ticket.codigo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    // Ir a la vista principal con la lista de mis tickets
    const handleIrAMisTickets = () => {
        if (ROUTES?.usuarioTickets) {
            navigate(ROUTES.usuarioTickets);
        } else {
            navigate('/user/tickets');
        }
    };

    // Ver a detalle el ticket recién creado
    const handleVerDetalle = () => {
        if (ROUTES?.usuarioTicketDetalle && ticket?.id) {
            navigate(usuarioTicketDetallePath(ticket.id));
        } else {
            handleIrAMisTickets();
        }
    };

    const ambiente = ambientesRepository.findById(ticket?.ambienteId);
    const categoria = categoriasRepository.findById(ticket?.categoriaId);
    const subcategoria = subcategoriasRepository.findById(ticket?.subcategoriaId);
    const tiempoEsperado = ticket?.tiempoEsperadoHoras
        ? `${ticket.tiempoEsperadoHoras} h hábiles`
        : 'En evaluación';

    return (
        <div className="confirmacion">
            <div className="confirmacion__card">
                <div className="confirmacion__icono" aria-hidden="true">
                    <CheckIcon />
                </div>

                <h1 className="confirmacion__titulo">Tu ticket quedó registrado</h1>
                <p className="confirmacion__subtitulo">
                    Guarda el código: con él puedes buscar el ticket desde la cabecera en cualquier momento.
                </p>

                {/* Bloque con el codigo generado */}
                <div className="confirmacion__codigo">
                    <span className="confirmacion__codigo-texto">{ticket?.codigo}</span>
                    <Button variant="secondary" size="sm" onClick={handleCopiarCodigo}>
                        {copiado ? '¡Copiado!' : 'Copiar'}
                    </Button>
                </div>

                {/* Resumen rapido de prioridad, tiempo y lugar */}
                <dl className="confirmacion__datos">
                    <div className="confirmacion__dato">
                        <dt className="text-label text-muted">Prioridad asignada</dt>
                        <dd className="confirmacion__etiquetas">
                            <PriorityBadge prioridad={ticket?.prioridad} />
                            <StatusBadge estado={ticket?.estado || 'abierto'} />
                        </dd>
                    </div>

                    <div className="confirmacion__dato">
                        <dt className="text-label text-muted">Tiempo de atención esperado</dt>
                        <dd>{tiempoEsperado}</dd>
                    </div>

                    <div className="confirmacion__dato">
                        <dt className="text-label text-muted">Ambiente</dt>
                        <dd>
                            <span className="text-mono">{ambiente?.codigo || ticket?.ambienteCodigo || '—'}</span> · {categoria?.nombre || 'General'}
                            {subcategoria ? ` · ${subcategoria.nombre}` : ''}
                        </dd>
                    </div>
                </dl>

                {/* Botones para redirigir */}
                <div className="confirmacion__acciones">
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