"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"
import { parseQRData, type QRData } from "@/lib/qr-scanner"
import jsQR from "jsqr"

interface QRScannerProps {
  onScan: (data: QRData) => void
  isOpen: boolean
  onClose: () => void
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const scanAttemptsRef = useRef(0)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setCameraReady(false)
      scanAttemptsRef.current = 0

      // Configuración optimizada para QR scanning
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          // Configuración para mejor enfoque y calidad
          advanced: [
            { focusMode: "continuous" },
            { exposureMode: "continuous" },
            { whiteBalanceMode: "continuous" }
          ] as any
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true)
          videoRef.current?.play().catch(console.error)
        }

        videoRef.current.onplay = () => {
          setCameraReady(true)
        }
      }

      // Escanear más frecuentemente para mejor detección
      intervalRef.current = setInterval(scanFrame, 100)
    } catch (err) {
      console.error("Camera error:", err)
      setError("No se pudo acceder a la cámara. Verifica los permisos e intenta nuevamente.")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        track.enabled = false
      })
      streamRef.current = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setIsScanning(false)
    setCameraReady(false)
  }

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Usar dimensiones reales pero optimizadas para performance
    const scale = 0.8 // Reducir ligeramente para mejor performance
    canvas.width = video.videoWidth * scale
    canvas.height = video.videoHeight * scale
    
    // Dibujar con alta calidad pero dimensiones escaladas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Obtener datos de imagen para escaneo
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Escanear con configuración optimizada
    const code = jsQR(
      imageData.data, 
      imageData.width, 
      imageData.height, 
      {
        inversionAttempts: "dontInvert",
        maxResolution: 1000,
        minConfidence: 0.3 // Umbral más bajo para mejor detección
      }
    )

    scanAttemptsRef.current++

    if (code) {
      console.log("QR detectado:", code.data)
      console.log("Confianza:", code.confidence)
      
      try {
        const qrData = parseQRData(code.data)
        if (qrData) {
          onScan(qrData)
          handleClose()
        }
      } catch (parseError) {
        console.error("Error parsing QR data:", parseError)
      }
    }

    // Log cada 50 intentos para debugging
    if (scanAttemptsRef.current % 50 === 0) {
      console.log(`Escaneos realizados: ${scanAttemptsRef.current}`)
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
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
      <DialogContent className="max-w-md sm:max-w-lg">
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
              <div className="space-y-2">
                <Button onClick={startCamera} variant="outline" className="w-full">
                  Intentar de nuevo
                </Button>
                <p className="text-sm text-gray-500">
                  Asegúrate de permitir el acceso a la cámara y tener buena iluminación
                </p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg bg-black">
              <div className="relative aspect-video">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  playsInline 
                  muted 
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de guía para QR */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-4 border-green-400 border-dashed w-64 h-64 rounded-lg animate-pulse" />
                  
                  {/* Líneas de guía adicionales */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-green-400/30 transform -translate-y-1/2" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-green-400/30 transform -translate-x-1/2" />
                </div>

                {/* Indicador de estado */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">Iniciando cámara...</p>
                    </div>
                  </div>
                )}

                {/* Contador de escaneos (solo desarrollo) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Intentos: {scanAttemptsRef.current}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button onClick={handleClose} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              {cameraReady 
                ? "Enfoca el código QR dentro del marco verde" 
                : "Preparando cámara..."}
            </p>
            <p className="text-xs text-gray-400">
              Mantén el dispositivo estable y asegura buena iluminación
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
