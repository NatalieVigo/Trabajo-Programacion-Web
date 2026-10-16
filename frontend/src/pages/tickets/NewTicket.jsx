import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Alert, SelectInput, TextInput, Button } from "../../shared/components";
import { TicketConfirmation } from "./TicketConfirmation";
import { sessionRepository } from "../../repositories/session.repository.js";
import { listar } from "../../services/categorias.service.js";
import './NewTicket.css';

// Chequear si la categoría o subcategoría está activa
const esElementoActivo = (item) => {
    if (!item) return false;
    
    if (item.activa === false || item.activo === false) return false;
    
    if (item.estado !== undefined && item.estado !== null) {
        const est = String(item.estado).toLowerCase().trim();
        if (['inactiva', 'inactivo', 'false', '0', 'desactivado', 'desactivada'].includes(est)) {
            return false;
        }
    }
    return true;
};

// Normalizar el texto de prioridad
const extraerPrioridad = (obj, fallback = 'Alta') => {
    if (!obj) return fallback;
    const val = obj.prioridad || obj.prioridadPorDefecto || obj.prioridadSugerida;
    if (!val) return fallback;
    
    const norm = String(val).toLowerCase().trim();
    if (norm.includes('criti')) return 'Crítica';
    if (norm === 'alta') return 'Alta';
    if (norm === 'media') return 'Media';
    if (norm === 'baja') return 'Baja';
    return String(val);
};

// Sacar el tiempo estimado en formato legible
const extraerTiempo = (obj, fallback = '8 h hábiles') => {
    if (!obj) return fallback;
    const val = obj.tiempoEsperado || obj.tiempo || obj.tiempoEstimado || obj.tiempoHoras;
    if (!val) return fallback;
    if (typeof val === 'number' || (!isNaN(val) && !String(val).includes('h'))) {
        return `${val} h hábiles`;
    }
    return String(val);
};

