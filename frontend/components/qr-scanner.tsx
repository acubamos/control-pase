"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"

interface QRData {
  nombre: string
  apellido: string
  cedula: string
}

interface QRScannerProps {
  onScan: (data: QRData) => void
  isOpen: boolean
  onClose: () => void
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState("Iniciando cámara...")
  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const parseQRContent = (decodedText: string): QRData | null => {
    console.log("Datos QR crudos:", decodedText)
    
    // Limpiar y normalizar el texto
    const cleanText = decodedText.trim().replace(/\s+/g, ' ')
    
    // Patrones de detección para diferentes formatos
    const patterns = [
      // Formato: N:Nombre A:Apellido CI:Cédula
      /N:([^A]+)A:([^CI]+)CI:(\d+)/i,
      // Formato: N:Nombre\nA:Apellido\nCI:Cédula
      /N:([^\n]+)\s*A:([^\n]+)\s*CI:(\d+)/i,
      // Formato: NOMBRE:Nombre APELLIDO:Apellido CEDULA:Cédula
      /NOMBRE:([^\n]+)\s*APELLIDO:([^\n]+)\s*CEDULA:(\d+)/i,
      // Formato: Nombre: Nombre Apellido: Apellido Cédula: Cédula
      /Nombre:\s*([^\n]+)\s*Apellido:\s*([^\n]+)\s*Cédula:\s*(\d+)/i,
      // Formato simple con saltos de línea
      /([^\n]+)\n([^\n]+)\n(\d+)/,
      // Formato sin etiquetas (nombre apellido cédula)
      /^([A-ZÁÉÍÓÚÑ\s]+)[\s,]+([A-ZÁÉÍÓÚÑ\s]+)[\s,]+(\d+)$/i,
      // Formato compacto sin espacios
      /^([A-Z]+)([A-Z]+)(\d+)$/i
    ]

    for (const pattern of patterns) {
      const match = cleanText.match(pattern)
      if (match) {
        const nombre = match[1].trim().replace(/\s+/g, ' ')
        const apellido = match[2].trim().replace(/\s+/g, ' ')
        const cedula = match[3].trim()

        console.log("QR parseado exitosamente:", { nombre, apellido, cedula })
        return { nombre, apellido, cedula }
      }
    }

    console.warn("Formato QR no reconocido:", cleanText)
    return null
  }

  const startScanner = async () => {
    if (!scannerContainerRef.current) return

    try {
      setError(null)
      setIsScanning(true)
      setScanStatus("Iniciando cámara...")

      // Importación dinámica para evitar problemas de SSR
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      
      // Configuración optimizada para documentos
      scannerRef.current = new Html5QrcodeScanner(
        "qr-scanner-container",
        {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
          supportedScanTypes: [
            { type: "qr", config: {} }
          ]
        },
        false
      )

      scannerRef.current.render(
        (decodedText: string) => {
          console.log("✅ QR detectado:", decodedText)
          setScanStatus("Procesando QR...")

          // Procesar el QR detectado
          const qrData = parseQRContent(decodedText)
          
          if (qrData) {
            setScanStatus("¡QR válido!")
            
            // Pequeño delay para feedback visual
            setTimeout(() => {
              onScan(qrData)
              stopScanner()
              onClose()
            }, 500)
          } else {
            setScanStatus("Formato no válido")
            console.warn("❌ Formato no reconocido")
            
            // Reanudar escaneo después de 2 segundos
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current)
            }
            scanTimeoutRef.current = setTimeout(() => {
              setScanStatus("Escaneando...")
            }, 2000)
          }
        },
        (errorMessage: string) => {
          // Solo mostrar errores relevantes
          if (!errorMessage.includes("No MultiFormat Readers") && 
              !errorMessage.includes("NotFoundException")) {
            console.log("🔍 Escaneando...")
          }
        }
      )

      setScanStatus("Escaneando...")
      console.log("🚀 Escáner iniciado correctamente")

    } catch (err) {
      console.error("❌ Error al iniciar escáner:", err)
      setError("No se pudo acceder a la cámara. Verifica los permisos.")
      setIsScanning(false)
      setScanStatus("Error")
    }
  }

  const stopScanner = () => {
    // Limpiar timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }

    // Detener el escáner
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().catch((error: any) => {
          console.log("Escáner limpiado")
        })
      } catch (error) {
        console.log("Escáner ya detenido")
      }
      scannerRef.current = null
    }
    
    setIsScanning(false)
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  const handleRetry = () => {
    stopScanner()
    setTimeout(() => {
      startScanner()
    }, 300)
  }

  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(startScanner, 150)
      return () => clearTimeout(timer)
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            Escanear Código QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-red-600 font-medium mb-3">{error}</p>
              <div className="space-y-2">
                <Button onClick={handleRetry} className="w-full">
                  Reintentar
                </Button>
                <Button onClick={handleClose} variant="outline" className="w-full">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div
                id="qr-scanner-container"
                ref={scannerContainerRef}
                className="w-full h-72 bg-black rounded-lg overflow-hidden"
              />
              
              {/* Overlay de guía */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="border-3 border-green-400 border-dashed w-56 h-56 rounded-lg animate-pulse" />
                
                {/* Esquinas decorativas */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400" />
                
                {/* Estado del escaneo */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-green-400 text-sm font-medium bg-black/80 px-3 py-1 rounded-full inline-block">
                    {scanStatus}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botón de cerrar */}
          <div className="flex justify-center pt-2">
            <Button onClick={handleClose} variant="outline" className="px-8">
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>

          {/* Instrucciones */}
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-600 font-medium">
              Enfoca el código QR dentro del marco
            </p>
            <p className="text-xs text-gray-400">
              Asegura buena iluminación y mantén el dispositivo estable
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
