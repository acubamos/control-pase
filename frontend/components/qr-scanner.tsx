"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"
import { parseQRData, type QRData } from "@/lib/qr-scanner"

interface QRScannerProps {
  onScan: (data: QRData) => void
  isOpen: boolean
  onClose: () => void
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Iniciar escaneo cada 500ms
      intervalRef.current = setInterval(scanFrame, 500)
    } catch (err) {
      setError("No se pudo acceder a la cámara")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setIsScanning(false)
  }

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      // Simular detección de QR (en producción usarías una librería como jsQR)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      // Aquí iría la lógica real de detección de QR
      // Por ahora, simulamos con un texto de prueba
      const mockQRText = "N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049"

      // En desarrollo, puedes usar este botón para simular un escaneo
      // const qrData = parseQRData(mockQRText)
      // if (qrData) {
      //   onScan(qrData)
      //   handleClose()
      // }
    } catch (err) {
      console.error("Error scanning frame:", err)
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  const simulateScan = () => {
    // Función para simular un escaneo en desarrollo
    const mockQRText = "N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049"
    const qrData = parseQRData(mockQRText)
    if (qrData) {
      onScan(qrData)
      handleClose()
    }
  }

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
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
              <Button onClick={startCamera} variant="outline">
                Intentar de nuevo
              </Button>
            </div>
          ) : (
            <div className="relative">
              <video ref={videoRef} className="w-full h-64 bg-black rounded-lg object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg animate-pulse" />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={simulateScan} className="flex-1 bg-transparent" variant="outline">
              Simular Escaneo (Dev)
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-gray-600 text-center">Apunta la cámara hacia el código QR de la cédula</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
