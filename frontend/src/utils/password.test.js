import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { generateSalt, hashPassword, passwordStrength, verifyPassword } from './password.js'

describe('password', () => {
  it('genera sales aleatorias de 32 caracteres hexadecimales', () => {
    const salt = generateSalt()

    expect(salt).toMatch(/^[0-9a-f]{32}$/)
    expect(generateSalt()).not.toBe(salt)
  })

  it('calcula SHA-256 de sal + contraseña igual que Node crypto', async () => {
    const salt = '00112233445566778899aabbccddeeff'
    const esperado = createHash('sha256').update(`${salt}Clave2026`).digest('hex')

    await expect(hashPassword('Clave2026', salt)).resolves.toBe(esperado)
  })

  it.each([
    ['camila.quispe@aloe.ulima.edu.pe', 'Camila2026'],
    ['jparedes@ulima.edu.pe', 'Tecnico2026'],
    ['lmendoza@ulima.edu.pe', 'Supervisor2026'],
    ['diego.salas@aloe.ulima.edu.pe', 'Usuario2026'],
    ['renzo.salazar@aloe.ulima.edu.pe', 'Demo2026'],
    ['mccahuana@ulima.edu.pe', 'Demo2026'],
    ['achavez@ulima.edu.pe', 'Demo2026'],
    ['mhuaman@ulima.edu.pe', 'Demo2026'],
    ['izegarra@ulima.edu.pe', 'Demo2026'],
    ['snolasco@ulima.edu.pe', 'Demo2026'],
  ])('la contraseña de demostración de %s coincide con el hash del seed', async (correo, password) => {
    const { passwordSalt, passwordHash } = usuariosRepository.findByCorreo(correo)

    await expect(verifyPassword(password, passwordSalt, passwordHash)).resolves.toBe(true)
    await expect(verifyPassword('OtraClave2026', passwordSalt, passwordHash)).resolves.toBe(false)
  })
})

describe('passwordStrength', () => {
  it('sin contraseña no hay nivel', () => {
    expect(passwordStrength('')).toEqual({ score: 0, label: '' })
    expect(passwordStrength(undefined)).toEqual({ score: 0, label: '' })
  })

  it.each(['abc', 'camila2026', 'CAMILAQUISPE', 'Cami202', 'contraseña-larga-sin-numero'])(
    '«%s» es débil porque no cumple la regla mínima',
    (password) => {
      expect(passwordStrength(password)).toEqual({ score: 1, label: 'Débil' })
    },
  )

  it.each(['Camila2026', 'Abcdefg1', 'CAMILA2026!'])('«%s» es media: cumple la regla y nada más', (password) => {
    expect(passwordStrength(password)).toEqual({ score: 2, label: 'Media' })
  })

  it.each(['Camila2026!', 'CamilaQuispe2026', 'Ñandú del 2026'])(
    '«%s» es segura: suma minúsculas y un símbolo o 12 caracteres',
    (password) => {
      expect(passwordStrength(password)).toEqual({ score: 3, label: 'Segura' })
    },
  )

  it('con más de 64 caracteres es débil, como la rechaza el validador', () => {
    expect(passwordStrength(`Camila2026!${'x'.repeat(53)}`)).toEqual({ score: 3, label: 'Segura' })
    expect(passwordStrength(`Camila2026!${'x'.repeat(54)}`)).toEqual({ score: 1, label: 'Débil' })
  })
})
