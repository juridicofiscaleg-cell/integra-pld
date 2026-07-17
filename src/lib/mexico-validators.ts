/** Validación básica RFC/CURP para México (formato, no consulta SAT). */

export function validateRfc(rfc: string, clientType: 'persona_fisica' | 'persona_moral'): string | null {
  const v = rfc.trim().toUpperCase()
  if (!v) return null
  if (clientType === 'persona_fisica') {
    if (!/^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/.test(v)) return 'RFC persona física inválido (13 caracteres)'
  } else {
    if (!/^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/.test(v)) return 'RFC persona moral inválido (12 caracteres)'
  }
  return null
}

export function validateCurp(curp: string): string | null {
  const v = curp.trim().toUpperCase()
  if (!v) return null
  if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v)) return 'CURP inválida (18 caracteres)'
  return null
}
