"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QrCode, Camera, X } from "lucide-react"
import jsQR from "jsqr"
import { parseQRData, type QRData } from "@/lib/qr-scanner"

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (data: QRData) => void
}

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (isOpen && isScanning) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [isOpen, isScanning])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true")
        videoRef.current.play()
        requestAnimationFrame(tick)
      }
    } catch (err) {
      console.error("Error accediendo a la cámara:", err)
      setError("No se pudo acceder a la cámara. Verifica permisos.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
  }

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) {
      frameRef.current = requestAnimationFrame(tick)
      return
    }

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const qrCode = jsQR(imageData.data, canvas.width, canvas.height)

    if (qrCode) {
      const data = parseQRData(qrCode.data)
      if (data) {
        onScanSuccess(data)
        stopCamera()
        onClose()
        return
      } else {
        setError("El QR no contiene datos válidos.")
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const img = new Image()
    img.onload = () => {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")
      if (!context) return

      canvas.width = img.width
      canvas.height = img.height
      context.drawImage(img, 0, 0, img.width, img.height)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const qrCode = jsQR(imageData.data, canvas.width, canvas.height)

      if (qrCode) {
        const data = parseQRData(qrCode.data)
        if (data) {
          onScanSuccess(data)
          onClose()
        } else {
          setError("El QR no contiene datos válidos.")
        }
      } else {
        setError("No se pudo leer el QR de la imagen.")
      }
    }
    img.src = URL.createObjectURL(file)
  }

  const handleManualInput = () => {
    const testData: QRData = {
      nombre: "HASSAN ALEJANDRO",
      apellidos: "RODRIGUEZ PEREZ",
      ci: "99032608049",
    }
    onScanSuccess(testData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Escanear Código QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {isScanning ? (
            <Card>
              <CardContent className="p-4">
                <video ref={videoRef} autoPlay playsInline className="w-full h-64 bg-black rounded-lg" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={() => setIsScanning(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar escaneo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => setIsScanning(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Usar cámara
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="w-full bg-transparent" size="lg">
                  <QrCode className="h-4 w-4 mr-2" />
                  Subir Imagen QR
                </Button>
              </div>

              <Button variant="secondary" size="sm" className="w-full" onClick={handleManualInput}>
                Usar datos de prueba
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
