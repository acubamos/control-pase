"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X, Scan } from "lucide-react"
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
  const [scanningActive, setScanningActive] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const lastScanTimeRef = useRef<number>(0)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setCameraReady(false)
      setScanningActive(true)

      // Configuración optimizada para móviles como Samsung A52
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 60, min: 30 }, // Mayor frame rate para mejor detección
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            setCameraReady(true)
            startScanningAnimation()
          } catch (err) {
            console.error("Play error:", err)
          }
        }
      }

    } catch (err) {
      console.error("Camera error:", err)
      setError("No se pudo acceder a la cámara. Verifica los permisos de la cámara.")
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

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    setIsScanning(false)
    setCameraReady(false)
    setScanningActive(false)
  }

  const startScanningAnimation = () => {
    const scan = () => {
      if (!scanningActive) return

      const now = Date.now()
      // Escanear a 60fps como los lectores Samsung
      if (now - lastScanTimeRef.current >= 16) { // ≈60fps
        scanFrame()
        lastScanTimeRef.current = now
      }

      animationRef.current = requestAnimationFrame(scan)
    }

    animationRef.current = requestAnimationFrame(scan)
  }

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady || !scanningActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Usar dimensiones óptimas para móviles
    const targetWidth = 800
    const scale = targetWidth / video.videoWidth
    canvas.width = targetWidth
    canvas.height = video.videoHeight * scale
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Escanear con configuración agresiva como Samsung
    const code = jsQR(
      imageData.data, 
      imageData.width, 
      imageData.height, 
      {
        inversionAttempts: "attemptBoth", // Intentar ambos modos
        maxResolution: 800,
        minConfidence: 0.1, // Umbral muy bajo para máxima sensibilidad
      }
    )

    if (code && code.confidence > 0.3) { // Filtrar por confianza después
      console.log("QR detectado con confianza:", code.confidence)
      
      try {
        const qrData = parseQRData(code.data)
        if (qrData) {
          // Feedback visual de éxito
          setScanningActive(false)
          setTimeout(() => {
            onScan(qrData)
            handleClose()
          }, 300) // Pequeño delay para feedback visual
        }
      } catch (parseError) {
        console.error("Error parsing QR data:", parseError)
      }
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  const handleRetry = () => {
    stopCamera()
    setTimeout(startCamera, 300)
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
      <DialogContent className="max-w-md sm:max-w-lg p-0 bg-black border-0">
        <div className="relative h-[80vh] max-h-[600px]">
          {/* Video de la cámara */}
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover"
            playsInline 
            muted 
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay tipo Samsung */}
          <div className="absolute inset-0 flex flex-col">
            {/* Header */}
            <div className="bg-black/80 p-4 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Scan className="h-6 w-6" />
                  Escanear código QR
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* Marco de escaneo central */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                {/* Marco exterior */}
                <div className="w-64 h-64 border-2 border-white/30 rounded-lg">
                  {/* Línea de escaneo animada */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-scan-line rounded-full" />
                  
                  {/* Esquinas decoradas */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400" />
                </div>

                {/* Puntos de guía */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                </div>
              </div>
            </div>

            {/* Footer con instrucciones */}
            <div className="bg-black/80 p-6 text-white text-center">
              <p className="text-sm mb-3">Coloca el código QR dentro del marco</p>
              <div className="flex justify-center gap-3">
                <Button 
                  onClick={handleClose} 
                  variant="outline" 
                  size="sm"
                  className="text-white border-white/30 hover:bg-white/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                {error && (
                  <Button 
                    onClick={handleRetry} 
                    variant="default" 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Reintentar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Indicador de carga */}
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Iniciando cámara...</p>
                <p className="text-sm text-gray-300 mt-1">Por favor espera</p>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {error && !cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center text-white p-6">
                <Camera className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Error de cámara</p>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                <Button 
                  onClick={handleRetry} 
                  className="bg-green-600 hover:bg-green-700"
                >
                  Intentar nuevamente
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Estilos para la animación de escaneo */}
        <style jsx>{`
          @keyframes scan-line {
            0% { transform: translateY(0); opacity: 1; }
            50% { transform: translateY(256px); opacity: 0.8; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-scan-line {
            animation: scan-line 2s ease-in-out infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
