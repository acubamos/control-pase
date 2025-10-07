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
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanningStatus, setScanningStatus] = useState("Escaneando...");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // 📌 Lista de resoluciones a probar automáticamente
  const resolutions = [
    { width: 1920, height: 1080 }, // Full HD
    { width: 1280, height: 720 },  // HD
    { width: 640, height: 480 },   // VGA
    { width: 320, height: 240 },   // QVGA (último recurso)
  ];

  // 📌 Función para detectar la mejor resolución soportada
  const detectBestResolution = async (): Promise<{ width: number; height: number } | null> => {
    for (const r of resolutions) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: r.width },
            height: { ideal: r.height },
          },
        });
        console.log(`✅ Soportada: ${r.width}x${r.height}`);
        testStream.getTracks().forEach((t) => t.stop());
        return r; // 👉 Devuelve la primera resolución que funcione
      } catch {
        console.log(`❌ No soportada: ${r.width}x${r.height}`);
      }
    }
    return null;
  };

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setScanningStatus("Escaneando...");

      // 🔍 Detectar automáticamente la mejor resolución soportada
      const bestRes = await detectBestResolution();
      if (!bestRes) {
        setError("No se encontró ninguna resolución de cámara compatible.");
        setIsScanning(false);
        return;
      }

      console.log(`📸 Usando resolución: ${bestRes.width}x${bestRes.height}`);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: bestRes.width },
          height: { ideal: bestRes.height },
          advanced: [
            { focusMode: "continuous" } as any,
            //{ zoom: 1.3 } as any
          ]  
        },
      });     

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setTimeout(() => {
        scanFrame(); // iniciar el bucle de escaneo después de un breve delay
      }, 800);
    } catch (err) {
      console.error(err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de permitir los permisos de cámara."
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
