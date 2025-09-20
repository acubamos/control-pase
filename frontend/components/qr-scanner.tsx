"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCallback } from "react"
import { QrScanner } from "@yudiel/react-qr-scanner"
import { parseQRData, type QRData } from "@/lib/qr-scanner"

interface QRScannerProps {
  onScan: (data: QRData) => void
  isOpen: boolean
  onClose: () => void
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const handleScan = useCallback(
    (result: string | null) => {
      if (result) {
        const qrData = parseQRData(result)
        if (qrData) {
          onScan(qrData)
          onClose()
        }
      }
    },
    [onScan, onClose]
  )

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
          <QrScanner
            onDecode={handleScan}
            onError={(err) => console.error(err)}
            constraints={{ facingMode: "environment" }}
            className="w-full h-64 rounded-lg"
          />

          <div className="flex gap-2">
            <Button
              onClick={() => handleScan("N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049")}
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