// Limpiar tildes y mayúsculas para las clases de CSS
const normalizarClaseCSS = (prioridadStr) => {
    return (prioridadStr || 'alta')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export const NewTicket = () => {
    const navigate = useNavigate();

    const [mapaCategorias, setMapaCategorias] = useState({});
    const [cargandoCategorias, setCargandoCategorias] = useState(true);

    const [datosTicket, setDatosTicket] = useState({
        categoria: '',
        subcategoria: '',
        ambiente: '',
        asunto: '',
        descripcion: ''
    });

    const [duplicado, setDuplicado] = useState(null);
    const [ticketCreado, setTicketCreado] = useState(null);

    // Cargar las categorías activas desde el servicio
    useEffect(() => {
        let isMounted = true;

        listar()
            .then((listaDB) => {
                if (!isMounted || !Array.isArray(listaDB)) return;

                const mapa = {};

                // 1. Nos quedamos solo con lo que esté activo
                const itemsActivos = listaDB.filter(esElementoActivo);

                // 2. Separar las categorías principales (padres)
                const padres = itemsActivos.filter(c => (!c.categoriaPadreId && !c.categoriaId && !c.parentId));

                padres.forEach(p => {
                    const key = String(p.id || p.value || p.nombre.toLowerCase().replace(/\s+/g, '_'));
                    const prioPadre = extraerPrioridad(p, 'Alta');
                    const tiempoPadre = extraerTiempo(p, '8 h hábiles');

                    mapa[key] = {
                        idOriginal: p.id,
                        label: p.nombre || p.label,
                        prioridad: prioPadre,
                        tiempo: tiempoPadre,
                        subcategorias: []
                    };

                    // Si trae subcategorías anidadas
                    if (Array.isArray(p.subcategorias)) {
                        p.subcategorias.filter(esElementoActivo).forEach(sub => {
                            mapa[key].subcategorias.push({
                                value: String(sub.id || sub.value || (sub.nombre || sub.label).toLowerCase().replace(/\s+/g, '_')),
                                label: sub.nombre || sub.label,
                                prioridad: extraerPrioridad(sub, prioPadre),
                                tiempo: extraerTiempo(sub, tiempoPadre)
                            });
                        });
                    }
                });

                // 3. Subcategorías sueltas vinculadas a un padre por ID
                itemsActivos.forEach(item => {
                    const padreId = item.categoriaPadreId || item.categoriaId || item.parentId;
                    if (padreId) {
                        const parentKey = Object.keys(mapa).find(k => 
                            String(mapa[k].idOriginal) === String(padreId) || 
                            k === String(padreId) ||
                            mapa[k].label.toLowerCase().trim() === String(padreId).toLowerCase().trim()
                        );

                        if (parentKey) {
                            const valSub = String(item.id || item.value || item.nombre.toLowerCase().replace(/\s+/g, '_'));
                            const yaExiste = mapa[parentKey].subcategorias.some(s => String(s.value) === valSub || s.label === item.nombre);
                            
                            if (!yaExiste) {
                                mapa[parentKey].subcategorias.push({
                                    value: valSub,
                                    label: item.nombre || item.label,
                                    prioridad: extraerPrioridad(item, mapa[parentKey].prioridad),
                                    tiempo: extraerTiempo(item, mapa[parentKey].tiempo)
                                });
                            }
                        }
                    }
                });

                setMapaCategorias(mapa);

                // Dejar seleccionada la primera categoría y subcategoría de la lista
                const primeraCatKey = Object.keys(mapa)[0];
                if (primeraCatKey) {
                    const primeraSubKey = mapa[primeraCatKey].subcategorias[0]?.value || '';
                    setDatosTicket(prev => ({
                        ...prev,
                        categoria: primeraCatKey,
                        subcategoria: primeraSubKey
                    }));
                }
            })
            .catch(err => console.error("Error al cargar categorías desde el servicio:", err))
            .finally(() => {
                if (isMounted) setCargandoCategorias(false);
            });

        return () => { isMounted = false; };
    }, []);

    // Manejar el cambio de los inputs del formulario
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'categoria') {
            const catSelec = mapaCategorias[value];
            const primeraSub = catSelec?.subcategorias[0]?.value || '';
            setDatosTicket({
                ...datosTicket,
                categoria: value,
                subcategoria: primeraSub
            });
        } else {
            setDatosTicket({
                ...datosTicket,
                [name]: value
            });
        }
    };

    const opcionesCategorias = Object.keys(mapaCategorias).map((key) => ({
        value: key,
        label: mapaCategorias[key].label
    }));

    const categoriaActual = mapaCategorias[datosTicket.categoria] || Object.values(mapaCategorias)[0] || {};
    const opcionesSubcategorias = categoriaActual?.subcategorias || [];
    
    const subcategoriaActual = opcionesSubcategorias.find((s) => String(s.value) === String(datosTicket.subcategoria)) || opcionesSubcategorias[0] || {
        prioridad: categoriaActual?.prioridad || 'Alta',
        tiempo: categoriaActual?.tiempo || '8 h hábiles',
        label: ''
    };

    // Validar si ya hay un ticket abierto en el mismo ambiente para mostrar alerta de duplicado
    useEffect(() => {
        if (!datosTicket.ambiente || !datosTicket.ambiente.trim()) {
            setDuplicado(null);
            return;
        }

        const dbString = localStorage.getItem('mesa-ayuda:db');
        const db = dbString ? JSON.parse(dbString) : { tickets: [] };
        const ticketsExistentes = db.tickets || [];

        const ticketExistente = ticketsExistentes.find(
            (t) =>
                t &&
                (t.ambiente || '').toLowerCase().trim() === datosTicket.ambiente.toLowerCase().trim() &&
                (t.categoria === datosTicket.categoria || t.categoriaNombre === categoriaActual?.label) &&
                t.estado === 'Abierto'
        );

        if (ticketExistente) {
            setDuplicado({
                id: ticketExistente.id,
                codigo: ticketExistente.codigo || 'TCK-S/C',
                tiempo: '18 minutos'
            });
        } else {
            setDuplicado(null);
        }
    }, [datosTicket.ambiente, datosTicket.categoria, categoriaActual?.label]);

    // Guardar el nuevo ticket en el local storage
    const handleSubmit = (e) => {
        e.preventDefault();

        if (!datosTicket.ambiente.trim() || !datosTicket.asunto.trim() || !datosTicket.descripcion.trim()) {
            alert('Por favor completa todos los campos obligatorios.');
            return;
        }

        const sesion = sessionRepository.read();

        const ahora = new Date();
        ahora.setHours(ahora.getHours() + 2);
        const hh = String(ahora.getHours()).padStart(2, '0');
        const mm = String(ahora.getMinutes()).padStart(2, '0');
        const dd = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const yyyy = ahora.getFullYear();

        const tiempoEstimadoTexto = `${subcategoriaActual.tiempo} · antes de las ${hh}:${mm} del ${dd}/${mes}/${yyyy}`;

        const nuevoTicket = {
            id: `tck-${Date.now()}`,
            codigo: `TCK-2026-${String(Math.floor(100 + Math.random() * 90000)).padStart(5, '0')}`,
            ...datosTicket,
            categoriaNombre: categoriaActual.label,
            subcategoriaNombre: subcategoriaActual.label,
            prioridad: subcategoriaActual.prioridad,
            tiempoEsperado: tiempoEstimadoTexto,
            estado: 'Abierto',
            fechaCreacion: new Date().toLocaleString(),
            usuarioId: sesion?.usuarioId || "usr-001"
        };

        const dbString = localStorage.getItem('mesa-ayuda:db');
        if (dbString) {
            const db = JSON.parse(dbString);
            db.tickets = [nuevoTicket, ...(db.tickets || [])];
            localStorage.setItem('mesa-ayuda:db', JSON.stringify(db));
        }

        setTicketCreado(nuevoTicket);
    };

    if (ticketCreado) {
        return <TicketConfirmation ticket={ticketCreado} />;
    }

    if (cargandoCategorias) {
        return (
            <div className="new-ticket-container" style={{ padding: '40px', textAlign: 'center' }}>
                <p>Cargando categorías...</p>
            </div>
        );
    }

    return (
        <div className="new-ticket-container">
            <PageHeader
                title="Registrar un ticket"
                description="Indica qué falla y dónde. La prioridad se sugiere según la categoría y el supervisor puede ajustarla."
            />

            {duplicado && (
                <Alert
                    variant="warning"
                    actions={
                        <button 
                            type="button" 
                            className="btn-alerta-duplicado"
                            onClick={() => navigate(`/usuario/tickets/${duplicado.id || duplicado.codigo}`)}
                        >
                            Ver ese ticket
                        </button>
                    }
                >
                    Ya existe un ticket abierto para <strong>{datosTicket.ambiente}</strong> en {categoriaActual?.label}: 
                    <strong>{duplicado.codigo}</strong>, registrado hace {duplicado.tiempo}. Revísalo antes de crear otro.
                </Alert>
            )}

            <div className="new-ticket-grid">
                <div className="main-form-card">
                    <form className="ticket-form" onSubmit={handleSubmit}>

                        <div className="form-row">
                            <div className="input-group">
                                <label>CATEGORÍA</label>
                                <SelectInput
                                    name="categoria"
                                    value={datosTicket.categoria}
                                    onChange={handleChange}
                                    options={opcionesCategorias}
                                />
                            </div>

                            <div className="input-group">
                                <label>SUBCATEGORÍA</label>
                                <SelectInput
                                    name="subcategoria"
                                    value={datosTicket.subcategoria}
                                    onChange={handleChange}
                                    options={opcionesSubcategorias}
                                />
                                <span className="field-help-text">Depende de la categoría elegida.</span>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="input-group">
                                <label>AMBIENTE</label>
                                <div className="search-input-wrapper">
                                    <TextInput
                                        name="ambiente"
                                        value={datosTicket.ambiente}
                                        onChange={handleChange}
                                        placeholder="Ej: A-201"
                                    />
                                    <Button type="button" variant="secondary">Buscar</Button>
                                </div>
                                <span className="field-help-text">Aula · Pabellón A - piso 2</span>
                            </div>

                            <div className="input-group">
                                <label>PRIORIDAD SUGERIDA</label>
                                <div className="priority-badge-box">
                                    <span className={`priority-tag ${normalizarClaseCSS(subcategoriaActual.prioridad)}`}>
                                        {subcategoriaActual.prioridad}
                                    </span>
                                    <span className="priority-label-text">Sugerida por la subcategoría</span>
                                </div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>ASUNTO</label>
                            <TextInput
                                name="asunto"
                                value={datosTicket.asunto}
                                onChange={handleChange}
                                placeholder="Resumen breve del problema"
                            />
                        </div>

                        <div className="input-group">
                            <label>DESCRIPCIÓN</label>
                            <textarea
                                name="descripcion"
                                className="text-area-input"
                                value={datosTicket.descripcion}
                                onChange={handleChange}
                                rows={4}
                                maxLength={600}
                                placeholder="El proyector enciende el foco pero la imagen no llega a la pantalla..."
                            />
                            <div className="field-help-row">
                                <span>Indica qué probaste y desde cuándo ocurre.</span>
                                <span>{datosTicket.descripcion.length} / 600</span>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>EVIDENCIA (OPCIONAL)</label>
                            <div className="file-dropzone">
                                <span>Arrastra una foto o pulsa para elegir · JPG o PNG hasta 5 MB</span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <Button type="submit" variant="primary">Registrar ticket</Button>
                            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
                        </div>

                    </form>
                </div>

                <aside className="info-sidebar">
                    <div className="info-card">
                        <h3>Qué conviene incluir</h3>
                        <ul className="info-list">
                            <li>El código del ambiente tal como aparece en la puerta.</li>
                            <li>Desde cuándo ocurre la falla y si es intermitente.</li>
                            <li>Qué ya intentaste (cambiar cable, reiniciar equipo).</li>
                            <li>Si hay clase o evento en las próximas horas.</li>
                            <li>Un teléfono de contacto si hay que coordinar el acceso.</li>
                        </ul>
                    </div>

                    <div className="info-card time-card">
                        <h4>Tiempo esperado para esta categoría</h4>
                        <p>
                            Prioridad {subcategoriaActual.prioridad?.toLowerCase()}: atención dentro de <strong>{subcategoriaActual.tiempo}</strong> desde el registro.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
};