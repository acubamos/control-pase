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
  const [detected, setDetected] = useState(false) // Nueva bandera para UX
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setDetected(false)

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
        await videoRef.current.play()
      }

      animationFrameRef.current = requestAnimationFrame(scanLoop)
    } catch (err) {
      setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
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
  }

  const scanLoop = () => {
    scanFrame()
    animationFrameRef.current = requestAnimationFrame(scanLoop)
  }

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || detected) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code) {
      const qrData = parseQRData(code.data)
      if (qrData) {
        setDetected(true) // Activar animación de confirmación
        onScan(qrData)
        // Esperar 1 segundo antes de cerrar
        setTimeout(() => {
          handleClose()
        }, 1000)
      }
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  const simulateScan = () => {
    const mockQRText = `N:HASSAN ALEJANDRO\nA:RODRIGUEZ PEREZ\nCI:99032608049`
    const qrData = parseQRData(mockQRText)
    if (qrData) {
      setDetected(true)
      onScan(qrData)
      setTimeout(() => {
        handleClose()
      }, 1000)
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`border-2 w-48 h-48 rounded-lg ${
                      detected
                        ? "border-green-500 animate-ping" // Animación cuando detecta
                        : "border-green-500 border-dashed animate-pulse"
                    }`}
                  />
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

          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara hacia el código QR de la cédula. Asegúrate de tener buena iluminación.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
