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

// Configuración ajustable
const SCAN_INTERVAL = 150 
const SCAN_QUALITY = 0.7 // Calidad de imagen reducida para procesamiento más rápido
const MIN_QR_SIZE = 150 // Tamaño mínimo esperado del QR en píxeles

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastScanTimeRef = useRef<number>(0)
  const scanAttemptsRef = useRef<number>(0)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setDetected(false)
      scanAttemptsRef.current = 0

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1024 }, // Resolución reducida
          height: { ideal: 768 },
          frameRate: { ideal: 20 } // Frame rate reducido
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Pequeño delay para que la cámara se estabilice
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(scanLoop)
      }, 500)
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.")
      setIsScanning(false)
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
  }, [])

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || detected) return

    const now = Date.now()
    if (now - lastScanTimeRef.current < SCAN_INTERVAL) return

    lastScanTimeRef.current = now
    scanAttemptsRef.current++

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Reducir tamaño del canvas para procesamiento más rápido
    const scale = SCAN_QUALITY
    canvas.width = video.videoWidth * scale
    canvas.height = video.videoHeight * scale

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Configuración optimizada para jsQR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
      maxResolution: 800, // Límite de resolución para procesamiento
    })

    if (code) {
      // Validar que el QR tenga un tamaño mínimo razonable
      const qrSize = Math.max(code.location.topRightCorner.x - code.location.topLeftCorner.x,
                             code.location.bottomRightCorner.y - code.location.topRightCorner.y)
      
      if (qrSize >= MIN_QR_SIZE * scale) {
        const qrData = parseQRData(code.data)
        if (qrData) {
          setDetected(true)
          console.log(`QR detectado en el intento: ${scanAttemptsRef.current}`)
          
          // Feedback inmediato antes de cerrar
          setTimeout(() => {
            onScan(qrData)
            handleClose()
          }, 300)
        }
      }
    }
  }, [detected, onScan])

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
                ({scanAttemptsRef.current} intentos)
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`border-2 w-48 h-48 rounded-lg transition-all duration-300 ${
                      detected
                        ? "border-green-500 bg-green-500/20 scale-110"
                        : "border-green-500 border-dashed animate-pulse"
                    }`}
                  />
                </div>
              )}

              {detected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-white text-center">
                    <div className="animate-bounce mb-2">✅</div>
                    <p className="font-semibold">¡QR Detectado!</p>
                  </div>
                </div>
              )}
            </div>
          )}          
          
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Apunta la cámara hacia el código QR del carnet. Asegúrate de tener buena iluminación.
            </p>
            {isScanning && !detected && (
              <p className="text-xs text-orange-600">
                Escaneando... Acerca o aleja la cámara si no detecta
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <Button onClick={handleClose} variant="outline" className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

