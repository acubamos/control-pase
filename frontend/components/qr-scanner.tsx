"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QrCode, X, Camera } from "lucide-react"
import { parseQRData, type QRData } from "@/lib/qr-scanner"
import QrScanner from "qr-scanner"

// Necesario para que funcione el worker
QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js"

interface QRScannerProps {
  onScanSuccess: (data: QRData) => void
  isOpen: boolean
  onClose: () => void
}

export function QRScanner({ onScanSuccess, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)

  useEffect(() => {
    if (isOpen && isScanning) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isOpen, isScanning])

  const startCamera = async () => {
    if (!videoRef.current) return

    try {
      setError(null)
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleQRResult(result.data),
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
        }
      )
      await qrScannerRef.current.start()
    } catch (err) {
      setError("No se pudo acceder a la cámara. Verifica los permisos.")
      console.error("Error accessing camera:", err)
    }
  }

  const stopCamera = () => {
    qrScannerRef.current?.stop()
    qrScannerRef.current?.destroy()
    qrScannerRef.current = null
  }

  const handleQRResult = (result: string) => {
    const data = parseQRData(result)
    if (data) {
      onScanSuccess(data)
      onClose()
    } else {
      setError("No se pudo leer el código QR. Intenta de nuevo.")
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    QrScanner.scanImage(file)
      .then((result) => handleQRResult(result))
      .catch(() => setError("No se pudo procesar la imagen."))
  }

  const handleManualInput = () => {
    // Para pruebas
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
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={() => setIsScanning(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar Escaneo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Button onClick={() => setIsScanning(true)} className="w-full" size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Usar Cámara
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

              <Button variant="secondary" onClick={handleManualInput} className="w-full" size="sm">
                Usar Datos de Prueba
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
