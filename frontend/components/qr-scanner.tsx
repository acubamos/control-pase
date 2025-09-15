"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"
import { parseQRData, type QRData } from "@/lib/qr-scanner"
import { Html5QrcodeScanner } from "html5-qrcode"

interface QRScannerProps {
  onScan: (data: QRData) => void
  isOpen: boolean
  onClose: () void
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState("Escaneando...")
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  const parseQRContent = (decodedText: string): QRData | null => {
    console.log("QR raw data:", decodedText)
    
    // Intentar múltiples formatos y patrones
    const patterns = [
      // Formato: N:Nombre\nA:Apellido\nCI:Cédula
      /N:([^\n]+)\s*A:([^\n]+)\s*CI:(\d+)/i,
      // Formato: NOMBRE:Nombre\nAPELLIDO:Apellido\nCEDULA:Cédula
      /NOMBRE:([^\n]+)\s*APELLIDO:([^\n]+)\s*CEDULA:(\d+)/i,
      // Formato: Nombre: Nombre\nApellido: Apellido\nCédula: Cédula
      /Nombre:\s*([^\n]+)\s*Apellido:\s*([^\n]+)\s*Cédula:\s*(\d+)/i,
      // Formato simple con saltos de línea
      /([^\n]+)\n([^\n]+)\n(\d+)/,
      // Formato sin etiquetas
      /^([A-ZÁÉÍÓÚÑ\s]+)[\s,]+([A-ZÁÉÍÓÚÑ\s]+)[\s,]+(\d+)$/i
    ]

    for (const pattern of patterns) {
      const match = decodedText.match(pattern)
      if (match) {
        const nombre = match[1].trim()
        const apellido = match[2].trim()
        const cedula = match[3].trim()

        return {
          nombre,
          apellido,
          cedula
        }
      }
    }

    // Si no coincide con patrones, intentar parsing manual
    try {
      return parseQRData(decodedText)
    } catch {
      return null
    }
  }

  const startScanner = async () => {
    if (!scannerContainerRef.current) return

    try {
      setError(null)
      setIsScanning(true)
      setScanStatus("Iniciando cámara...")

      // Configurar el scanner
      scannerRef.current = new Html5QrcodeScanner(
        "qr-scanner-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [], // Escanear ambos QR y barcodes
          rememberLastUsedCamera: true,
        },
        false
      )

      scannerRef.current.render(
        (decodedText) => {
          console.log("QR detectado:", decodedText)
          setScanStatus("¡QR detectado! Procesando...")

          const qrData = parseQRContent(decodedText)
          if (qrData) {
            console.log("Datos parseados:", qrData)
            onScan(qrData)
            stopScanner()
            onClose()
          } else {
            setScanStatus("Formato no reconocido. Intenta nuevamente.")
            console.warn("Formato QR no reconocido:", decodedText)
          }
        },
        (errorMessage) => {
          // Ignorar errores de parsing normales
          if (!errorMessage.includes("No MultiFormat Readers")) {
            console.log("Escaneo en progreso...")
          }
        }
      )

      setScanStatus("Escaneando...")

    } catch (err) {
      console.error("Error starting scanner:", err)
      setError("Error al iniciar el escáner. Verifica los permisos de cámara.")
      setIsScanning(false)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  const simulateScan = () => {
    const testQRs = [
      "N:REBECA\nA:LEAL FERNANDEZ\nCI:01040464099",
      "N:REBECA A:LEAL FERNANDEZ CI:01040464099",
      "REBECA\nLEAL FERNANDEZ\n01040464099",
      "NOMBRE:REBECA APELLIDO:LEAL FERNANDEZ CEDULA:01040464099"
    ]

    const randomQR = testQRs[Math.floor(Math.random() * testQRs.length)]
    console.log("Simulando QR:", randomQR)

    const qrData = parseQRContent(randomQR)
    if (qrData) {
      onScan(qrData)
      handleClose()
    }
  }

  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(startScanner, 100)
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={startScanner} variant="outline">
                Intentar de nuevo
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div
                id="qr-scanner-container"
                ref={scannerContainerRef}
                className="w-full h-64 bg-black rounded-lg overflow-hidden"
              />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                <div className="mt-4 text-center">
                  <p className="text-green-500 text-sm font-medium bg-black/80 px-2 py-1 rounded">
                    {scanStatus}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={simulateScan} className="flex-1" variant="outline">
              Simular Escaneo (Desarrollo)
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Apunta la cámara hacia el código QR de la cédula
            </p>
            <p className="text-xs text-gray-400">
              Formatos soportados: N:Nombre A:Apellido CI:Cédula
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
