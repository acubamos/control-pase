export interface QRData {
  nombre: string
  apellidos: string
  ci: string
}

export function parseQRData(qrText: string): QRData | null {
  try {
    if (!qrText) return null

    // 1. Normalizar texto (quitar saltos y espacios dobles)
    const clean = qrText.replace(/\s+/g, " ").trim()

    // 2. Intentar regex específico de tu formato
    //    Captura N:..., A:..., CI:...
    const regex = /N:(?<nombre>.+?)A:(?<apellidos>.+?)CI:(?<ci>\d{11})/i
    const match = clean.match(regex)

    if (match && match.groups) {
      return {
        nombre: match.groups.nombre.trim(),
        apellidos: match.groups.apellidos.trim(),
        ci: match.groups.ci.trim(),
      }
    }

    // 3. Fallback: dividir por separadores
    const parts = clean.split(/[:;=]/).map((p) => p.trim())
    if (parts.length >= 6) {
      const nombre = parts[1]
      const apellidos = parts[3]
      const ci = parts[5]
      if (nombre && apellidos && ci) {
        return { nombre, apellidos, ci }
      }
    }

    return null
  } catch (error) {
    console.error("Error parsing QR data:", error)
    return null
  }
}
