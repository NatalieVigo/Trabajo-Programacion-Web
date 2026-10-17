import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Alert, SelectInput, TextInput, Button, Card, PriorityBadge } from "../../shared/components";
import { TicketConfirmation } from "./TicketConfirmation";
import { listarDisponibles } from "../../services/categorias.service.js";
import { listarAmbientes } from "../../services/catalogo.service.js";
import { crearTicket, existeTicketEnCurso } from "../../services/tickets.service.js";
import { ServiceError } from "../../services/ServiceError.js";
import { PRIORIDAD_LABELS } from "../../utils/format.js";
import { useAuth } from "../../hooks/useAuth.js";
import './NewTicket.css';

export const NewTicket = () => {
    const navigate = useNavigate();
    const { usuario } = useAuth();

    const [categorias, setCategorias] = useState([]);
    const [ambientes, setAmbientes] = useState([]);
    const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
    const [errorCatalogos, setErrorCatalogos] = useState('');
    const [errorRegistro, setErrorRegistro] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [datosTicket, setDatosTicket] = useState({
        categoriaId: '',
        subcategoriaId: '',
        ambienteId: '',
        asunto: '',
        descripcion: ''
    });

    const [duplicado, setDuplicado] = useState(false);
    const [ticketCreado, setTicketCreado] = useState(null);

    useEffect(() => {
        let activo = true;

        // Categorías y ambientes vienen del catálogo (HU-2): solo lo activo admite tickets nuevos.
        Promise.all([listarDisponibles(), listarAmbientes()])
            .then(([categoriasDisponibles, ambientesDelCatalogo]) => {
                if (!activo) return;
                setCategorias(categoriasDisponibles);
                setAmbientes(ambientesDelCatalogo);

                const primeraCategoria = categoriasDisponibles[0];
                const habitual = ambientesDelCatalogo.find(({ id }) => id === usuario?.ambienteHabitualId);
                setDatosTicket((actual) => ({
                    ...actual,
                    categoriaId: primeraCategoria?.id ?? '',
                    subcategoriaId: primeraCategoria?.subcategorias[0]?.id ?? '',
                    ambienteId: habitual?.id ?? '',
                }));
            })
            .catch((error) => {
                if (activo) setErrorCatalogos(error.message || 'No se pudo cargar el catálogo para registrar el ticket.');
            })
            .finally(() => {
                if (activo) setCargandoCatalogos(false);
            });

        return () => { activo = false; };
    }, [usuario?.ambienteHabitualId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'ambienteId' || name === 'categoriaId') setDuplicado(false);
        if (name === 'categoriaId') {
            const categoriaSeleccionada = categorias.find((categoria) => categoria.id === value);
            setDatosTicket((actual) => ({
                ...actual,
                categoriaId: value,
                subcategoriaId: categoriaSeleccionada?.subcategorias[0]?.id ?? '',
            }));
        } else {
            setDatosTicket((actual) => ({ ...actual, [name]: value }));
        }
    };

    const categoriaActual = categorias.find((categoria) => categoria.id === datosTicket.categoriaId);
    const subcategorias = categoriaActual?.subcategorias ?? [];
    const subcategoriaActual = subcategorias.find((subcategoria) => subcategoria.id === datosTicket.subcategoriaId);

    const ambienteActual = ambientes.find((ambiente) => ambiente.id === datosTicket.ambienteId);

    // Aviso de duplicado (HU-3): ya hay un ticket en curso en el mismo ambiente y la misma categoría.
    const { ambienteId, categoriaId } = datosTicket;
    useEffect(() => {
        if (!ambienteId || !categoriaId) return undefined;

        let activo = true;
        existeTicketEnCurso({ ambienteId, categoriaId })
            .then((hayDuplicado) => {
                if (activo) setDuplicado(hayDuplicado);
            })
            .catch((error) => {
                if (activo) setErrorRegistro(error.message || 'No se pudo verificar si ya existe un ticket en el aula.');
            });

        return () => { activo = false; };
    }, [ambienteId, categoriaId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setGuardando(true);
        setErrorRegistro('');
        try {
            const ticket = await crearTicket(datosTicket, usuario?.id);
            setTicketCreado(ticket);
        } catch (error) {
            const detalleError = error instanceof ServiceError
                ? Object.values(error.fieldErrors ?? {}).join(' ')
                : '';
            setErrorRegistro(
                error instanceof ServiceError
                    ? [error.message, detalleError].filter(Boolean).join(' ')
                    : 'No se pudo registrar el ticket.',
            );
        } finally {
            setGuardando(false);
        }
    };

    if (ticketCreado) {
        return <TicketConfirmation ticket={ticketCreado} />;
    }

    if (cargandoCatalogos) {
        return (
            <Card aria-busy="true">
                <p role="status" className="text-muted">Cargando categorías…</p>
            </Card>
        );
    }

    return (
        <div className="nuevo-ticket">
            <PageHeader
                title="Nuevo ticket"
                subtitle="Indica qué falla y dónde. La prioridad se sugiere según la categoría y el supervisor puede ajustarla."
            />

            <div className="nuevo-ticket__avisos">
                {errorCatalogos && <Alert variant="error">{errorCatalogos}</Alert>}
                {errorRegistro && <Alert variant="error">{errorRegistro}</Alert>}

                {!errorCatalogos && categorias.length === 0 && (
                    <Alert variant="warning">No hay categorías disponibles para registrar un ticket.</Alert>
                )}

                {duplicado && ambienteActual && categoriaActual && (
                    <Alert variant="warning">
                        Ya existe un ticket de <strong>{categoriaActual.nombre}</strong> en curso para el aula{' '}
                        <strong>{ambienteActual.codigo}</strong>. Revísalo antes de registrar otro. Puedes continuar si se
                        trata de otro incidente.
                    </Alert>
                )}
            </div>

            <div className="nuevo-ticket__layout">
                <Card>
                    <form className="nuevo-ticket__form" onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="field">
                                <label className="field__label" htmlFor="categoriaId">CATEGORÍA</label>
                                <SelectInput
                                    id="categoriaId"
                                    name="categoriaId"
                                    value={datosTicket.categoriaId}
                                    onChange={handleChange}
                                    required
                                    options={categorias.map(({ id, nombre }) => ({ value: id, label: nombre }))}
                                />
                            </div>

                            <div className="field">
                                <label className="field__label" htmlFor="subcategoriaId">SUBCATEGORÍA</label>
                                <SelectInput
                                    id="subcategoriaId"
                                    name="subcategoriaId"
                                    value={datosTicket.subcategoriaId}
                                    onChange={handleChange}
                                    required
                                    options={subcategorias.map(({ id, nombre }) => ({ value: id, label: nombre }))}
                                />
                                <p className="field__message">Depende de la categoría elegida.</p>
                            </div>

                            <div className="field">
                                <label className="field__label" htmlFor="ambienteId">AULA O AMBIENTE</label>
                                <SelectInput
                                    id="ambienteId"
                                    name="ambienteId"
                                    value={datosTicket.ambienteId}
                                    onChange={handleChange}
                                    required
                                    placeholder="Selecciona el aula o ambiente"
                                    options={ambientes.map(({ id, codigo, nombre }) => ({ value: id, label: `${codigo} · ${nombre}` }))}
                                />
                                <p className="field__message">
                                    El lugar donde ocurre la falla, tal como aparece en la puerta.
                                </p>
                            </div>

                            <div className="field">
                                <span className="field__label">PRIORIDAD SUGERIDA</span>
                                <p className="nuevo-ticket__prioridad">
                                    {subcategoriaActual?.prioridadPorDefecto
                                        ? <PriorityBadge prioridad={subcategoriaActual.prioridadPorDefecto} />
                                        : '—'}
                                    <span className="text-muted">Sugerida por la subcategoría</span>
                                </p>
                            </div>

                            <div className="field form-grid__full">
                                <label className="field__label" htmlFor="asunto">ASUNTO</label>
                                <TextInput
                                    id="asunto"
                                    name="asunto"
                                    value={datosTicket.asunto}
                                    onChange={handleChange}
                                    placeholder="Resumen breve del problema"
                                    maxLength={120}
                                    required
                                />
                            </div>

                            <div className="field form-grid__full">
                                <label className="field__label" htmlFor="descripcion">DESCRIPCIÓN</label>
                                <div className="control">
                                    <textarea
                                        id="descripcion"
                                        name="descripcion"
                                        className="control__input nuevo-ticket__descripcion"
                                        value={datosTicket.descripcion}
                                        onChange={handleChange}
                                        rows={4}
                                        maxLength={600}
                                        required
                                        placeholder="El proyector enciende el foco pero la imagen no llega a la pantalla..."
                                    />
                                </div>
                                <p className="field__message nuevo-ticket__ayuda">
                                    <span>Indica qué probaste y desde cuándo ocurre.</span>
                                    <span>{datosTicket.descripcion.length} / 600</span>
                                </p>
                            </div>

                            <div className="field form-grid__full">
                                <span className="field__label">EVIDENCIA (OPCIONAL)</span>
                                <div className="nuevo-ticket__evidencia">
                                    Arrastra una foto o pulsa para elegir · JPG o PNG hasta 5 MB
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <Button type="submit" variant="primary" disabled={guardando || Boolean(errorCatalogos) || categorias.length === 0}>
                                {guardando ? 'Registrando…' : 'Registrar ticket'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
                        </div>
                    </form>
                </Card>

                <aside className="nuevo-ticket__lateral">
                    <Card title="Qué conviene incluir">
                        <ul className="nuevo-ticket__consejos">
                            <li>El aula o ambiente tal como aparece en la puerta.</li>
                            <li>Desde cuándo ocurre la falla y si es intermitente.</li>
                            <li>Qué ya intentaste (cambiar cable, reiniciar equipo).</li>
                            <li>Si hay clase o evento en las próximas horas.</li>
                            <li>Un teléfono de contacto si hay que coordinar el acceso.</li>
                        </ul>
                    </Card>

                    <div className="nuevo-ticket__tiempo">
                        <p className="nuevo-ticket__tiempo-titulo">Tiempo esperado para esta categoría</p>
                        <p>
                            Prioridad {PRIORIDAD_LABELS[subcategoriaActual?.prioridadPorDefecto]?.toLowerCase() || '—'}: atención dentro de{' '}
                            {subcategoriaActual?.tiempoEsperadoHoras ?? categoriaActual?.tiempoEsperadoHoras ?? '—'} horas desde el registro.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
};
