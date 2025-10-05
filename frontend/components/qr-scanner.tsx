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
  const [scanningActive, setScanningActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);
      setScanningActive(false);

      const constraints = {
        video: {
          facingMode: "environment",
          aspectRatio: { ideal: 1.777 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          // 🔥 ALERTA 1: Cámara lista
          setTimeout(() => {
            alert("✅ CÁMARA LISTA - Ahora debería empezar el escaneo");
            setScanningActive(true);
          }, 1000);
        };
        
        await videoRef.current.play();
      }

      // Iniciar escaneo
      intervalRef.current = setInterval(scanFrame, 500);
      
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios y que la cámara esté funcionando."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsScanning(false);
    setCameraReady(false);
    setScanningActive(false);
  };

  const scanFrame = () => {
    // 🔥 ALERTA 2: Escaneo activo (solo una vez)
    if (scanningActive && !window['scanAlertShown']) {
      window['scanAlertShown'] = true;
      setTimeout(() => {
        alert("🔍 ESCANEO ACTIVO - Buscando QR... Apunta a un código QR");
      }, 500);
    }

    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context || video.videoWidth === 0) return;

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // 🔥 ALERTA 3: Frame procesado (solo una vez)
      if (scanningActive && !window['frameAlertShown']) {
        window['frameAlertShown'] = true;
        setTimeout(() => {
          alert("📸 PROCESANDO FRAMES - La cámara está capturando imágenes");
        }, 1000);
      }

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        // 🔥 ALERTA 4: QR DETECTADO
        alert(`🎉 QR DETECTADO!\n\nContenido: ${code.data}`);
        
        stopCamera();
        
        onScan({
          nombre: "QR_DETECTADO",
          apellidos: code.data.substring(0, 20),
          ci: "FROM_QR"
        });
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

  useEffect(() => {
    if (isOpen) {
      // Reset flags
      window['scanAlertShown'] = false;
      window['frameAlertShown'] = false;
      
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
            Escanear Código QR - DEBUG
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={startCamera} variant="outline" className="w-full">
                  Intentar de nuevo
                </Button>
                <Button onClick={simulateScan} variant="outline" className="w-full">
                  Usar simulación
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
              />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && !cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <p className="text-white">Iniciando cámara...</p>
                </div>
              )}

              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    {scanningActive ? "Escaneando..." : "Preparando..."}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={simulateScan} className="flex-1" variant="outline">
              Simular Escaneo
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700 text-center">
              <strong>DEBUG ACTIVADO:</strong> Se mostrarán alertas en cada paso
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
