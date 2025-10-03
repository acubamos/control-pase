"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
  const [detected, setDetected] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const scanAttemptsRef = useRef<number>(0)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setDetected(false)
      setCameraReady(false)
      scanAttemptsRef.current = 0

      // Configuración de cámara para máxima calidad
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, min: 25 },
          aspectRatio: { ideal: 1.777 } // 16:9
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Esperar a que el video esté completamente cargado y enfocado
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            // Delay adicional para que la cámara se estabilice y enfoque
            setTimeout(() => {
              setCameraReady(true)
              animationFrameRef.current = requestAnimationFrame(scanLoop)
            }, 1000)
          })
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      // Fallback a configuración más básica si falla la de alta resolución
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment"
          },
        })
        
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)
          animationFrameRef.current = requestAnimationFrame(scanLoop)
        }
      } catch (fallbackError) {
        setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.")
        setIsScanning(false)
      }
    }
  }

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setDetected(false)
    setCameraReady(false)
  }, [])

  const enhanceImageContrast = (imageData: ImageData): ImageData => {
    // Mejorar contraste para ayudar a la detección
    const data = imageData.data
    const contrast = 1.2
    const brightness = 10
    
    for (let i = 0; i < data.length; i += 4) {
      // Aplicar contraste
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness))
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness))
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness))
    }
    
    return imageData
  }

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || detected || !cameraReady) return

    scanAttemptsRef.current++

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Usar resolución completa para máxima calidad de detección
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Aplicar mejora de imagen
    const enhancedImageData = enhanceImageContrast(imageData)
    
    // Múltiples estrategias de detección
    const scanStrategies = [
      { inversionAttempts: "attemptBoth" as const },
      { inversionAttempts: "dontInvert" as const },
      { inversionAttempts: "invertFirst" as const }
    ]

    let code = null
    for (const strategy of scanStrategies) {
      code = jsQR(enhancedImageData.data, enhancedImageData.width, enhancedImageData.height, {
        ...strategy,
        maxResolution: Math.max(enhancedImageData.width, enhancedImageData.height),
      })
      
      if (code) break
    }

    if (!code) {
      // Intentar con la imagen original si la mejorada no funciona
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
        maxResolution: Math.max(imageData.width, imageData.height),
      })
    }

    if (code) {
      console.log("QR detectado con datos:", code.data)
      const qrData = parseQRData(code.data)
      if (qrData) {
        setDetected(true)
        console.log(`QR detectado y parseado correctamente en el intento: ${scanAttemptsRef.current}`)
        
        // Dar feedback visual antes de procesar
        setTimeout(() => {
          onScan(qrData)
          handleClose()
        }, 500)
      } else {
        console.warn("QR detectado pero no se pudo parsear:", code.data)
      }
    }
  }, [detected, cameraReady, onScan])

  const scanLoop = useCallback(() => {
    scanFrame()
    if (!detected) {
      animationFrameRef.current = requestAnimationFrame(scanLoop)
    }
  }, [scanFrame, detected])

  const handleClose = useCallback(() => {
    stopCamera()
    onClose()
  }, [stopCamera, onClose])

  // Efecto para manejar apertura/cierre
  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, stopCamera])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código QR
            {isScanning && !detected && (
              <span className="text-sm font-normal text-muted-foreground">
                ({scanAttemptsRef.current} escaneos)
              </span>
            )}
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
              <video 
                ref={videoRef} 
                className="w-full h-64 sm:h-80 bg-black rounded-lg object-cover" 
                playsInline 
                muted 
              />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {/* Marco de escaneo */}
                  <div
                    className={`border-3 w-56 h-56 rounded-lg transition-all duration-500 ${
                      detected
                        ? "border-green-500 bg-green-500/20 scale-110 shadow-lg"
                        : cameraReady
                        ? "border-blue-500 border-solid animate-pulse shadow-lg"
                        : "border-gray-400 border-dashed"
                    }`}
                  />
                  
                  {/* Indicador de estado */}
                  {!cameraReady && (
                    <div className="mt-4 text-white bg-black/70 px-3 py-1 rounded-full text-sm">
                      ⏳ Inicializando cámara...
                    </div>
                  )}
                </div>
              )}

              {detected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                  <div className="text-white text-center bg-green-600/90 px-6 py-4 rounded-xl">
                    <div className="animate-bounce mb-2 text-2xl">✅</div>
                    <p className="font-semibold text-lg">¡QR Detectado!</p>
                    <p className="text-sm mt-1">Procesando información...</p>
                  </div>
                </div>
              )}
            </div>
          )}          
          
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Para mejor detección:
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Asegura buena iluminación</li>
              <li>• Mantén el QR dentro del marco</li>
              <li>• Evita sombras y reflejos</li>
              <li>• Acerca lentamente hasta que enfoque</li>
            </ul>
            
            {isScanning && !detected && cameraReady && (
              <p className="text-xs text-blue-600 font-medium">
                🔍 Escaneando en alta calidad... {scanAttemptsRef.current > 50 ? "Ajusta la distancia" : ""}
              </p>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={handleClose} variant="outline" className="gap-2">
              <X className="h-4 w-4" />
              Cancelar escaneo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
