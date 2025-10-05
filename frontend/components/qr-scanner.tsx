"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const frameRequest = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 }, // ↑ Aumentar resolución
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }, // ← Agregar frame rate
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        scanLoop();
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (frameRequest.current) {
      cancelAnimationFrame(frameRequest.current);
      frameRequest.current = null;
    }
    setIsScanning(false);
  }, []);

  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      frameRequest.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (
      !context ||
      video.readyState !== video.HAVE_ENOUGH_DATA ||
      video.videoWidth === 0
    ) {
      frameRequest.current = requestAnimationFrame(scanLoop);
      return;
    }

    // Usar un contador separado para el throttling
    let frameCount = 0;
    frameCount++;

    // Throttling - procesar cada 3 frames aproximadamente
    if (frameCount % 3 !== 0) {
      frameRequest.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      console.log("QR detectado:", code.data);
      const qrData = parseQRData(code.data);
      if (qrData) {
        console.log("QR parseado:", qrData);
        onScan(qrData);
        handleClose();
        return;
      } else {
        console.warn("QR no pudo ser parseado. Formato:", code.data);
      }
    }

    frameRequest.current = requestAnimationFrame(scanLoop);
  }, [onScan, isScanning]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

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
                  <div className="relative w-48 h-48">
                    {/* Marco verde animado */}
                    <div className="absolute inset-0 border-2 border-green-500 rounded-lg animate-pulse" />
                    {/* Línea de escaneo */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-green-500 scan-line" />
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full flex justify-center gap-2"
          >
            <X className="h-4 w-4" /> Cerrar
          </Button>

          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara al código QR. Asegúrate de buena iluminación y
            enfoque.
          </p>
        </div>

        <style jsx>{`
          @keyframes scanLine {
            0% {
              transform: translateY(0);
              opacity: 0.8;
            }
            50% {
              transform: translateY(11rem);
              opacity: 1;
            }
            100% {
              transform: translateY(0);
              opacity: 0.8;
            }
          }
          .scan-line {
            animation: scanLine 2.5s infinite ease-in-out;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
