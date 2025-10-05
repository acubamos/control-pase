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
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingCamera, setIsLoadingCamera] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const frameRequest = useRef<number | null>(null)

  /** 📸 Iniciar cámara con optimizaciones estilo PWA */
  const startCamera = useCallback(async () => {
    try {
      setError(null)
      setIsLoadingCamera(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsScanning(true)
        scanLoop()
      }
    } catch (err) {
      console.error(err)
      setError("No se pudo acceder a la cámara. Verifica los permisos en tu navegador.")
    } finally {
      setIsLoadingCamera(false)
    }
  }, [])

  /** 🛑 Detener cámara y bucles */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (frameRequest.current) {
      cancelAnimationFrame(frameRequest.current)
      frameRequest.current = null
    }
    setIsScanning(false)
  }, [])

  /** 🔁 Bucle continuo de escaneo (como WhatsApp) */
  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      frameRequest.current = requestAnimationFrame(scanLoop)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code?.data) {
      const qrData = parseQRData(code.data)
      if (qrData) {
        onScan(qrData)
        handleClose()
        return
      }
    }

    frameRequest.current = requestAnimationFrame(scanLoop)
  }, [onScan])

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

    return () => stopCamera()
  }, [isOpen, startCamera, stopCamera])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código QR
          </DialogTitle>
        </DialogHeader>

        <div className="relative space-y-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={startCamera} variant="outline">
                Reintentar
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Marco animado estilo WhatsApp */}
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 border-2 border-green-500 rounded-lg animate-pulse" />
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-green-500 animate-scan" />
                  </div>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleClose} variant="outline" className="w-full flex justify-center gap-2">
            <X className="h-4 w-4" /> Cerrar
          </Button>

          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara al código QR. Asegúrate de buena iluminación y enfoque.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// /** 🟩 Animación tipo “línea de escaneo” */
// const style = document.createElement("style")
// style.innerHTML = `
// @keyframes scanLine {
//   0% { transform: translateY(0); opacity: 0.8; }
//   50% { transform: translateY(11rem); opacity: 1; }
//   100% { transform: translateY(0); opacity: 0.8; }
// }
// .animate-scan {
//   animation: scanLine 2.5s infinite ease-in-out;
// }
// `
// document.head.appendChild(style)
