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
  const animationFrameRef = useRef<number | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const lastScanTimeRef = useRef<number>(0)

  const TARGET_W = 480
  const TARGET_H = 360
  const SCAN_INTERVAL = 80 // ms (~12fps)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setDetected(false)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment"},
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Crear worker y OffscreenCanvas
      const worker = new Worker("qr-worker.js")
      workerRef.current = worker

      const canvas = new OffscreenCanvas(TARGET_W, TARGET_H)
      worker.postMessage({ canvas, width: TARGET_W, height: TARGET_H }, [canvas])

      const ctx = canvas.getContext("2d")

      worker.onmessage = (e) => {
        if (e.data?.success && e.data?.data) {
          const qrData = parseQRData(e.data.data)
          if (qrData) {
            setDetected(true)
            onScan(qrData)
            stopCamera()
            setTimeout(() => handleClose(), 300)
          }
        }
      }

      // Bucle de escaneo
      const scanLoop = (timestamp: number) => {
        if (timestamp - lastScanTimeRef.current >= SCAN_INTERVAL && ctx && videoRef.current) {
          lastScanTimeRef.current = timestamp
          ctx.drawImage(videoRef.current, 0, 0, TARGET_W, TARGET_H)
          worker.postMessage("scan")
        }
        animationFrameRef.current = requestAnimationFrame(scanLoop)
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
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    setIsScanning(false)
    setDetected(false)
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
