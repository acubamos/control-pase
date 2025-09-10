export interface QRData {
  nombre: string
  apellidos: string
  ci: string
}

export function parseQRData(qrText: string): QRData | null {
  try {
    // Formato esperado: N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049
    const parts = qrText.split(":")

    if (parts.length < 4) {
      return null
    }

    // Extraer nombre (después de N:)
    const nombrePart = parts[1]

    // Extraer apellidos (después de A: y antes de CI:)
    const apellidosPart = parts[2].replace("CI", "")

    // Extraer CI (último número)
    const ciPart = parts[3]

    if (!nombrePart || !apellidosPart || !ciPart) {
      return null
    }

    return {
      nombre: nombrePart.trim(),
      apellidos: apellidosPart.trim(),
      ci: ciPart.trim(),
    }
  } catch (error) {
    console.error("Error parsing QR data:", error)
    return null
  }
}
