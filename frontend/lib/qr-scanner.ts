export interface QRData {
  nombre: string
  apellidos: string
  ci: string
}

export function parseQRData(qrText: string): QRData | null {
  try {
    // Normalizar saltos de línea y espacios extra
    const cleanText = qrText.replace(/\r/g, "").trim()

    const nombreMatch = cleanText.match(/N:([^\n]+)/)
    const apellidosMatch = cleanText.match(/A:([^\n]+)/)
    const ciMatch = cleanText.match(/CI:([^\n]+)/)

    if (!nombreMatch || !apellidosMatch || !ciMatch) {
      return null
    }

    return {
      nombre: nombreMatch[1].trim(),
      apellidos: apellidosMatch[1].trim(),
      ci: ciMatch[1].trim(),
    }
  } catch (error) {
    console.error("Error parsing QR data:", error)
    return null
  }
}
