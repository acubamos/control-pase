export interface QRData {
  nombre: string
  apellidos: string
  ci: string
}

export function parseQRData(qrText: string): QRData | null {
  try {
    console.log("Parsing QR text:", qrText) // Debug
    
    // Normalizar y limpiar el texto
    const cleanText = qrText.replace(/\r/g, "").trim()
    
    // Múltiples patrones posibles
    const patterns = [
      // Patrón original
      { 
        nombre: /N:([^\n]+)/, 
        apellidos: /A:([^\n]+)/, 
        ci: /CI:([^\n]+)/ 
      },
      // Patrón con diferentes separadores
      { 
        nombre: /Nombre:?([^\n]+)/i, 
        apellidos: /Apellidos:?([^\n]+)/i, 
        ci: /(?:CI|Cédula):?([^\n]+)/i 
      },
      // Patrón con JSON
      { 
        nombre: /"nombre":\s*"([^"]+)"/, 
        apellidos: /"apellidos":\s*"([^"]+)"/, 
        ci: /"ci":\s*"([^"]+)"/
      }
    ]

    for (const pattern of patterns) {
      const nombreMatch = cleanText.match(pattern.nombre)
      const apellidosMatch = cleanText.match(pattern.apellidos)
      const ciMatch = cleanText.match(pattern.ci)

      if (nombreMatch && apellidosMatch && ciMatch) {
        return {
          nombre: nombreMatch[1].trim(),
          apellidos: apellidosMatch[1].trim(),
          ci: ciMatch[1].trim(),
        }
      }
    }

    console.warn("No se pudo parsear el QR con ningún patrón")
    return null
  } catch (error) {
    console.error("Error parsing QR data:", error)
    return null
  }
}
