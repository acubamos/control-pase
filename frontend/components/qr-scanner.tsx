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
// ✅ Extensión local de tipos para capacidades no estándar
declare global {
  interface MediaTrackCapabilities {
    focusMode?: string[]; // algunos dispositivos devuelven ["continuous", "single-shot"]
    zoom?: {
      min: number;
      max: number;
      step: number;
    };
  }

  interface MediaTrackConstraintSet {
    focusMode?: string;
    zoom?: number;
  }
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanningStatus, setScanningStatus] = useState("Escaneando...");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setScanningStatus("Iniciando cámara...");

      // 1️⃣ - Abrimos la cámara sin forzar resolución
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 }, // ← Máxima posible
          height: { ideal: 1080 }, // ← Máxima posible
          frameRate: { ideal: 30 }, // Balance entre fluidez y calidad
        },
      });

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      console.log("📷 Capacidades detectadas:", capabilities);

      // 2️⃣ - Aplicamos enfoque continuo si está soportado
      if (
        capabilities.focusMode &&
        capabilities.focusMode.includes("continuous")
      ) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any],
          });
          console.log("✅ Enfoque continuo activado");
        } catch (err) {
          console.warn("⚠️ No se pudo aplicar enfoque continuo", err);
        }
      }

      // 3️⃣ - Aplicamos un zoom suave si está disponible
      if (capabilities.zoom) {
        await videoTrack.applyConstraints({
          advanced: [{ zoom: capabilities.zoom.min }], // 👈 mínimo posible
        });
      }

      // 4️⃣ - Iniciamos el video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanningStatus("📡 Escaneando...");
      setTimeout(() => {
        scanFrame();
      }, 800);
    } catch (err) {
      console.error("❌ Error iniciando cámara:", err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de permitir los permisos."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsScanning(false);
  };

  const scanFrame = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const scale = 1;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (qrCode) {
        console.log("🎯 QR detectado:", qrCode.data);
        setScanningStatus("✅ QR detectado - Procesando...");

        const qrData = parseQRData(qrCode.data);

        if (qrData) {
          console.log("✅ Datos parseados correctamente:", qrData);
          onScan(qrData);
          handleClose();
          return;
        } else {
          console.warn("❌ No se pudieron parsear los datos del QR");
          setScanningStatus("❌ Formato QR no válido");
          setTimeout(() => {
            setScanningStatus("Escaneando...");
            animationRef.current = requestAnimationFrame(scanFrame);
          }, 1000);
          return;
        }
      }

      setScanningStatus("🔍 Buscando código QR...");
      animationRef.current = requestAnimationFrame(scanFrame);
    } catch (e) {
      console.error("Error en escaneo de frame:", e);
      animationRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const simulateScan = () => {
    // Función para simular un escaneo en desarrollo
    const mockQRText = "N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049";
    console.log("🧪 Simulando escaneo con:", mockQRText);

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

    return () => {
      stopCamera();
    };
  }, [isOpen]);

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
                Intentar de nuevo
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
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <p className="text-white bg-black bg-opacity-50 px-3 py-1 rounded-md text-sm">
                      {scanningStatus}
                    </p>
                  </div>
                </>
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
            Apunta la cámara hacia el código QR de la cédula
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}


