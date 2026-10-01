import { describe, expect, it } from 'vitest'
import {
  VALIDATION_MESSAGES as M,
  hasErrors,
  normalizeCorreo,
  normalizeNombre,
  normalizeTelefono,
  validateAceptaTerminos,
  validateActivacion,
  validateAmbienteHabitual,
  validateApellidos,
  validateCambioPassword,
  validateConfirmacion,
  validateCorreo,
  validateEspecialidades,
  validateInvitacion,
  validateLogin,
  validateNombres,
  validatePassword,
  validatePerfil,
  validateRecuperacion,
  validateRegistro,
  validateRestablecimiento,
  validateRolInvitacion,
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
      especialidadesNoDisponible: 'Una de las categorías elegidas ya no está disponible. Actualiza la página y elige otra.',
      rolInvitacionRequired: 'Selecciona el rol: técnico o supervisor.',
      passwordActualIncorrect: 'La contraseña actual no es correcta.',
      passwordSameAsActual: 'La nueva contraseña debe ser distinta de la actual.',
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
      expect(validateEspecialidades(['cat-01', 'cat-01', 'cat-02', 'cat-02'])).toBeNull()
    })

    it('especialidades: con el catálogo, cada categoría debe estar entre las permitidas', () => {
      const activas = ['cat-01', 'cat-02', 'cat-03']
      const noDisponible = 'Una de las categorías elegidas ya no está disponible. Actualiza la página y elige otra.'

      expect(validateEspecialidades(['cat-01', 'cat-03'], activas)).toBeNull()
      expect(validateEspecialidades(['cat-01', 'cat-06'], activas)).toBe(noDisponible)
      expect(validateEspecialidades(['cat-99'], activas)).toBe(noDisponible)
      // La cantidad se revisa primero: con cero o más de tres categorías el mensaje es el del rango.
      expect(validateEspecialidades([], activas)).toBe('Elige entre una y tres categorías.')
      expect(validateEspecialidades(['cat-01', 'cat-02', 'cat-03', 'cat-06'], activas)).toBe(
        'Elige entre una y tres categorías.',
      )
    })

    it('el rol de una invitación es técnico o supervisor', () => {
      expect(validateRolInvitacion('tecnico')).toBeNull()
      expect(validateRolInvitacion('supervisor')).toBeNull()
      expect(validateRolInvitacion('usuario')).toBe('Selecciona el rol: técnico o supervisor.')
      expect(validateRolInvitacion('')).toBe('Selecciona el rol: técnico o supervisor.')
    })
  })

  describe('validateActivacion (alta por invitación)', () => {
    const activacionValida = {
      telefono: '951 220 874',
      password: 'Rosa2026',
      confirmacion: 'Rosa2026',
      especialidades: ['cat-01', 'cat-02'],
    }

    it('devuelve un objeto vacío si todo es válido', () => {
      expect(validateActivacion(activacionValida)).toEqual({})
    })

    it('devuelve el mensaje de cada campo que completa el invitado', () => {
      expect(validateActivacion({})).toEqual({
        telefono: 'Ingresa un número de contacto.',
        password: 'Ingresa una contraseña.',
        confirmacion: 'Confirma tu contraseña.',
        especialidades: 'Elige entre una y tres categorías.',
      })
    })

    it('con el catálogo exige especialidades activas', () => {
      expect(validateActivacion(activacionValida, { categorias: ['cat-01'] })).toEqual({
        especialidades: 'Una de las categorías elegidas ya no está disponible. Actualiza la página y elige otra.',
      })
    })
  })

  describe('validatePerfil (Mi cuenta)', () => {
    const perfilValido = {
      nombres: 'Camila Alejandra',
      apellidos: 'Quispe Ramos',
      telefono: '987 654 321',
      unidad: 'Ingeniería de Sistemas',
      ambienteHabitualId: 'amb-01',
    }

    it('devuelve un objeto vacío si todo es válido; el ambiente habitual es opcional', () => {
      expect(validatePerfil(perfilValido)).toEqual({})
      expect(validatePerfil({ ...perfilValido, ambienteHabitualId: null })).toEqual({})
      expect(validatePerfil({ ...perfilValido, ambienteHabitualId: '' })).toEqual({})
    })

    it('devuelve el mensaje de cada dato personal inválido', () => {
      expect(validatePerfil({ nombres: 'C4mila', telefono: '812345678' })).toEqual({
        nombres: 'Usa solo letras y espacios.',
        apellidos: 'Ingresa tus apellidos.',
        telefono: 'Ingresa un celular de 9 dígitos que empiece con 9.',
        unidad: 'Selecciona tu unidad o carrera.',
      })
    })

    it('con el catálogo exige una unidad y un ambiente que existan', () => {
      const catalogos = { unidades: ['Derecho'], ambientes: ['amb-02'] }

      expect(validatePerfil(perfilValido, catalogos)).toEqual({
        unidad: 'Selecciona tu unidad o carrera.',
        ambienteHabitualId: 'Selecciona un ambiente de la lista.',
      })
      expect(validateAmbienteHabitual(null, catalogos.ambientes)).toBeNull()
      expect(validateAmbienteHabitual('amb-02', catalogos.ambientes)).toBeNull()
    })
  })

  describe('validateInvitacion', () => {
    it('valida los datos con los que el supervisor invita, con mensajes sobre la persona invitada', () => {
      expect(
        validateInvitacion({
          nombres: 'Rosa Elena',
          apellidos: 'Huamán Torres',
          correo: 'rhuaman@ulima.edu.pe',
          rol: 'tecnico',
          telefono: '951220874',
        }),
      ).toEqual({})
      expect(validateInvitacion({ correo: 'rosa@gmail.com', rol: 'usuario' })).toEqual({
        nombres: 'Ingresa los nombres de la persona invitada.',
        apellidos: 'Ingresa los apellidos de la persona invitada.',
        correo: 'Usa un correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
        rol: 'Selecciona el rol: técnico o supervisor.',
        telefono: 'Ingresa un número de contacto.',
      })
      expect(validateInvitacion({}).correo).toBe('Ingresa el correo institucional de la persona invitada.')
    })
  })

  describe('validateLogin', () => {
    it('exige el correo institucional y la contraseña', () => {
      expect(validateLogin({ correo: 'camila.quispe@aloe.ulima.edu.pe', password: 'Camila2026' })).toEqual({})
      expect(validateLogin({})).toEqual({
        correo: 'Ingresa tu correo institucional.',
        password: 'Ingresa una contraseña.',
      })
      expect(validateLogin({ correo: 'camila@gmail.com', password: 'x' })).toEqual({
        correo: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
      })
    })

    it('no exige las reglas de una contraseña nueva', () => {
      expect(validateLogin({ correo: 'jparedes@ulima.edu.pe', password: 'corta' })).toEqual({})
    })
  })

  describe('validateRecuperacion y validateRestablecimiento (recuperar la contraseña)', () => {
    it('el pedido del enlace exige un correo institucional', () => {
      expect(validateRecuperacion({ correo: 'camila.quispe@aloe.ulima.edu.pe' })).toEqual({})
      expect(validateRecuperacion({})).toEqual({ correo: 'Ingresa tu correo institucional.' })
      expect(validateRecuperacion({ correo: 'camila@gmail.com' })).toEqual({
        correo: 'Usa tu correo institucional (@ulima.edu.pe o @aloe.ulima.edu.pe).',
      })
    })

    it('la contraseña nueva cumple la regla y se confirma', () => {
      expect(validateRestablecimiento({ password: 'Campus2027', confirmacion: 'Campus2027' })).toEqual({})
      expect(validateRestablecimiento({})).toEqual({
        password: 'Ingresa una contraseña.',
        confirmacion: 'Confirma tu contraseña.',
      })
      expect(validateRestablecimiento({ password: 'campus', confirmacion: 'Campus2027' })).toEqual({
        password: 'Mínimo 8 caracteres, con una mayúscula y un número.',
        confirmacion: 'Las contraseñas no coinciden.',
      })
    })
  })

  describe('validateCambioPassword (Mi cuenta)', () => {
    const cambioValido = { actual: 'Camila2026', nueva: 'Campus2027', confirmacion: 'Campus2027' }

    it('devuelve un objeto vacío si todo es válido', () => {
      expect(validateCambioPassword(cambioValido)).toEqual({})
    })

    it('exige la contraseña actual, una nueva que cumpla la regla y su confirmación', () => {
      expect(validateCambioPassword({})).toEqual({
        actual: 'Ingresa tu contraseña actual.',
        nueva: 'Ingresa una contraseña.',
        confirmacion: 'Confirma tu contraseña.',
      })
      expect(validateCambioPassword({ actual: 'x', nueva: 'corta', confirmacion: 'otra' })).toEqual({
        nueva: 'Mínimo 8 caracteres, con una mayúscula y un número.',
        confirmacion: 'Las contraseñas no coinciden.',
      })
    })

    it('la nueva contraseña debe ser distinta de la actual', () => {
      expect(validateCambioPassword({ ...cambioValido, nueva: 'Camila2026', confirmacion: 'Camila2026' })).toEqual({
        nueva: 'La nueva contraseña debe ser distinta de la actual.',
      })
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
