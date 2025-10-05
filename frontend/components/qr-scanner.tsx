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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);

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
          // 🔥 ALERTA 1: Cámara lista
          setTimeout(() => {
            alert("✅ CÁMARA LISTA - Iniciando escaneo...");
            startScanning(); // 🔥 INICIAR ESCANEO DESPUÉS DE QUE LA CÁMARA ESTÉ LISTA
          }, 500);
        };
        
        videoRef.current.play().then(() => {
          console.log("Video playing");
        }).catch(err => {
          console.error("Error playing video:", err);
        });
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
    // 🔥 ALERTA 2: Escaneo iniciado
    alert("🔍 ESCANEO INICIADO - Buscando QR...");
    
    // Usar requestAnimationFrame en lugar de setInterval para mejor rendimiento
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
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    try {
      // Configurar canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar frame actual en el canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Obtener image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Intentar decodificar QR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        // 🔥 ALERTA 3: QR DETECTADO
        alert(`🎉 QR DETECTADO!\n\nContenido: ${code.data}`);
        
        stopCamera();
        
        onScan({
          nombre: "QR_DETECTADO",
          apellidos: code.data.substring(0, 20),
          ci: "FROM_QR"
        });
        
        // Cerrar el modal
        onClose();
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
                autoPlay
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
                    Escaneando...
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
