"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"
import { parseQRData, type QRData } from "@/lib/qr-scanner"

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
  const workerRef = useRef<Worker | null>(null)
  const lastScanTimeRef = useRef<number>(0)
  const SCAN_INTERVAL = 150 // ms (~12 fps)
  const TARGET_W = 480
  const TARGET_H = 360

  // Crear worker como Blob (inline)
  const createWorker = () => {
    if (workerRef.current) return

    const workerCode = `
      // Importar jsQR desde un CDN UMD
      self.importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');

      self.onmessage = function(e) {
        // e.data: { width, height, buffer }
        try {
          const { width, height, buffer } = e.data;
          // Reconstruir Uint8ClampedArray a partir del buffer transferido
          const clamped = new Uint8ClampedArray(buffer);
          // Ejecutar jsQR (la librería queda disponible como jsQR en el scope global)
          const code = self.jsQR(clamped, width, height, { inversionAttempts: "dontInvert" });
          if (code) {
            // Devolver el texto detectado
            self.postMessage({ success: true, data: code.data });
          } else {
            self.postMessage({ success: false });
          }
        } catch (err) {
          self.postMessage({ success: false, error: String(err) });
        }
      };
    `
    const blob = new Blob([workerCode], { type: "application/javascript" })
    const url = URL.createObjectURL(blob)
    const worker = new Worker(url)
    workerRef.current = worker
  }

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setDetected(false)

      createWorker()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: TARGET_W },
          height: { ideal: TARGET_H },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Listener del worker
      if (workerRef.current) {
        workerRef.current.onmessage = (ev) => {
          if (!ev.data) return
          if (ev.data.success && ev.data.data) {
            const text = ev.data.data as string
            const qrData = parseQRData(text)
            if (qrData) {
              setDetected(true)
              onScan(qrData)
              // detener inmediatamente
              stopCamera()
              setTimeout(() => handleClose(), 300)
            }
          }
        }
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
    if (videoRef.current) videoRef.current.srcObject = null

    // Terminar worker y liberar url
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    setIsScanning(false)
    setDetected(false)
  }

  const scanLoop = (timestamp: number) => {
    if (timestamp - lastScanTimeRef.current >= SCAN_INTERVAL) {
      lastScanTimeRef.current = timestamp
      scanFrameAndSendToWorker()
    }
    animationFrameRef.current = requestAnimationFrame(scanLoop)
  }

  const scanFrameAndSendToWorker = () => {
    if (!videoRef.current || !canvasRef.current || !workerRef.current || detected) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Redimensionamos el canvas a un tamaño fijo reducido
    canvas.width = TARGET_W
    canvas.height = TARGET_H
    ctx.drawImage(video, 0, 0, TARGET_W, TARGET_H)

    const imageData = ctx.getImageData(0, 0, TARGET_W, TARGET_H)
    // Transferimos el buffer (mejor rendimiento)
    // jsQR espera Uint8ClampedArray; transferimos el buffer del array subyacente
    const buffer = new Uint8ClampedArray(imageData.data).buffer

    // postMessage con transferable
    try {
      workerRef.current.postMessage({ width: TARGET_W, height: TARGET_H, buffer }, [buffer])
    } catch (err) {
      // Fallback: si no puede transferir, envía copia normal
      workerRef.current.postMessage({ width: TARGET_W, height: TARGET_H, buffer: imageData.data })
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
      setTimeout(() => handleClose(), 500)
    }
  }

  useEffect(() => {
    if (isOpen) startCamera()
    else stopCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <Button onClick={startCamera} variant="outline">Intentar de nuevo</Button>
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
                      detected ? "border-green-500 animate-ping" : "border-green-500 border-dashed animate-pulse"
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
            Apunta la cámara hacia el código QR. Iluminación adecuada acelera la detección.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
