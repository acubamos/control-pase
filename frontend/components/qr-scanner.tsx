"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X, RotateCw } from "lucide-react"

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
  const [scanStatus, setScanStatus] = useState("Preparando cámara...")
  const [isCameraReady, setIsCameraReady] = useState(false)
  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const parseQRContent = (decodedText: string): QRData | null => {
    console.log("Datos QR crudos:", decodedText)
    
    const cleanText = decodedText.trim().replace(/\s+/g, ' ')
    
    const patterns = [
      /N:([^A]+)A:([^CI]+)CI:(\d+)/i,
      /N:([^\n]+)\s*A:([^\n]+)\s*CI:(\d+)/i,
      /NOMBRE:([^\n]+)\s*APELLIDO:([^\n]+)\s*CEDULA:(\d+)/i,
      /Nombre:\s*([^\n]+)\s*Apellido:\s*([^\n]+)\s*Cédula:\s*(\d+)/i,
      /([^\n]+)\n([^\n]+)\n(\d+)/,
      /^([A-ZÁÉÍÓÚÑ\s]+)[\s,]+([A-ZÁÉÍÓÚÑ\s]+)[\s,]+(\d+)$/i,
      /^([A-Z]+)([A-Z]+)(\d+)$/i
    ]

    for (const pattern of patterns) {
      const match = cleanText.match(pattern)
      if (match) {
        return {
          nombre: match[1].trim().replace(/\s+/g, ' '),
          apellido: match[2].trim().replace(/\s+/g, ' '),
          cedula: match[3].trim()
        }
      }
    }

    return null
  }

  const initializeScanner = async () => {
    if (!scannerContainerRef.current || !isOpen) {
      return
    }

    try {
      setError(null)
      setIsScanning(true)
      setScanStatus("Iniciando cámara...")
      setIsCameraReady(false)

      // Limpiar cualquier scanner previo
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear()
        } catch (e) {
          console.log("Limpiando scanner previo")
        }
        scannerRef.current = null
      }

      // Esperar a que el DOM esté completamente renderizado
      await new Promise(resolve => setTimeout(resolve, 100))

      const { Html5QrcodeScanner } = await import('html5-qrcode')
      
      scannerRef.current = new Html5QrcodeScanner(
        "qr-scanner-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          supportedScanTypes: [{ type: "qr", config: {} }]
        },
        false
      )

      scannerRef.current.render(
        (decodedText: string) => {
          setScanStatus("Procesando QR...")
          const qrData = parseQRContent(decodedText)
          
          if (qrData) {
            setScanStatus("¡QR válido!")
            setTimeout(() => {
              onScan(qrData)
              stopScanner()
              onClose()
            }, 500)
          } else {
            setScanStatus("Formato no reconocido")
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current)
            }
            scanTimeoutRef.current = setTimeout(() => {
              setScanStatus("Escaneando...")
            }, 2000)
          }
        },
        (errorMessage: string) => {
          // Ignorar errores normales de escaneo
          if (!errorMessage.includes("No MultiFormat Readers")) {
            console.log("Escaneando...")
          }
        }
      )

      setIsCameraReady(true)
      setScanStatus("Escaneando...")
      console.log("Cámara iniciada correctamente")

    } catch (err) {
      console.error("Error al iniciar cámara:", err)
      setError("Error al acceder a la cámara. Verifica los permisos.")
      setIsScanning(false)
      setScanStatus("Error")
      setIsCameraReady(false)
    }
  }

  const stopScanner = async () => {
    // Limpiar timeouts
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }

    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current)
      initTimeoutRef.current = null
    }

    // Detener el scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear()
      } catch (error) {
        console.log("Scanner ya detenido")
      }
      scannerRef.current = null
    }
    
    setIsScanning(false)
    setIsCameraReady(false)
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  const handleRetry = async () => {
    await stopScanner()
    setTimeout(() => {
      initializeScanner()
    }, 300)
  }

  // Efecto principal para manejar la apertura/cierre
  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para asegurar que el modal esté completamente abierto
      initTimeoutRef.current = setTimeout(() => {
        initializeScanner()
      }, 300)
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

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
                  <RotateCw className="h-4 w-4 mr-2" />
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
              {!isCameraReady && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm">{scanStatus}</p>
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className={`border-3 border-green-400 border-dashed w-56 h-56 rounded-lg ${isCameraReady ? 'animate-pulse' : 'opacity-50'}`} />
                
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400" />
                
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-green-400 text-sm font-medium bg-black/80 px-3 py-1 rounded-full inline-block">
                    {scanStatus}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button onClick={handleClose} variant="outline" className="px-8">
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>

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
