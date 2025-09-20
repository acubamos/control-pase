"use client"

import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { parseQRData, type QRData } from "@/lib/qr-scanner"

const QrReader = dynamic(() => import("react-qr-reader"), {
  ssr: false,
});

interface QRScannerProps {
  onScan: (data: QRData) => void
  isOpen: boolean
  onClose: () => void
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const handleScan = (result: string | null) => {
    if (result) {
      const qrData = parseQRData(result)
      if (qrData) {
        onScan(qrData)
        onClose()
      }
    }
  }

  const handleError = (err: unknown) => {
    console.error("Error de QR:", err)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <QrReader
            constraints={{ facingMode: "environment" }}
            onResult={(result, error) => {
              if (!!result) handleScan(result.getText())
              if (!!error) handleError(error)
            }}
            containerStyle={{ width: "100%", borderRadius: "0.5rem" }}
            videoStyle={{ borderRadius: "0.5rem" }}
          />

          <div className="flex gap-2">
            <Button
              onClick={() =>
                handleScan("N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049")
              }
              className="flex-1"
              variant="outline"
            >
              Simular Escaneo (Dev)
            </Button>
            <Button onClick={onClose} variant="outline" size="icon">
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
