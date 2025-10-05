export interface QRData {
  nombre: string
  apellidos: string
  ci: string
}

export function parseQRData(qrText: string): QRData | null {
  try {
    const cleanText = qrText.replace(/\r/g, "").trim()
    
    // Extraer los campos usando índices después de los prefijos
    const nombreIndex = cleanText.indexOf('N:')
    const apellidosIndex = cleanText.indexOf('A:')
    const ciIndex = cleanText.indexOf('CI:')

    if (nombreIndex === -1 || apellidosIndex === -1 || ciIndex === -1) {
      return null
    }

    // Extraer cada campo tomando el texto desde después del prefijo hasta antes del siguiente prefijo
    const nombre = cleanText.substring(nombreIndex + 2, apellidosIndex).trim()
    const apellidos = cleanText.substring(apellidosIndex + 2, ciIndex).trim()
    const ci = cleanText.substring(ciIndex + 3).trim()

    if (!nombre || !apellidos || !ci) {
      return null
    }

    return {
      nombre,
      apellidos,
      ci,
    }
  } catch (error) {
    console.error("Error parsing QR data:", error)
    return null
  }
}