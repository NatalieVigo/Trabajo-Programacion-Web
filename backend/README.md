# Mesa de ayuda de servicios del campus — Backend

API REST de la entrega 2, hecha con Node.js, Express y MySQL (XAMPP).

## Cómo probarlo

Se necesita tener Node.js y XAMPP instalados.

1. Abre el panel de XAMPP y enciende **MySQL**.
2. Copia `.env.example` como `.env` y completa `DB_USER` y `DB_PASSWORD` con un usuario de tu MySQL (en XAMPP recién instalado es `root` sin contraseña). El usuario necesita permiso para crear las bases `mesa_ayuda` y `mesa_ayuda_test`.
3. Instala, crea la base y enciende la API:

```
cd Trabajo-Programacion-Web/backend
npm install
npm run db:reset
npm run dev
```

La API queda en http://localhost:3000/api.

`npm run db:reset` borra la base `mesa_ayuda` y la vuelve a crear con los archivos de `database/esquema` y los datos de `frontend/src/data/seed.json`, el mismo seed de la entrega 1.

Para las pruebas (`npm test`) MySQL debe estar encendido; usan una base aparte, `mesa_ayuda_test`.

## Cuentas de prueba

| Rol        | Correo                          | Contraseña     |
| ---------- | ------------------------------- | -------------- |
| Usuario    | camila.quispe@aloe.ulima.edu.pe | Camila2026     |
| Técnico    | jparedes@ulima.edu.pe           | Tecnico2026    |
| Supervisor | lmendoza@ulima.edu.pe           | Supervisor2026 |
| Bloqueada  | diego.salas@aloe.ulima.edu.pe   | Usuario2026    |

Las demás cuentas del seed usan `Demo2026`. Invitaciones de prueba: `INV-TEC-2026-DEMO`, `INV-SUP-2026-DEMO` y `INV-TEC-2026-VENCIDA`.

## Organización

```
database/esquema/   tablas, un archivo por historia
database/semilla/   carga del seed, un archivo por historia
src/routes/         rutas de la API
src/controllers/    leen la petición y responden; no tocan la base
src/services/       reglas de negocio y validaciones
src/repositories/   consultas SQL
src/middlewares/    sesión, roles y errores
test/               pruebas con Vitest y Supertest
```

Las rutas con sesión piden el encabezado `Authorization: Bearer <token>`. Los errores responden con el código HTTP que corresponde y un JSON `{ code, message, fieldErrors, details }`.

## HU-1 Cuenta y acceso

| Método | Ruta                                       | Sesión     | Mockup |
| ------ | ------------------------------------------ | ---------- | ------ |
| POST   | /api/auth/login                            | —          | p04, p05 |
| POST   | /api/auth/logout                           | Cualquiera | p10    |
| POST   | /api/auth/registro                         | —          | p06    |
| GET    | /api/auth/registro/opciones                | —          | p06    |
| GET    | /api/auth/correo-disponible?correo=        | —          | p06    |
| POST   | /api/auth/recuperar-contrasena             | —          | p08    |
| GET    | /api/auth/restablecer-contrasena/:token    | —          | p09    |
| POST   | /api/auth/restablecer-contrasena/:token    | —          | p09    |
| GET    | /api/invitaciones/:token                   | —          | p07    |
| GET    | /api/invitaciones/:token/opciones          | —          | p07    |
| POST   | /api/invitaciones/:token/aceptar           | —          | p07    |
| POST   | /api/invitaciones/:token/rechazar          | —          | p07    |
| POST   | /api/invitaciones                          | Supervisor | p16 (botón «Invitar técnico» de HU-2) |
| GET    | /api/cuenta                                | Cualquiera | p10    |
| PATCH  | /api/cuenta                                | Cualquiera | p10    |
| GET    | /api/cuenta/opciones                       | Cualquiera | p10    |
| GET    | /api/cuenta/resumen                        | Cualquiera | p10    |
| GET    | /api/cuenta/contadores                     | Cualquiera | p05, p10, p11 |
| PUT    | /api/cuenta/contrasena                     | Cualquiera | p10    |
| POST   | /api/solicitudes-acceso                    | Cualquiera | p11    |

Las tablas `categorias`, `ambientes` (HU-2), `tickets` (HU-3) y `encuestas` (HU-6) tienen por ahora solo las columnas que lee HU-1; cada responsable completa las suyas.
