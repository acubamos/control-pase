"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
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
  const [zoomLevel, setZoomLevel] = useState(1)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setCameraReady(false)

      // Obtener dispositivos disponibles para elegir la mejor cámara
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      // Preferir cámaras traseras (environment)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 24 },
          // Configuración avanzada para mejor enfoque
          advanced: [
            { focusMode: "continuous" },
            { exposureMode: "continuous" },
            { whiteBalanceMode: "continuous" }
          ]
        },
        audio: false
      }

      // Intentar con constraints específicos para mejor calidad
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        
        // Esperar a que el video esté listo
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true)
          videoRef.current?.play().catch(console.error)
        }

        videoRef.current.onplay = () => {
          setCameraReady(true)
        }
      }

      // Iniciar escaneo cada 150ms para mejor rendimiento
      intervalRef.current = setInterval(scanFrame, 150)
    } catch (err) {
      console.error("Camera error:", err)
      setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios y de tener buena iluminación.")
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

  const applyZoom = () => {
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${zoomLevel})`
      videoRef.current.style.transition = 'transform 0.3s ease'
    }
  }

  const increaseZoom = () => {
    if (zoomLevel < 2) {
      setZoomLevel(prev => Math.min(prev + 0.1, 2))
    }
  }

  const decreaseZoom = () => {
    if (zoomLevel > 1) {
      setZoomLevel(prev => Math.max(prev - 0.1, 1))
    }
  }

  const resetZoom = () => {
    setZoomLevel(1)
  }

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Usar dimensiones reales del video para mejor calidad
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Dibujar el frame con alta calidad
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Obtener los datos de la imagen para el escaneo
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Escanear el código QR con configuración optimizada
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
      maxResolution: 800 // Optimizar performance sin perder calidad
    })

    if (code) {
      console.log("QR detectado:", code.data)
      const qrData = parseQRData(code.data)
      if (qrData) {
        onScan(qrData)
        handleClose()
      }
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  const simulateScan = () => {
    const mockQRText = "N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049"
    const qrData = parseQRData(mockQRText)
    if (qrData) {
      onScan(qrData)
      handleClose()
    }
  }

  // Aplicar zoom cuando cambie
  useEffect(() => {
    applyZoom()
  }, [zoomLevel])

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
                  Consejos: Asegura los permisos de cámara, limpia el lente y usa buena iluminación
                </p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg bg-black">
              <div className="relative aspect-video overflow-hidden">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  playsInline 
                  muted 
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de guía */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-green-400 border-dashed w-64 h-64 rounded-lg animate-pulse" />
                </div>

                {/* Controles de zoom */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-black/50 rounded-lg p-2">
                  <Button
                    onClick={increaseZoom}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white"
                    disabled={zoomLevel >= 2}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={decreaseZoom}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white"
                    disabled={zoomLevel <= 1}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={resetZoom}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white"
                    disabled={zoomLevel === 1}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Indicador de estado */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={simulateScan} className="flex-1" variant="outline" size="sm">
              Simular Escaneo (Desarrollo)
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              {cameraReady ? "Enfoca el código QR dentro del marco" : "Iniciando cámara..."}
            </p>
            <p className="text-xs text-gray-400">
              Mantén estable el dispositivo y asegura buena iluminación
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
