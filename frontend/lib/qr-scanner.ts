export interface QRData {
  nombre: string
  apellidos: string
  ci: string
}

export function parseQRData(qrText: string): QRData | null {
  try {
    console.log("📝 Texto QR recibido para parsing:", qrText);
    
    const cleanText = qrText.replace(/\r/g, "").trim()
    console.log("🧹 Texto limpio:", cleanText);
    
    // Buscar los índices de los prefijos
    const nombreIndex = cleanText.indexOf('N:')
    const apellidosIndex = cleanText.indexOf('A:')
    const ciIndex = cleanText.indexOf('CI:')
    const fvIndex = cleanText.indexOf('FV:') // 🔥 NUEVO: Buscar FV:

    console.log("🔍 Índices encontrados:", { nombreIndex, apellidosIndex, ciIndex, fvIndex });

    if (nombreIndex === -1 || apellidosIndex === -1 || ciIndex === -1) {
      console.warn("❌ No se encontraron todos los prefijos requeridos");
      return null
    }

    // 🔥 ACTUALIZADO: Extraer campos manejando FV:
    let nombre, apellidos, ci;

    if (fvIndex !== -1) {
      // Si existe FV:, extraer CI hasta FV:
      nombre = cleanText.substring(nombreIndex + 2, apellidosIndex).trim()
      apellidos = cleanText.substring(apellidosIndex + 2, ciIndex).trim()
      ci = cleanText.substring(ciIndex + 3, fvIndex).trim() // 🔥 Hasta FV:
    } else {
      // Si no existe FV:, extraer normalmente
      nombre = cleanText.substring(nombreIndex + 2, apellidosIndex).trim()
      apellidos = cleanText.substring(apellidosIndex + 2, ciIndex).trim()
      ci = cleanText.substring(ciIndex + 3).trim()
    }

    console.log("📋 Datos extraídos:", { nombre, apellidos, ci });

    // Validar que los campos no estén vacíos
    if (!nombre || !apellidos || !ci) {
      console.warn("❌ Campos vacíos detectados");
      return null
    }

    const result = {
      nombre,
      apellidos,
      ci,
    };

    console.log("✅ Datos parseados exitosamente:", result);
    return result;

  } catch (error) {
    console.error("❌ Error parsing QR data:", error)
    return null
  }
}
