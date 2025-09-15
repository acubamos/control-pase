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
  const [scanStatus, setScanStatus] = useState("Escaneando...")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const scanCountRef = useRef(0)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setScanStatus("Escaneando...")
      scanCountRef.current = 0

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 24 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error)
        }
      }

      // Iniciar escaneo cada 150ms
      intervalRef.current = setInterval(scanFrame, 150)
    } catch (err) {
      setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.")
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
  }

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Optimizar el tamaño para mejor detección
    const scale = 0.7 // Reducir tamaño para mejor performance
    canvas.width = video.videoWidth * scale
    canvas.height = video.videoHeight * scale
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Intentar múltiples métodos de detección
    const detectionMethods = [
      () => jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
        minConfidence: 0.3
      }),
      () => jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "invertFirst",
        minConfidence: 0.3
      }),
      () => jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
        minConfidence: 0.25
      })
    ]

    let detectedCode = null
    for (const detect of detectionMethods) {
      detectedCode = detect()
      if (detectedCode) break
    }

    scanCountRef.current++

    if (detectedCode) {
      console.log("QR detectado - Confianza:", detectedCode.confidence)
      console.log("Datos:", detectedCode.data)
      
      try {
        const qrData = parseQRData(detectedCode.data)
        if (qrData) {
          setScanStatus("¡QR detectado!")
          setTimeout(() => {
            onScan(qrData)
            handleClose()
          }, 500)
        }
      } catch (parseError) {
        console.error("Error parsing QR:", parseError)
        setScanStatus("Error en formato QR")
      }
    }

    // Debug: mostrar estado cada 20 escaneos
    if (scanCountRef.current % 20 === 0) {
      console.log(`Escaneos realizados: ${scanCountRef.current}`)
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  const simulateScan = () => {
    const mockQRText = "N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049"
    try {
      const qrData = parseQRData(mockQRText)
      if (qrData) {
        onScan(qrData)
        handleClose()
      }
    } catch (error) {
      console.error("Error en simulación:", error)
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
              <video 
                ref={videoRef} 
                className="w-full h-64 bg-black rounded-lg object-cover" 
                playsInline 
                muted 
              />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  <div className="mt-4 text-center">
                    <p className="text-green-500 text-sm font-medium">{scanStatus}</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Intentos: {scanCountRef.current}
                    </p>
                  </div>
                </div>
              )}
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
              Asegura buena iluminación y mantén estable el dispositivo
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
