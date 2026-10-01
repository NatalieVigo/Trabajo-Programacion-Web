import { describe, expect, it } from 'vitest'
import {
  VALIDATION_MESSAGES as M,
  hasErrors,
  normalizeCorreo,
  normalizeNombre,
  normalizeTelefono,
  validateAceptaTerminos,
  validateApellidos,
  validateConfirmacion,
  validateCorreo,
  validateEspecialidades,
  validateNombres,
  validatePassword,
  validateRegistro,
  validateTelefono,
  validateUnidad,
  validateVinculo,
} from './validators.js'

const registroValido = {
  nombres: 'Camila Alejandra',
  apellidos: 'Quispe Ramos',
  correo: 'camila.quispe@aloe.ulima.edu.pe',
  telefono: '987 654 321',
  password: 'Camila2026',
  confirmacion: 'Camila2026',
  unidad: 'Ingeniería de Sistemas',
  vinculo: 'Estudiante',
  aceptaTerminos: true,
}

describe('validators', () => {
  it('usa los mensajes exactos de la SPEC', () => {
    expect(M).toMatchObject({
      nombresRequired: 'Ingresa tus nombres.',
      apellidosRequired: 'Ingresa tus apellidos.',
      nameChars: 'Usa solo letras y espacios.',
      correoRequired: 'Ingresa tu correo institucional.',
      correoInstitucional: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
      correoTaken: 'Ya existe una cuenta con este correo.',
      correoAvailable: 'Correo válido y disponible.',
      telefonoRequired: 'Ingresa un número de contacto.',
      telefonoFormat: 'Ingresa un celular de 9 dígitos que empiece con 9.',
      passwordRequired: 'Ingresa una contraseña.',
      passwordRule: 'Mínimo 8 caracteres, con una mayúscula y un número.',
      confirmacionMismatch: 'Las contraseñas no coinciden.',
      unidadRequired: 'Selecciona tu unidad o carrera.',
      vinculoRequired: 'Selecciona tu vínculo con la universidad.',
      terminosRequired: 'Debes aceptar los términos para continuar.',
      especialidadesRange: 'Elige entre una y tres categorías.',
    })
  })

  describe('nombres y apellidos', () => {
    it('son obligatorios', () => {
      expect(validateNombres('')).toBe('Ingresa tus nombres.')
      expect(validateNombres('   ')).toBe('Ingresa tus nombres.')
      expect(validateNombres(undefined)).toBe('Ingresa tus nombres.')
      expect(validateApellidos('')).toBe('Ingresa tus apellidos.')
    })

    it.each(['Camila Alejandra', 'María José', 'Ñahui', "O'Connor", 'D’Angelo', 'Ruiz-Tagle', 'Lu', '  Julio   César '])(
      'acepta «%s»',
      (nombre) => {
        expect(validateNombres(nombre)).toBeNull()
        expect(validateApellidos(nombre)).toBeNull()
      },
    )

    it.each(['Camila2', 'Ana_María', 'José.', '--', "'Ana", 'Ana-'])('rechaza «%s» por sus caracteres', (nombre) => {
      expect(validateNombres(nombre)).toBe('Usa solo letras y espacios.')
    })

    it('exige entre 2 y 60 caracteres', () => {
      expect(validateNombres('A')).toBe('Usa entre 2 y 60 caracteres.')
      expect(validateApellidos('a'.repeat(61))).toBe('Usa entre 2 y 60 caracteres.')
      expect(validateApellidos('a'.repeat(60))).toBeNull()
    })
  })

  describe('correo institucional', () => {
    it('es obligatorio', () => {
      expect(validateCorreo('')).toBe('Ingresa tu correo institucional.')
      expect(validateCorreo('  ')).toBe('Ingresa tu correo institucional.')
    })

    it.each(['camila.quispe@aloe.ulima.edu.pe', 'jparedes@ulima.edu.pe', ' LMendoza@ULIMA.edu.pe ', 'a_b+c%d-e@ulima.edu.pe'])(
      'acepta «%s»',
      (correo) => {
        expect(validateCorreo(correo)).toBeNull()
      },
    )

    it.each(['camila@gmail.com', 'camila@ulima.edu', 'camila@otro.ulima.edu.pe', 'camila quispe@ulima.edu.pe', 'ulima.edu.pe'])(
      'rechaza «%s»',
      (correo) => {
        expect(validateCorreo(correo)).toBe('Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).')
      },
    )
  })

  describe('teléfono', () => {
    it('es obligatorio', () => {
      expect(validateTelefono('')).toBe('Ingresa un número de contacto.')
      expect(validateTelefono('   ')).toBe('Ingresa un número de contacto.')
    })

    it('acepta un celular de 9 dígitos que empieza con 9, con o sin espacios', () => {
      expect(validateTelefono('987654321')).toBeNull()
      expect(validateTelefono('987 654 321')).toBeNull()
    })

    it.each(['87654321', '9876543210', '887654321', '98765432a', '+51987654321', '987-654-321'])('rechaza «%s»', (telefono) => {
      expect(validateTelefono(telefono)).toBe('Ingresa un celular de 9 dígitos que empiece con 9.')
    })
  })

  describe('contraseña', () => {
    it('es obligatoria', () => {
      expect(validatePassword('')).toBe('Ingresa una contraseña.')
    })

    it('exige 8 caracteres o más, con una mayúscula y un número', () => {
      expect(validatePassword('Camila2026')).toBeNull()
      expect(validatePassword('Ñandú2026')).toBeNull()
      expect(validatePassword('Cami202')).toBe('Mínimo 8 caracteres, con una mayúscula y un número.')
      expect(validatePassword('camila2026')).toBe('Mínimo 8 caracteres, con una mayúscula y un número.')
      expect(validatePassword('CamilaQuispe')).toBe('Mínimo 8 caracteres, con una mayúscula y un número.')
    })

    it('admite como máximo 64 caracteres', () => {
      expect(validatePassword(`Ab1${'x'.repeat(61)}`)).toBeNull()
      expect(validatePassword(`Ab1${'x'.repeat(62)}`)).toBe('Usa como máximo 64 caracteres.')
    })

    it('la confirmación es obligatoria y debe coincidir', () => {
      expect(validateConfirmacion('', 'Camila2026')).toBe('Confirma tu contraseña.')
      expect(validateConfirmacion('Camila2025', 'Camila2026')).toBe('Las contraseñas no coinciden.')
      expect(validateConfirmacion('Camila2026', 'Camila2026')).toBeNull()
    })
  })

  describe('unidad, vínculo, términos y especialidades', () => {
    it('unidad y vínculo son obligatorios', () => {
      expect(validateUnidad('')).toBe('Selecciona tu unidad o carrera.')
      expect(validateVinculo(undefined)).toBe('Selecciona tu vínculo con la universidad.')
      expect(validateUnidad('Derecho')).toBeNull()
      expect(validateVinculo('Docente')).toBeNull()
    })

    it('con el catálogo, exigen uno de sus valores', () => {
      expect(validateUnidad('Medicina', ['Derecho', 'Economía'])).toBe('Selecciona tu unidad o carrera.')
      expect(validateUnidad('Derecho', ['Derecho', 'Economía'])).toBeNull()
      expect(validateVinculo('Visitante', ['Estudiante', 'Docente'])).toBe('Selecciona tu vínculo con la universidad.')
    })

    it('hay que aceptar los términos', () => {
      expect(validateAceptaTerminos(false)).toBe('Debes aceptar los términos para continuar.')
      expect(validateAceptaTerminos('true')).toBe('Debes aceptar los términos para continuar.')
      expect(validateAceptaTerminos(true)).toBeNull()
    })

    it('especialidades: entre una y tres categorías distintas', () => {
      expect(validateEspecialidades([])).toBe('Elige entre una y tres categorías.')
      expect(validateEspecialidades(undefined)).toBe('Elige entre una y tres categorías.')
      expect(validateEspecialidades(['cat-01', 'cat-02', 'cat-03', 'cat-04'])).toBe('Elige entre una y tres categorías.')
      expect(validateEspecialidades(['cat-01'])).toBeNull()
      expect(validateEspecialidades(['cat-01', 'cat-02', 'cat-03'])).toBeNull()
    })
  })

  describe('validateRegistro', () => {
    it('devuelve un objeto vacío si todo es válido', () => {
      expect(validateRegistro(registroValido)).toEqual({})
      expect(hasErrors(validateRegistro(registroValido))).toBe(false)
    })

    it('devuelve el mensaje de cada campo inválido', () => {
      expect(validateRegistro({ aceptaTerminos: false })).toEqual({
        nombres: 'Ingresa tus nombres.',
        apellidos: 'Ingresa tus apellidos.',
        correo: 'Ingresa tu correo institucional.',
        telefono: 'Ingresa un número de contacto.',
        password: 'Ingresa una contraseña.',
        confirmacion: 'Confirma tu contraseña.',
        unidad: 'Selecciona tu unidad o carrera.',
        vinculo: 'Selecciona tu vínculo con la universidad.',
        aceptaTerminos: 'Debes aceptar los términos para continuar.',
      })
    })

    it('solo incluye los campos con error', () => {
      const errors = validateRegistro({ ...registroValido, correo: 'camila@gmail.com', confirmacion: 'Otra2026' })

      expect(errors).toEqual({
        correo: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
        confirmacion: 'Las contraseñas no coinciden.',
      })
      expect(hasErrors(errors)).toBe(true)
    })

    it('con el catálogo rechaza unidades y vínculos que no existen', () => {
      const catalogos = { unidades: ['Derecho'], vinculos: ['Docente'] }

      expect(validateRegistro(registroValido, catalogos)).toEqual({
        unidad: 'Selecciona tu unidad o carrera.',
        vinculo: 'Selecciona tu vínculo con la universidad.',
      })
    })
  })

  it('normaliza nombres, correo y teléfono', () => {
    expect(normalizeNombre('  María   José ')).toBe('María José')
    expect(normalizeCorreo(' Camila.Quispe@ALOE.ulima.edu.pe ')).toBe('camila.quispe@aloe.ulima.edu.pe')
    expect(normalizeTelefono(' 987 654 321 ')).toBe('987654321')
    expect(normalizeTelefono(null)).toBe('')
  })
})
