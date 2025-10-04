"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera } from "lucide-react"
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const frameCountRef = useRef(0) // para saltar frames

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setDetected(false)

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
          focusMode: "continuous" as any,
          torch: true as any, // algunos navegadores lo ignoran
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // Intentar activar la linterna si es compatible
        const track = stream.getVideoTracks()[0]
        const capabilities = track.getCapabilities?.()
        if (capabilities && "torch" in capabilities) {
          await track.applyConstraints({ advanced: [{ torch: true }] }).catch(() => {})
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanLoop)
    } catch (err) {
      console.error(err)
      setError("No se pudo acceder a la cámara. Verifica permisos o reinicia el navegador.")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
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
    frameCountRef.current++
    // Escanear solo cada 2 frames → mejora rendimiento móvil
    if (frameCountRef.current % 2 === 0) {
      scanFrame()
    }
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
      inversionAttempts: "attemptBoth",
    })

    if (code) {
      const qrData = parseQRData(code.data)
      if (qrData) {
        setDetected(true)
        onScan(qrData)
        setTimeout(() => handleClose(), 800) // pequeña pausa para UX
      }
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
    return () => stopCamera()
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`border-2 w-48 h-48 rounded-lg transition-all duration-300 ${
                      detected
                        ? "border-green-500 animate-ping"
                        : "border-green-500 border-dashed animate-pulse"
                    }`}
                  />
                </div>
              )}
            </div>
          )}
          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara hacia el código QR. Asegúrate de tener buena luz y mantén el código centrado.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
