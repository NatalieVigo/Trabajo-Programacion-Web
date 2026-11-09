-- HU-2 Catálogo de servicios. Por ahora solo las columnas que lee HU-1; el responsable de HU-2 completa el resto.

CREATE TABLE categorias (
  id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE ambientes (
  id VARCHAR(10) PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(80) NOT NULL
);
