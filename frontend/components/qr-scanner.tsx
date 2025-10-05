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
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (data: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);
      setScanCount(0);

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          setTimeout(() => {
            alert("✅ CÁMARA LISTA - Iniciando escaneo...");
            startScanning();
          }, 500);
        };
        
        await videoRef.current.play();
      }

    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios y que la cámara esté funcionando."
      );
      setIsScanning(false);
    }
  };

  const startScanning = () => {
    alert("🔍 ESCANEO INICIADO - Buscando QR...");
    
    const scan = () => {
      scanFrame();
      animationRef.current = requestAnimationFrame(scan);
    };
    
    animationRef.current = requestAnimationFrame(scan);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsScanning(false);
    setCameraReady(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context || video.videoWidth === 0) return;

    try {
      // Incrementar contador de escaneos
      setScanCount(prev => prev + 1);

      // Configurar canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // 🔥 PRIMERO: Verificar que el canvas tenga datos
      if (scanCount === 10) { // Después de 10 frames
        const firstPixel = imageData.data[0]; // Primer pixel
        alert(`📊 DEBUG: Canvas activo - Primer pixel: ${firstPixel}, Frames: ${scanCount}`);
      }

      // 🔥 INTENTAR DETECTAR QR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        alert(`🎉 QR DETECTADO!\nContenido: ${code.data}`);
        stopCamera();
        onScan({
          nombre: "QR_DETECTADO",
          apellidos: code.data.substring(0, 20),
          ci: "FROM_QR"
        });
        onClose();
      } else if (scanCount === 20) {
        // 🔥 ALERTA SI NO DETECTA DESPUÉS DE 20 INTENTOS
        alert("❌ No se detecta QR después de 20 intentos.\n\nProblemas posibles:\n• QR muy pequeño\n• Mala iluminación\n• Formato no compatible\n\nPrueba con un QR más grande y buena luz.");
      }

    } catch (error) {
      console.error("Error en escaneo:", error);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const simulateScan = () => {
    alert("🎯 SIMULACIÓN INICIADA");
    onScan({
      nombre: "SIMULACION", 
      apellidos: "FUNCIONA", 
      ci: "123456789"
    });
    alert("✅ SIMULACIÓN COMPLETADA");
  };

  // 🔥 TEST MANUAL: Forzar detección de QR
  const testManualQR = () => {
    alert("🧪 TEST MANUAL - Simulando QR detectado");
    stopCamera();
    onScan({
      nombre: "TEST_MANUAL",
      apellidos: "QR_FUNCIONA", 
      ci: "987654321"
    });
    onClose();
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
            Escanear QR - DEBUG
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={startCamera} variant="outline" className="w-full">
                  Reiniciar Cámara
                </Button>
                <Button onClick={simulateScan} variant="outline" className="w-full">
                  Simular
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />

              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Frames: {scanCount}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={simulateScan} variant="outline">
              Simular
            </Button>
            <Button onClick={testManualQR} variant="outline">
              Test Manual
            </Button>
            <Button onClick={startCamera} variant="outline">
              Reiniciar
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700 text-center">
              <strong>Estado:</strong> {cameraReady ? `Escaneando (${scanCount} frames)` : "Iniciando..."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
