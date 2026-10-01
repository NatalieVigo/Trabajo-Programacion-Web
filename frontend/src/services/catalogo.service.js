import {
  ambientesRepository,
  categoriasRepository,
  unidadesRepository,
  vinculosRepository,
} from '../repositories/catalogo.repository.js'
import { simulateRequest } from './request.js'

const byId = (a, b) => a.id.localeCompare(b.id)
const byCodigo = (a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })

export function listarCategorias({ soloActivas = false } = {}) {
  return simulateRequest(() => categoriasRepository.findAll(soloActivas ? { activa: true } : undefined).sort(byId))
}

export function listarAmbientes() {
  return simulateRequest(() => ambientesRepository.findAll().sort(byCodigo))
}

export function listarUnidades() {
  return simulateRequest(() => unidadesRepository.findAll())
}

export function listarVinculos() {
  return simulateRequest(() => vinculosRepository.findAll())
}
