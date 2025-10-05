export interface QRData {
  nombre: string
  apellidos: string
  ci: string
}

export function parseQRData(qrText: string): QRData | null {
  try {
    const cleanText = qrText.replace(/\r/g, "").trim()
    
    let nombre = ''
    let apellidos = ''
    let ci = ''

    // Intentar dividir por líneas primero
    const lines = cleanText.split('\n')
    
    if (lines.length >= 3) {
      // Formato con saltos de línea
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('N:')) {
          nombre = trimmedLine.substring(2).trim()
        } else if (trimmedLine.startsWith('A:')) {
          apellidos = trimmedLine.substring(2).trim()
        } else if (trimmedLine.startsWith('CI:')) {
          ci = trimmedLine.substring(3).trim()
        }
      }
    } else {
      // Formato sin saltos de línea (todo en una línea)
      const nombreMatch = cleanText.match(/N:([^A]+)A:/)
      const apellidosMatch = cleanText.match(/A:([^C]+)CI:/)
      const ciMatch = cleanText.match(/CI:(.+)$/)
      
      if (nombreMatch) nombre = nombreMatch[1].trim()
      if (apellidosMatch) apellidos = apellidosMatch[1].trim()
      if (ciMatch) ci = ciMatch[1].trim()
    }

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