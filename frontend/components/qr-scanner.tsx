"use client"

import { useRef, useState, useEffect } from "react"
import jsQR from "jsqr"
import { parseQRData, type QRData } from "@/lib/qr-scanner" // Ajusta la ruta según tu proyecto
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"

export default function QRScannerCarnet() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [qrResult, setQrResult] = useState<QRData | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let scanInterval: NodeJS.Timeout

    async function startScanner() {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: "environment", // cámara trasera
          },
        }
        stream = await navigator.mediaDevices.getUserMedia(constraints)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()

          setScanning(true)
          scanInterval = setInterval(() => scanFrame(), 100) // ~10 fps
        }
      } catch (error) {
        console.error("Error al acceder a la cámara:", error)
      }
    }

    function stopScanner() {
      setScanning(false)
      if (scanInterval) clearInterval(scanInterval)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }

    function scanFrame() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code && code.data) {
        const parsed = parseQRData(code.data)
        if (parsed) {
          setQrResult(parsed)
          stopScanner()
          setIsOpen(false)
        }
      }
    }

    if (isOpen) {
      startScanner()
    }

    return () => stopScanner()
  }, [isOpen])

  return (
    <div className="space-y-4">
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Camera size={18} />
        Escanear carnet
      </Button>

      {/* Resultado */}
      {qrResult && (
        <div className="p-4 border rounded-lg bg-gray-50 shadow-sm">
          <h3 className="font-semibold mb-2">✅ Datos escaneados</h3>
          <p><strong>Nombre:</strong> {qrResult.nombre}</p>
          <p><strong>Apellidos:</strong> {qrResult.apellidos}</p>
          <p><strong>CI:</strong> {qrResult.ci}</p>
        </div>
      )}

      {/* Modal de escaneo */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escanea el QR del carnet</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {scanning && (
              <div className="absolute inset-0 border-4 border-green-500 rounded-lg pointer-events-none animate-pulse" />
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setIsOpen(false)}
            >
              <X />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
