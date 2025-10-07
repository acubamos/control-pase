"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X } from "lucide-react";
import { parseQRData, type QRData } from "@/lib/qr-scanner";
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (data: QRData) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [scanningStatus, setScanningStatus] = useState("");

  const startCamera = async () => {
    try {
      setError(null);
      setScanningStatus("Abriendo cámara...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          advanced: [{ focusMode: "continuous" } as any],
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
        setScanningStatus("Apunta al código QR y presiona el botón para tomar la foto");
      }
    } catch (err) {
      console.error(err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de permitir los permisos."
      );
      setIsCameraReady(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  };

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    // Dibujar el frame actual del video en el canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (qrCode) {
      console.log("🎯 QR detectado:", qrCode.data);
      const qrData = parseQRData(qrCode.data);
      if (qrData) {
        onScan(qrData);
        handleClose();
      } else {
        setScanningStatus("❌ QR detectado pero no válido");
      }
    } else {
      setScanningStatus("⚠️ No se detectó ningún QR en la foto");
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const simulateScan = () => {
    const mockQRText = "N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049";
    const qrData = parseQRData(mockQRText);
    if (qrData) {
      onScan(qrData);
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código QR (Modo Foto)
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

              {scanningStatus && (
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <p className="text-white bg-black bg-opacity-50 px-3 py-1 rounded-md text-sm">
                    {scanningStatus}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {isCameraReady && (
              <Button onClick={captureAndScan} className="flex-1">
                📸 Tomar Foto y Escanear
              </Button>
            )}
            <Button onClick={simulateScan} variant="outline">
              Simular
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Alinea el QR en el recuadro y toma la foto para leerlo
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
